import test from 'node:test';
import assert from 'node:assert/strict';
import {loadJson, replaceAllObjectIds, addExtraModule, removeModule, addInventedAppliance, addWrongAssignedDimension, omitExplicitDimension, changeModuleRole, changeSpatialRelation, replaceDimensionValue} from './fixture-utils.mjs';
import {scoreResult, aggregateRuns} from '../../tools/vision-benchmark/lib/scorer.mjs';

test('Gold compared with itself scores 100 and passes hard gates', async () => {
  const gold = await loadJson();
  const scored = scoreResult(gold, gold);
  assert.equal(scored.score, 100);
  assert.deepEqual(scored.hardGates, {pass: true, reasons: []});
});

test('semantic copy with all declared IDs changed still scores 100', async () => {
  const gold = await loadJson();
  const candidate = replaceAllObjectIds(gold);
  const scored = scoreResult(candidate, gold);
  assert.equal(scored.score, 100);
  assert.equal(scored.hardGates.pass, true);
});

test('one extra false-positive module is a hard-gate failure', async () => {
  const gold = await loadJson();
  const candidate = addExtraModule(gold);
  const scored = scoreResult(candidate, gold);
  assert.equal(scored.hardGates.pass, false);
  assert.ok(scored.hardGates.reasons.includes('invented_modules>0'));
  assert.equal(scored.details.false_positive_modules.length, 1);
});

test('one missing module lowers recall without a false-positive hard gate', async () => {
  const gold = await loadJson();
  const moduleId = gold.assemblies[0].modules[0].module_id;
  const candidate = removeModule(gold, moduleId);
  const scored = scoreResult(candidate, gold);
  assert.equal(scored.hardGates.pass, true, scored.hardGates.reasons.join(', '));
  assert.ok(scored.details.missing_modules.some((module) => module.module_id === moduleId));
  assert.ok(scored.metric_details.modules.detection.recall < 1);
});

test('one invented appliance is a hard-gate failure', async () => {
  const gold = await loadJson();
  const candidate = addInventedAppliance(gold);
  const scored = scoreResult(candidate, gold);
  assert.equal(scored.hardGates.pass, false);
  assert.ok(scored.hardGates.reasons.includes('invented_appliances>0'));
  assert.ok(scored.details.invented_appliances.some((item) => item.type === 'OTHER'));
});

test('numeric value assigned to a Gold UNKNOWN target is a hard-gate failure', async () => {
  const gold = await loadJson();
  const candidate = addWrongAssignedDimension(gold, {assemblyIndex: 0, moduleIndex: 0, field: 'depth_mm', value: 1234});
  const scored = scoreResult(candidate, gold);
  assert.equal(scored.hardGates.pass, false);
  assert.ok(scored.hardGates.reasons.includes('unsupported_or_wrong_assigned_numeric_dimensions>0'));
  assert.ok(scored.details.unsupported_numeric_dimensions.length > 0);
});

test('Gold unassigned numeric value bound to a module is a hard-gate failure', async () => {
  const gold = await loadJson();
  const candidate = addWrongAssignedDimension(gold, {assemblyIndex: 0, moduleIndex: 0, field: 'depth_mm', value: 450});
  const scored = scoreResult(candidate, gold);
  assert.equal(scored.hardGates.pass, false);
  assert.ok(scored.details.wrong_bindings.some((item) => item.reason === 'gold_unassigned_value_bound_to_target'));
});

test('wrong numeric value on the correct target is a hard-gate failure', async () => {
  const gold = await loadJson();
  const candidate = replaceDimensionValue(gold, {assemblyIndex: 0, moduleIndex: 0, field: 'width_mm', value: 601});
  const scored = scoreResult(candidate, gold);
  assert.equal(scored.hardGates.pass, false);
  assert.ok(scored.details.wrong_bindings.some((item) => item.reason === 'numeric_value_differs_from_gold_target'));
});

test('omitting one explicit Gold dimension lowers dimension recall without a hard gate', async () => {
  const gold = await loadJson();
  const candidate = omitExplicitDimension(gold, {assemblyIndex: 0, moduleIndex: 0, field: 'width_mm'});
  const scored = scoreResult(candidate, gold);
  assert.equal(scored.hardGates.pass, true, scored.hardGates.reasons.join(', '));
  assert.ok(scored.metric_details.dimensions.binding.recall < 1);
  assert.ok(scored.details.dimension_misses.length > 0);
});

test('wrong role on a correctly matched module lowers attribute score', async () => {
  const gold = await loadJson();
  const candidate = changeModuleRole(gold, {assemblyIndex: 0, moduleIndex: 0, role: 'GENERAL_STORAGE'});
  const scored = scoreResult(candidate, gold);
  assert.equal(scored.hardGates.pass, true);
  assert.ok(scored.metric_details.modules.attributes.fields.role.f1 < 1);
  assert.ok(scored.details.incorrect_module_attributes.some((item) => item.field === 'role'));
});

test('wrong spatial relation lowers spatial metric', async () => {
  const gold = await loadJson();
  const candidate = changeSpatialRelation(gold, 'ABOVE');
  const scored = scoreResult(candidate, gold);
  assert.equal(scored.hardGates.pass, true);
  assert.ok(scored.metric_details.spatial_relations.f1 < 1);
  assert.ok(scored.details.spatial_relation_errors.length > 0);
});

test('aggregate classifies automation, conditional, and hard-gate failure exactly', () => {
  const pass = aggregateRuns([96, 95, 96].map((score) => ({score, hardGates: {pass: true}, separate_metrics: {}})));
  assert.equal(pass.median_score, 96);
  assert.equal(pass.min_score, 95);
  assert.equal(pass.spread, 1);
  assert.equal(pass.verdict, 'PASS_AUTOMATION_CANDIDATE');

  const conditional = aggregateRuns([94, 93, 94].map((score) => ({score, hardGates: {pass: true}, separate_metrics: {}})));
  assert.equal(conditional.median_score, 94);
  assert.equal(conditional.min_score, 93);
  assert.equal(conditional.verdict, 'CONDITIONAL_HUMAN_CONFIRMED');

  const failedRun = aggregateRuns([
    {score: 100, hardGates: {pass: true}, separate_metrics: {}},
    {score: 100, hardGates: {pass: false}, separate_metrics: {}},
    {score: 100, hardGates: {pass: true}, separate_metrics: {}},
  ]);
  assert.equal(failedRun.verdict, 'FAIL');
  assert.equal(failedRun.hard_gates_pass, false);
});
