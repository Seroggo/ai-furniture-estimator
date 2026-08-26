import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';

import core from '../index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const taskRoot = resolve(root, '_tasks/alpha-construction-core');
const input = JSON.parse(readFileSync(resolve(taskRoot, 'GOLDEN_INPUT_KITCHEN_2025-04-01.json'), 'utf8'));
const profile = JSON.parse(readFileSync(resolve(taskRoot, 'ALPHA_CONSTRUCTION_PROFILE_V1.json'), 'utf8'));
const schema = JSON.parse(readFileSync(resolve(taskRoot, 'CONFIRMED_CONFIGURATION_V1.schema.json'), 'utf8'));

function calculate(value = input) {
  return core.calculateConstructionCore(value, profile);
}

test('golden input passes confirmed-configuration-v1 schema and invalid input fails', () => {
  const validate = new Ajv2020({ strict: false, validateFormats: false }).compile(schema);
  assert.equal(validate(input), true, JSON.stringify(validate.errors));
  const invalid = structuredClone(input);
  invalid.schema_version = 'wrong';
  assert.equal(validate(invalid), false);
  assert.throws(() => calculate(invalid), (error) => error.code === 'VALIDATION_ERROR');
});

test('profile loader is explicit and deterministic', () => {
  assert.equal(core.loadConstructionProfile(profile).profile_id, 'alpha-basis-v1');
  assert.throws(() => core.loadConstructionProfile({}), (error) => error.code === 'VALIDATION_ERROR');
});

test('same input produces byte-identical canonical result', () => {
  assert.equal(JSON.stringify(calculate()), JSON.stringify(calculate()));
});

test('explicit widths are retained without standard-module normalization', () => {
  for (const width of [600, 720, 733, 823]) {
    const value = structuredClone(input);
    value.assemblies[0].modules[0].width_mm = width;
    const side = calculate(value).Parts.find((part) => part.Module_id === value.assemblies[0].modules[0].id && part.Part_type === 'LEFT_SIDE');
    assert.equal(side.Width_mm, 560);
    const bottom = calculate(value).Parts.find((part) => part.Module_id === value.assemblies[0].modules[0].id && part.Part_type === 'BOTTOM');
    assert.equal(bottom.Length_mm, width - core.RULES.dimensions.horizontal_width_reduction_mm);
  }
});

test('golden part geometry follows explicit profile formulas', () => {
  const result = calculate();
  const tallSide = result.Parts.find((part) => part.Module_id === 'MW_TALL_L' && part.Part_type === 'LEFT_SIDE');
  assert.deepEqual([tallSide.Length_mm, tallSide.Width_mm, tallSide.Thickness_mm], [2500, 560, 16]);
  const tallTop = result.Parts.find((part) => part.Module_id === 'MW_TALL_L' && part.Part_type === 'TOP');
  assert.deepEqual([tallTop.Length_mm, tallTop.Width_mm], [568, 560]);
  const tallBack = result.Parts.find((part) => part.Module_id === 'MW_TALL_L' && part.Part_type === 'BACK');
  assert.deepEqual([tallBack.Length_mm, tallBack.Width_mm, tallBack.Thickness_mm], [2390, 568, 3]);
  assert.ok(result.Parts.some((part) => part.Part_type === 'BOTTOM'));
});

test('material areas use mm2 formula and component scopes exclude drawers/facades', () => {
  const result = calculate();
  const part = result.Parts[0];
  assert.equal(part.Area_m2, part.Length_mm * part.Width_mm * part.Qty / 1_000_000);
  const carcass = result.Materials_by_component.find((item) => item.Component === 'CARCASS');
  assert.ok(carcass);
  assert.equal(carcass.items.find((item) => item.material_code === 'LDSP_16_ALPHA').area_m2, 15.47728);
  assert.equal(result.Part_count_by_component.some((item) => item.Component === 'DRAWER_COMPONENT'), true);
});

test('per-part edges aggregate by material and component', () => {
  const result = calculate();
  const side = result.Parts.find((part) => part.Part_type === 'LEFT_SIDE');
  assert.equal(side.Edge_length_m, side.Length_mm / 1000);
  const carcassEdges = result.Edge_by_component.find((item) => item.Component === 'CARCASS');
  assert.equal(carcassEdges.items[0].material_code, 'EDGE_19x1_ALPHA');
  assert.equal(result.Edge.find((item) => item.material_code === 'EDGE_19x1_ALPHA').length_m, 29.238);
});

test('golden smoke returns canonical result and explicit input gaps', () => {
  const result = calculate();
  for (const key of ['Project', 'Parts', 'Materials', 'Materials_by_component', 'Edge', 'Edge_by_component', 'Hardware', 'Manufacturing_features', 'Issues', 'Benchmark']) {
    assert.ok(key in result);
  }
  assert.ok(result.Issues.some((item) => item.status === 'INPUT_GAP' && item.code === 'FACADE_DIMENSIONS_MISSING'));
  assert.ok(result.Issues.some((item) => item.status === 'INPUT_GAP' && item.code === 'DRAWER_BOX_DIMENSIONS_MISSING'));
  assert.equal(result.Benchmark.aggregates.length, 4);
});

test('benchmark contains generated/golden/delta for LDSP, LHDF, edge, and facade', () => {
  const metrics = calculate().Benchmark.aggregates;
  assert.deepEqual(metrics.map((item) => item.metric), [
    'LDSP_16_ALPHA_area_m2', 'LHDF_3_ALPHA_area_m2', 'EDGE_19x1_ALPHA_length_m', 'FACADE_area_m2_reference'
  ]);
  for (const item of metrics) {
    assert.equal(typeof item.golden, 'number');
    assert.ok('generated' in item && 'absolute_delta' in item && 'relative_delta_pct' in item && item.classification);
  }
  const facade = metrics.find((item) => item.metric === 'FACADE_area_m2_reference');
  assert.equal(facade.classification, 'INPUT_GAP');
  assert.equal(facade.generated, 0);
});
