import {mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';

function formatScore(value) {
  return Number.isFinite(value) ? value.toFixed(2) : '—';
}

function formatLatency(value) {
  return Number.isFinite(value) ? String(Math.round(value)) : '—';
}

function formatRunCell(run) {
  if (!run) return '—';
  if (run.api_failure) return `API FAIL${run.http_status ? ` (${run.http_status})` : ''}`;
  if (run.parse_status === 'FAIL') return 'PARSE FAIL';
  return formatScore(run.score);
}

function markdownList(items, empty = '—') {
  if (!Array.isArray(items) || items.length === 0) return empty;
  return items.map((item) => `- \`${JSON.stringify(item)}\``).join('\n');
}

function runWithDetails(model) {
  return model.runs.find((run) => run.score_details);
}

function metricRows(model) {
  const details = runWithDetails(model)?.score_details || null;
  const metrics = details?.weighted_metrics || {};
  const weights = details?.weighted_metric_scores || {};
  return Object.keys(metrics).map((key) => `| ${key} | ${formatScore(metrics[key] * 100)}% | ${formatScore(weights[key])} |`).join('\n');
}

export function renderMarkdownReport(report) {
  const maxRuns = Math.max(3, ...report.models.map((model) => model.runs.length));
  const runHeader = Array.from({length: maxRuns}, (_, index) => `Run${index + 1}`).join(' | ');
  const runSeparator = Array.from({length: maxRuns}, () => '---:').join(' | ');
  const rows = report.models.map((model) => {
    const runValues = Array.from({length: maxRuns}, (_, index) => formatRunCell(model.runs[index]));
    return `| ${model.slug} | ${runValues.join(' | ')} | ${formatScore(model.aggregate.median_score)} | ${formatScore(model.aggregate.min_score)} | ${formatScore(model.aggregate.spread)} | ${model.aggregate.hard_gates_pass ? 'PASS' : 'FAIL'} | ${model.aggregate.verdict} | ${formatLatency(model.aggregate.median_latency_ms)} |`;
  });
  const sections = report.models.map((model) => {
    const firstScore = runWithDetails(model)?.score_details;
    const details = firstScore?.details || {};
    const apiFailures = model.runs.filter((run) => run.api_failure).map((run) => ({run: run.run_number, error: run.api_failure, http_status: run.http_status}));
    return [
      `## ${model.slug} (${model.id})`,
      '',
      `Verdict: **${model.aggregate.verdict}**`,
      '',
      '### Weighted metric breakdown',
      '',
      '| Metric | Normalized | Weighted points |',
      '| --- | ---: | ---: |',
      metricRows(model) || '| — | — | — |',
      '',
      '### Hard gate reasons',
      '',
      markdownList(model.runs.flatMap((run) => {
        const reasons = run.score_details?.hardGates?.reasons || [];
        return reasons.length > 0 ? [{run: run.run_number, reasons}] : [];
      })),
      '',
      '### Details',
      '',
      `False positive modules:\n${markdownList(details.false_positive_modules)}`,
      '',
      `Missing modules:\n${markdownList(details.missing_modules)}`,
      '',
      `Incorrect module attrs:\n${markdownList(details.incorrect_module_attributes)}`,
      '',
      `Missing appliances:\n${markdownList(details.missing_appliances)}`,
      '',
      `Invented appliances:\n${markdownList(details.invented_appliances)}`,
      '',
      `Missing visible features:\n${markdownList(details.missing_visible_features)}`,
      '',
      `Invented visible features:\n${markdownList(details.invented_visible_features)}`,
      '',
      `Dimension misses:\n${markdownList(details.dimension_misses)}`,
      '',
      `Wrong bindings:\n${markdownList(details.wrong_bindings)}`,
      '',
      `Unsupported numeric dimensions:\n${markdownList(details.unsupported_numeric_dimensions)}`,
      '',
      `Unassigned dimension misses:\n${markdownList(details.unassigned_dimension_misses)}`,
      '',
      `Spatial relation errors:\n${markdownList(details.spatial_relation_errors)}`,
      '',
      `Spatial relation misses:\n${markdownList(details.spatial_relation_misses)}`,
      '',
      `Schema failures:\n${markdownList(details.schema_failures)}`,
      '',
      `API failures:\n${markdownList(apiFailures)}`,
    ].join('\n');
  });
  return [
    `| Model | ${runHeader} | Median | Min | Spread | Hard gates | Verdict | Latency |`,
    `| --- | ${runSeparator} | ---: | ---: | ---: | --- | --- | ---: |`,
    ...rows,
    '',
    '# Vision Benchmark Report',
    '',
    `Session: \`${report.session_id}\``,
    '',
    ...sections,
    '',
  ].join('\n');
}

export async function writeReport(report, reportsRoot) {
  const reportDirectory = join(reportsRoot, report.session_id);
  const runsDirectory = join(reportDirectory, 'runs');
  await mkdir(runsDirectory, {recursive: true});
  await writeFile(join(reportDirectory, 'benchmark-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(join(reportDirectory, 'benchmark-report.md'), renderMarkdownReport(report), 'utf8');
  for (const model of report.models) {
    for (const run of model.runs) {
      if (run.score_details) await writeFile(join(runsDirectory, `${model.slug}-run-${String(run.run_number).padStart(2, '0')}.score.json`), `${JSON.stringify(run.score_details, null, 2)}\n`, 'utf8');
    }
  }
  return reportDirectory;
}
