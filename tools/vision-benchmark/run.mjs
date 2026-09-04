import {mkdir, writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {callOpenRouter} from './lib/openrouter.mjs';
import {
  DEFAULT_GENERATION_PARAMETERS,
  formatInputError,
  getOpenRouterApiKey,
  imageRequestParts,
  loadBenchmarkInputs,
  selectModels,
} from './lib/inputs.mjs';
import {scoreResult} from './lib/scorer.mjs';

export function parseArgs(argv) {
  const options = {all: false, model: null, runs: 1, dryRun: false};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--all') options.all = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--model') options.model = argv[++index];
    else if (arg === '--runs') options.runs = Number(argv[++index]);
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!Number.isInteger(options.runs) || options.runs < 1 || options.runs > 100) throw new Error('--runs must be an integer from 1 to 100');
  return options;
}

function printHelp() {
  console.log('Usage: npm run benchmark:vision -- [--dry-run] [--all | --model <slug>] [--runs <n>]');
}

export function sessionId() {
  return new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, 'Z');
}

function errorMessage(error) {
  return error?.message || String(error);
}

function apiFailureStatus(error) {
  return Number.isInteger(error?.status) ? error.status : null;
}

export async function writeRunFiles(runDirectory, runNumber, rawText, jsonValue, metadata) {
  const stem = `run-${String(runNumber).padStart(2, '0')}`;
  await writeFile(join(runDirectory, `${stem}.raw.txt`), rawText ?? '', 'utf8');
  if (jsonValue !== null) await writeFile(join(runDirectory, `${stem}.json`), `${JSON.stringify(jsonValue, null, 2)}\n`, 'utf8');
  await writeFile(join(runDirectory, `${stem}.meta.json`), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
}

function publicErrorMetadata(error) {
  return {
    message: errorMessage(error),
    status: apiFailureStatus(error),
    name: error?.name || 'Error',
  };
}

export async function runOne({inputs, model, runNumber, session, apiKey, runDirectory}) {
  const startedAt = new Date().toISOString();
  const start = performance.now();
  let rawText = '';
  let jsonValue = null;
  let response = null;
  let apiFailure = null;
  try {
    response = await callOpenRouter({
      apiKey,
      modelId: model.id,
      systemPrompt: inputs.prompt,
      content: imageRequestParts(inputs.images),
      generationParameters: DEFAULT_GENERATION_PARAMETERS,
    });
    rawText = response.text;
    try {
      jsonValue = JSON.parse(rawText);
    } catch {
      jsonValue = null;
    }
  } catch (error) {
    apiFailure = publicErrorMetadata(error);
  }
  const finishedAt = new Date().toISOString();
  const latencyMs = Math.round(performance.now() - start);
  const scoreDetails = apiFailure ? null : scoreResult(jsonValue, inputs.gold, {
    rawText,
    latencyMs,
    usage: response?.usage ?? null,
    apiFailure: null,
  });
  const metadata = {
    session_id: session,
    model_id: model.id,
    model_slug: model.slug,
    run_number: runNumber,
    started_at: startedAt,
    finished_at: finishedAt,
    latency_ms: latencyMs,
    http_status: response?.status ?? apiFailure?.status ?? null,
    openrouter: response?.responseMetadata ?? null,
    token_usage: response?.usage ?? null,
    prompt_sha256: inputs.hashes.prompt,
    gold_sha256: inputs.hashes.gold,
    image_sha256: inputs.hashes.images,
    generation_parameters: DEFAULT_GENERATION_PARAMETERS,
    parse_status: apiFailure ? 'API_FAILURE' : scoreDetails?.parse_valid ? (scoreDetails.schema_valid ? 'PASS' : 'SCHEMA_FAIL') : 'FAIL',
    schema_valid: scoreDetails?.schema_valid ?? false,
    error: apiFailure,
  };
  await writeRunFiles(runDirectory, runNumber, rawText, jsonValue, metadata);
  return {
    run_number: runNumber,
    score: scoreDetails?.score ?? 0,
    hard_gates: scoreDetails?.hardGates?.pass ?? false,
    parse_status: metadata.parse_status,
    api_failure: apiFailure,
    http_status: metadata.http_status,
    latency_ms: latencyMs,
    token_usage: response?.usage ?? null,
    score_details: scoreDetails,
  };
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`Vision benchmark argument error: ${errorMessage(error)}`);
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
  let models;
  try {
    models = selectModels(inputs.models, options);
  } catch (error) {
    console.error(`Vision benchmark configuration error: ${errorMessage(error)}`);
    process.exitCode = 2;
    return;
  }
  if (models.length === 0) {
    console.error('Vision benchmark configuration error: no enabled models selected.');
    process.exitCode = 2;
    return;
  }
  const apiKey = await getOpenRouterApiKey(inputs.rootDir);
  const calls = models.length * options.runs;
  if (options.dryRun) {
    console.log('Vision benchmark dry run');
    console.log('Prompt: OK');
    console.log('Gold: OK');
    console.log(`Images: ${inputs.images.length}/4`);
    console.log(`Enabled models: ${inputs.models.filter((model) => model.enabled).length}`);
    console.log(`Selected models: ${models.length}`);
    console.log(`Runs per model: ${options.runs}`);
    console.log(`Planned API calls: ${calls}`);
    console.log(`OPENROUTER_API_KEY: ${apiKey ? 'present' : 'missing'}`);
    console.log('No API calls executed.');
    return;
  }
  if (!apiKey) {
    console.error('Vision benchmark configuration error: OPENROUTER_API_KEY is missing. Set it in the environment or local .env before a real run.');
    process.exitCode = 2;
    return;
  }

  const session = sessionId();
  const sessionDirectory = join(inputs.paths.results, session);
  await mkdir(sessionDirectory, {recursive: true});
  const sessionMetadata = {
    session_id: session,
    created_at: new Date().toISOString(),
    prompt_sha256: inputs.hashes.prompt,
    gold_sha256: inputs.hashes.gold,
    image_sha256: inputs.hashes.images,
    generation_parameters: DEFAULT_GENERATION_PARAMETERS,
    user_message: 'Analyze the four supplied images as one kitchen project. The images are identified as IMG_01, IMG_02, IMG_03, IMG_04 in the supplied order. Return only JSON according to the system prompt.',
    models: models.map(({id, slug}) => ({id, slug})),
    runs_per_model: options.runs,
    planned_api_calls: calls,
  };
  await writeFile(join(sessionDirectory, 'session.json'), `${JSON.stringify(sessionMetadata, null, 2)}\n`, 'utf8');
  console.log(`Vision benchmark session: ${session}`);
  const summaries = [];
  for (const model of models) {
    const modelDirectory = join(sessionDirectory, model.slug);
    await mkdir(modelDirectory, {recursive: true});
    console.log(`Model ${model.slug} (${model.id})`);
    const runs = [];
    for (let runNumber = 1; runNumber <= options.runs; runNumber += 1) {
      const result = await runOne({inputs, model, runNumber, session, apiKey, runDirectory: modelDirectory});
      runs.push(result);
      console.log(`  run-${String(runNumber).padStart(2, '0')}: ${result.api_failure ? `API FAILURE${result.http_status ? ` (${result.http_status})` : ''}` : `${result.score.toFixed(2)} (${result.parse_status})`}`);
    }
    summaries.push({model, runs});
  }
  console.log(`Results: ${sessionDirectory}`);
  console.log(`Use npm run benchmark:vision:score -- --session ${session}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
