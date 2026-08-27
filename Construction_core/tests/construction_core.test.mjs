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
const benchmarkReference = JSON.parse(readFileSync(resolve(taskRoot, 'BENCHMARK_REFERENCE_BASIS_KITCHEN_V1.json'), 'utf8'));
const schema = JSON.parse(readFileSync(resolve(taskRoot, 'CONFIRMED_CONFIGURATION_V1.schema.json'), 'utf8'));

function calculate(value = input, reference = benchmarkReference) {
  return core.calculateConstructionCore(value, profile, reference);
}

function partQuantity(result, moduleId, partType) {
  return result.Parts.find((part) => part.Module_id === moduleId && part.Part_type === partType)?.Qty;
}

function benchmarkMetric(result, metric) {
  return result.Benchmark.aggregates.find((item) => item.metric === metric);
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

test('benchmark reference targets and material mappings come from the external reference', () => {
  const referenceA = structuredClone(benchmarkReference);
  const referenceB = structuredClone(benchmarkReference);
  referenceA.reference_id = 'reference-a';
  referenceA.targets = { LDSP: 1, LHDF: 2, EDGE: 3, FACADE: 4 };
  referenceB.reference_id = 'reference-b';
  referenceB.targets = { LDSP: 11, LHDF: 12, EDGE: 13, FACADE: 14 };
  const resultA = calculate(input, referenceA);
  const resultB = calculate(input, referenceB);
  assert.equal(resultA.Benchmark.reference_id, 'reference-a');
  assert.equal(resultB.Benchmark.reference_id, 'reference-b');
  assert.deepEqual(resultA.Benchmark.aggregates.map((item) => item.golden), [1, 2, 3, 4]);
  assert.deepEqual(resultB.Benchmark.aggregates.map((item) => item.golden), [11, 12, 13, 14]);
  for (const key of ['Parts', 'Materials', 'Materials_by_component', 'Edge', 'Hardware', 'Manufacturing_features', 'Issues']) {
    assert.deepEqual(resultA[key], resultB[key], `${key} must not depend on benchmark targets`);
  }
});

test('benchmark is explicitly absent without a reference and does not fall back to input', () => {
  assert.equal(core.calculateConstructionCore(input, profile).Benchmark, null);
});

test('drawer front counts generate complete drawer box quantities', () => {
  const value = structuredClone(input);
  const module = value.assemblies[1].modules[1];
  module.fronts[0].height_mm = 365;
  for (const count of [1, 2, 3]) {
    module.fronts[0].count = count;
    const result = calculate(value);
    assert.equal(partQuantity(result, module.id, 'DRAWER_SIDE'), 2 * count);
    assert.equal(partQuantity(result, module.id, 'DRAWER_FRONT_BOX'), count);
    assert.equal(partQuantity(result, module.id, 'DRAWER_BACK_BOX'), count);
    assert.equal(partQuantity(result, module.id, 'DRAWER_BOTTOM'), count);
  }
});

test('facade edge orientation uses facade width for top/bottom and height for left/right', () => {
  const value = structuredClone(input);
  const module = value.assemblies[1].modules[0];
  module.fronts = [{ kind: 'FIXED_PANEL', count: 1, width_mm: 600, height_mm: 720, evidence_state: 'EXPLICIT' }];
  const result = calculate(value);
  const facade = result.Parts.find((part) => part.Module_id === module.id && part.Part_type === 'FACADE');
  assert.deepEqual(facade.Edge_sides, ['top', 'bottom', 'left', 'right']);
  assert.equal(facade.Edge_length_m, 2.64);
  assert.equal(result.Edge.find((item) => item.material_code === 'EDGE_19x1_ALPHA').length_m, 31.878);
});

test('facade dimensions control generation and benchmark classification', () => {
  const incomplete = structuredClone(input);
  const incompleteResult = calculate(incomplete);
  assert.equal(incompleteResult.Parts.some((part) => part.Part_type === 'FACADE'), false);
  assert.equal(benchmarkMetric(incompleteResult, 'FACADE_area_m2_reference').classification, 'INPUT_GAP');

  const complete = structuredClone(input);
  const module = complete.assemblies[1].modules[0];
  module.fronts = [{ kind: 'FIXED_PANEL', count: 1, width_mm: 600, height_mm: 720, evidence_state: 'EXPLICIT' }];
  const completeResult = calculate(complete);
  assert.equal(completeResult.Parts.some((part) => part.Part_type === 'FACADE'), true);
  assert.notEqual(benchmarkMetric(completeResult, 'FACADE_area_m2_reference').classification, 'INPUT_GAP');
});

test('alpha assumptions expose OUR provenance while legitimate OSS entries remain attributed', () => {
  for (const key of ['alphaLocalDowelProvision', 'alphaLocalFastenerProvision', 'alphaLocalDrawerProvision', 'alphaLocalBackPolicy', 'alphaLocalEdgePolicy', 'alphaLocalBaseHardwareProvision']) {
    const provenance = core.ALPHA_PROVENANCE[key];
    assert.equal(provenance.Origin, 'OUR');
    assert.equal(provenance.Repository, null);
    assert.equal(provenance.Commit, null);
    assert.equal(provenance.Source_path, null);
  }
  assert.equal(core.ALPHA_PROVENANCE.woodworkingShop.Repository, 'WoodworkingShop');
  const result = calculate();
  const drawer = result.Parts.find((part) => part.Part_type === 'DRAWER_BOTTOM');
  const back = result.Parts.find((part) => part.Part_type === 'BACK');
  const edgePart = result.Parts.find((part) => part.Edge_source_rule);
  const dowels = result.Hardware.find((item) => item.item === 'DOWELS_8x30');
  assert.equal(drawer.Source_rule.provenance.Origin, 'OUR');
  assert.equal(back.Source_rule.provenance.Origin, 'OUR');
  assert.equal(edgePart.Edge_source_rule.provenance.Origin, 'OUR');
  assert.equal(dowels.source_rule.provenance.Origin, 'OUR');
});

test('LDSP golden-case result is not classified as universal geometry', () => {
  assert.equal(benchmarkMetric(calculate(), 'LDSP_16_ALPHA_area_m2').classification, 'MATCH_ON_GOLDEN_CASE');
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
