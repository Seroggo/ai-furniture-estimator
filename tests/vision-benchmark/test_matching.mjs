import test from 'node:test';
import assert from 'node:assert/strict';
import {loadJson, replaceAllObjectIds, clone} from './fixture-utils.mjs';
import {matchAssemblies, matchModules, matchResultStructures} from '../../tools/vision-benchmark/lib/scorer.mjs';

test('assembly matching uses kind and ignores declared assembly IDs', async () => {
  const gold = await loadJson();
  const candidate = replaceAllObjectIds(gold);
  const matches = matchAssemblies(candidate, gold);
  assert.equal(matches.length, gold.assemblies.length);
  assert.ok(matches.every((match) => match.candidate && match.gold));
  assert.deepEqual(matches.map((match) => match.candidate.kind), matches.map((match) => match.gold.kind));
});

test('module matching uses assembly, tier, and order semantic key', async () => {
  const gold = await loadJson();
  const candidate = replaceAllObjectIds(gold);
  const matches = matchResultStructures(candidate, gold);
  const all = [...matches.modulesByAssembly.values()].flat();
  assert.equal(all.filter((match) => match.candidate && match.gold).length, 9);
  assert.equal(all.filter((match) => match.candidate && !match.gold).length, 0);
  assert.equal(all.filter((match) => !match.candidate && match.gold).length, 0);
});

test('missing order uses deterministic semantic fallback', async () => {
  const gold = await loadJson();
  const candidateAssembly = clone(gold.assemblies[0]);
  const goldAssembly = clone(gold.assemblies[0]);
  candidateAssembly.modules[0].order = null;
  const matches = matchModules(candidateAssembly, goldAssembly);
  const match = matches.find((item) => item.candidate?.module_id === candidateAssembly.modules[0].module_id);
  assert.ok(match?.gold);
  assert.equal(match.gold.role, candidateAssembly.modules[0].role);
});

test('duplicate semantic module key is not silently matched twice', async () => {
  const gold = await loadJson();
  const candidateAssembly = clone(gold.assemblies[0]);
  const goldAssembly = clone(gold.assemblies[0]);
  const duplicate = clone(candidateAssembly.modules[0]);
  duplicate.module_id = 'DUPLICATE_MODULE';
  candidateAssembly.modules.push(duplicate);
  const matches = matchModules(candidateAssembly, goldAssembly);
  assert.equal(matches.filter((match) => match.candidate && !match.gold).length, 1);
});
