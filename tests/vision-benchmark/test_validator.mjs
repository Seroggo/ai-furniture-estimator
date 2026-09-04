import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadJson, GOLD_PATH, SYNTHETIC_GOLD_PATH, clone, explicitDimension} from './fixture-utils.mjs';
import {parseStrictJson, validateRawResult, validateResult} from '../../tools/vision-benchmark/validate.mjs';

test('canonical frozen Gold is a valid V1.5 result', async () => {
  const raw = await readFile(GOLD_PATH, 'utf8');
  const result = validateRawResult(raw);
  assert.equal(result.parsed, true);
  assert.equal(result.valid, true, result.errors.join('\n'));
});

test('synthetic Gold fixture is valid', async () => {
  const raw = await readFile(SYNTHETIC_GOLD_PATH, 'utf8');
  assert.deepEqual(validateRawResult(raw).errors, []);
});

test('Markdown-fenced JSON fails strict parsing', async () => {
  const gold = await loadJson();
  const result = validateRawResult(`\`\`\`json\n${JSON.stringify(gold)}\n\`\`\``);
  assert.equal(result.parsed, false);
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /strict JSON parse failed/u);
  assert.equal(parseStrictJson(`\`\`\`json\n${JSON.stringify(gold)}\n\`\`\``).valid, false);
});

test('wrong schema version fails', async () => {
  const candidate = await loadJson();
  candidate.schema_version = '1.4';
  const result = validateResult(candidate);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('schema_version')));
});

test('duplicate declared module ID fails', async () => {
  const candidate = await loadJson();
  candidate.assemblies[1].modules[0].module_id = candidate.assemblies[0].modules[0].module_id;
  const result = validateResult(candidate);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('duplicate declared object ID')));
});

test('broken spatial relation reference fails', async () => {
  const candidate = await loadJson();
  candidate.spatial_relations[0].subject_module_id = 'MISSING_MODULE';
  const result = validateResult(candidate);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('references missing module')));
});

test('EXPLICIT dimension with null value_mm fails', async () => {
  const candidate = await loadJson();
  candidate.assemblies[0].modules[0].dimensions.width_mm.value_mm = null;
  const result = validateResult(candidate);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('EXPLICIT must have numeric value_mm')));
});

test('module with only DIMENSION_CHAIN evidence fails existence validation', async () => {
  const candidate = await loadJson();
  const module = candidate.assemblies[0].modules[0];
  module.evidence = [{
    source_image_id: module.source_image_ids[0],
    type: 'DIMENSION_CHAIN',
    raw_text: '600',
    description: 'A dimension chain segment is visible.',
  }];
  const result = validateResult(candidate);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('independent object-existence evidence')));
});

test('assembly/module appliance duplication is rejected structurally', async () => {
  const candidate = await loadJson();
  const sourceModule = candidate.assemblies[0].modules.find((module) => module.appliances.length > 0);
  candidate.assemblies[0].appliances.push(clone(sourceModule.appliances[0]));
  const result = validateResult(candidate);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('duplicates assembly-level appliance type')));
});

test('non-OK status requires empty structural collections and warning', async () => {
  const candidate = await loadJson();
  candidate.result_status = 'INSUFFICIENT_VISUAL_DATA';
  candidate.scene_type = null;
  candidate.assemblies = [];
  candidate.spatial_relations = [];
  candidate.unassigned_dimensions = [];
  candidate.visible_text = [];
  candidate.warnings = [{code: 'INSUFFICIENT_VISUAL_DATA', message: 'Images are unreadable.', source_image_ids: []}];
  assert.equal(validateResult(candidate).valid, true);
});

test('dimension evidence must be source-grounded', async () => {
  const candidate = await loadJson();
  const dimension = candidate.assemblies[0].modules[0].dimensions.width_mm;
  dimension.source_image_ids = ['IMG_01'];
  dimension.evidence[0].source_image_id = 'IMG_04';
  const result = validateResult(candidate);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('must be listed by its owner')));
});

test('confidence values outside 0..1 fail', async () => {
  const candidate = await loadJson();
  candidate.assemblies[0].confidence = 1.1;
  assert.equal(validateResult(candidate).valid, false);
});
