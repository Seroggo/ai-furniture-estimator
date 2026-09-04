import {aggregateRuns, scoreResult} from './lib/scorer.mjs';

export {aggregateRuns, scoreResult};

if (process.argv[1] && process.argv[1].endsWith('score.mjs')) {
  const {runScoringCli} = await import('./lib/scoring-cli.mjs');
  await runScoringCli(process.argv.slice(2));
}
