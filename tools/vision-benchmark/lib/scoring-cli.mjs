import {mkdir, readdir, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {aggregateRuns} from './scorer.mjs';
import {formatInputError, loadBenchmarkInputs} from './inputs.mjs';
import {writeReport} from './report.mjs';
import {normalizeResponse} from './normalize.mjs';

function parseArgs(argv) {
  const options = {session: null};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--session') options.session = argv[++index];
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function printHelp() {
  console.log('Usage: npm run benchmark:vision:score -- [--session <session-id>]');
}

function runNumberFromName(name) {
  const match = name.match(/^run-(\d{2})\.raw\.txt$/u);
  return match ? Number(match[1]) : null;
}

async function readJsonIfExists(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function listSessionIds(resultsRoot) {
  const entries = await readdir(resultsRoot, {withFileTypes: true});
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort((left, right) => right.localeCompare(left));
}

export async function scoreSession(inputs, sessionId) {
  const sessionDirectory = join(inputs.paths.results, sessionId);
  const sessionMetadata = await readJsonIfExists(join(sessionDirectory, 'session.json'));
  if (!sessionMetadata) throw new Error(`Session metadata not found: ${join(sessionDirectory, 'session.json')}`);
  const entries = await readdir(sessionDirectory, {withFileTypes: true});
  const modelDirectories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const {scoreResult} = await import('./scorer.mjs');
  const models = [];
  for (const slug of modelDirectories) {
    const fallbackId = sessionMetadata.models?.find((modelItem) => modelItem.slug === slug)?.id || slug;
    const modelConfig = inputs.models.find((modelItem) => modelItem.slug === slug) || {id: fallbackId, slug, enabled: true};
    const modelDirectory = join(sessionDirectory, slug);
    const rawFiles = (await readdir(modelDirectory)).filter((name) => runNumberFromName(name) !== null).sort();
    const runs = [];
    for (const rawName of rawFiles) {
      const runNumber = runNumberFromName(rawName);
      const rawText = await readFile(join(modelDirectory, rawName), 'utf8');
      const metadata = await readJsonIfExists(join(modelDirectory, `run-${String(runNumber).padStart(2, '0')}.meta.json`));
      const normalized = normalizeResponse(rawText);
      const apiFailed = metadata?.parse_status === 'API_FAILURE';
      const scoreDetails = apiFailed
        ? scoreResult(null, inputs.gold, {rawText: '', latencyMs: metadata?.latency_ms ?? null, usage: metadata?.token_usage ?? null, apiFailure: metadata?.error ?? {message: 'API failure', status: metadata?.http_status ?? null}})
        : scoreResult(normalized.json, inputs.gold, {rawText, latencyMs: metadata?.latency_ms ?? null, usage: metadata?.token_usage ?? null, apiFailure: null});
      runs.push({
        run_number: runNumber,
        score: scoreDetails.score,
        hard_gates: scoreDetails.hardGates.pass,
        hard_gate_reasons: scoreDetails.hardGates.reasons,
        parse_status: metadata?.parse_status || normalized.parseStatus,
        api_failure: metadata?.error || null,
        http_status: metadata?.http_status ?? null,
        latency_ms: metadata?.latency_ms ?? null,
        token_usage: metadata?.token_usage ?? null,
        score_details: scoreDetails,
        files: {raw: rawName, meta: `run-${String(runNumber).padStart(2, '0')}.meta.json`},
      });
    }
    models.push({id: modelConfig.id, slug, runs, aggregate: aggregateRuns(runs)});
  }
  const report = {
    session_id: sessionId,
    generated_at: new Date().toISOString(),
    input_hashes: {
      prompt_sha256: inputs.hashes.prompt,
      gold_sha256: inputs.hashes.gold,
      image_sha256: inputs.hashes.images,
    },
    generation_parameters: sessionMetadata.generation_parameters || null,
    models,
  };
  const reportDirectory = await writeReport(report, inputs.paths.reports);
  return {report, reportDirectory};
}

export async function runScoringCli(argv) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(`Vision benchmark score argument error: ${error.message}`);
    printHelp();
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    printHelp();
    return;
  }
  let inputs;
  try {
    inputs = await loadBenchmarkInputs();
  } catch (error) {
    console.error(`Vision benchmark input error: ${formatInputError(error)}`);
    process.exitCode = 2;
    return;
  }
  let sessionId = options.session;
  if (!sessionId) {
    const sessions = await listSessionIds(inputs.paths.results);
    sessionId = sessions[0];
  }
  if (!sessionId) {
    console.error(`No benchmark sessions found in ${inputs.paths.results}`);
    process.exitCode = 2;
    return;
  }
  try {
    const {report, reportDirectory} = await scoreSession(inputs, sessionId);
    console.log(`Vision benchmark scoring session: ${sessionId}`);
    for (const model of report.models) console.log(`${model.slug}: ${model.aggregate.verdict} (median ${model.aggregate.median_score.toFixed(2)}, min ${model.aggregate.min_score.toFixed(2)}, spread ${model.aggregate.spread.toFixed(2)})`);
    console.log(`Report: ${reportDirectory}`);
  } catch (error) {
    console.error(`Vision benchmark scoring failed: ${error.message}`);
    process.exitCode = 1;
  }
}
