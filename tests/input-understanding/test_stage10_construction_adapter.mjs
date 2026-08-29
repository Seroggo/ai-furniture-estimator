'use strict';

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';

import stage10 from '../../src/input-understanding/index.js';
import { runConstructionFromDraft, RunConstructionFromDraft } from '../../src/input-understanding/construction_adapter.js';
import core from '../../src/construction-core/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const taskRoot = resolve(root, 'config/construction');
const profile = JSON.parse(readFileSync(resolve(taskRoot, 'ALPHA_CONSTRUCTION_PROFILE_V1.json'), 'utf8'));
const benchmarkReference = JSON.parse(readFileSync(resolve(root, 'fixtures/construction/BENCHMARK_REFERENCE_BASIS_KITCHEN_V1.json'), 'utf8'));
const confirmedSchema = JSON.parse(readFileSync(resolve(root, 'contracts/construction/CONFIRMED_CONFIGURATION_V1.schema.json'), 'utf8'));

const { buildConfirmedConfiguration } = stage10;

const ajv = new Ajv2020({ strict: false, validateFormats: false });
const validateConfirmed = ajv.compile(confirmedSchema);

const PROFILE_ID = 'alpha-basis-v1';

function known(value, sourceRef, sourceType, evidenceState, note) {
  return {
    state: 'KNOWN',
    value,
    source_ref: sourceRef,
    source_type: sourceType,
    evidence_state: evidenceState,
    note
  };
}

function module_({
  id, type, role, x_mm = 0, y_mm = 0, width, height, depth, fronts = [], appliance_slots = [], notes } = {}) {
  return {
    id,
    module_type: type,
    role,
    x_mm,
    y_mm,
    dimensions: {
      width_mm: known(width, 'NOTE_A', 'USER_DIMENSION', 'EXPLICIT', 'width'),
      height_mm: known(height, 'NOTE_A', 'DEFAULT_CANDIDATE', 'ALPHA_DEFAULT', 'height'),
      depth_mm: known(depth, 'NOTE_A', 'DEFAULT_CANDIDATE', 'ALPHA_DEFAULT', 'depth')
    },
    fronts,
    appliance_slots,
    ...(notes !== undefined ? { notes } : {})
  };
}

function baseResolvedDraft() {
  return {
    schema_version: 'draft-configuration-v1',
    project_id: 'adapter-kitchen',
    construction_profile_id: PROFILE_ID,
    source_refs: [
      { id: 'NOTE_A', type: 'NOTE', file: 'note.md', note: 'resolved note' }
    ],
    global_dimensions: {
      finished_worktop_height_mm: 910,
      toe_kick_height_mm: 100,
      countertop_thickness_mm: 40
    },
    assemblies: [
      {
        id: 'asm-A',
        kind: 'LINEAR_RUN',
        overall_width_mm: 1200,
        overall_depth_mm: 600,
        finished_height_mm: 910,
        modules: [
          module_({
            id: 'mod-733',
            type: 'BASE_CABINET',
            role: 'GENERAL_STORAGE',
            width: 733,
            height: 770,
            depth: 560,
            fronts: [{ kind: 'HINGED_DOOR', count: 1, width_mm: 733, height_mm: 730, evidence_state: 'EXPLICIT' }],
            notes: ['733 width module']
          })
        ],
        openings: [],
        non_carcass_surfaces: []
      }
    ]
  };
}

function withWidth(draft, width) {
  const d = structuredClone(draft);
  d.assemblies[0].modules[0].dimensions.width_mm.value = width;
  d.assemblies[0].modules[0].fronts[0].width_mm = width;
  return d;
}

function setWidthCell(draft, cell) {
  const d = structuredClone(draft);
  d.assemblies[0].modules[0].dimensions.width_mm = cell;
  return d;
}

test('Export check: runConstructionFromDraft exported from adapter and index, aliases equal', () => {
  assert.equal(typeof runConstructionFromDraft, 'function');
  assert.equal(runConstructionFromDraft, RunConstructionFromDraft);
  assert.equal(typeof stage10.runConstructionFromDraft, 'function');
  assert.equal(typeof stage10.RunConstructionFromDraft, 'function');
  assert.equal(stage10.runConstructionFromDraft, runConstructionFromDraft);
});

test('J. Existing Stage 10 API compatibility: Stage 10.1-10.5 exports preserved', () => {
  assert.equal(typeof stage10.validateEvidence, 'function');
  assert.equal(typeof stage10.validateDraft, 'function');
  assert.equal(typeof stage10.buildConfirmedConfiguration, 'function');
  assert.equal(typeof stage10.clarifyDraft, 'function');
  assert.equal(typeof stage10.ClarifyDraft, 'function');
  assert.equal(typeof stage10.fuseEvidence, 'function');
  assert.equal(typeof stage10.FuseEvidence, 'function');
  assert.equal(typeof stage10.buildDynamicBrief, 'function');
  assert.equal(typeof stage10.BuildDynamicBrief, 'function');
  assert.equal(typeof stage10.applyConfirmationAnswers, 'function');
  assert.equal(typeof stage10.ApplyConfirmationAnswers, 'function');
});

test('A. Fully resolved Draft -> Ok true, confirmed and construction result present', () => {
  const result = runConstructionFromDraft(baseResolvedDraft(), profile, benchmarkReference);
  assert.equal(result.Ok, true);
  assert.ok(result.Confirmed_configuration);
  assert.ok(result.Construction_result);
  assert.deepEqual(result.Issues, []);
});

test('B. Missing required field -> Ok false, Construction_result null', () => {
  const draft = setWidthCell(baseResolvedDraft(), { state: 'MISSING' });
  const result = runConstructionFromDraft(draft, profile, benchmarkReference);
  assert.equal(result.Ok, false);
  assert.equal(result.Construction_result, null);
  assert.ok(result.Issues.length >= 1);
});

test('C. Conflict -> Ok false, Construction_result null', () => {
  const draft = setWidthCell(baseResolvedDraft(), { state: 'CONFLICT', options: [733, 800] });
  const result = runConstructionFromDraft(draft, profile, benchmarkReference);
  assert.equal(result.Ok, false);
  assert.equal(result.Construction_result, null);
  assert.ok(result.Issues.length >= 1);
  assert.ok(result.Issues.some((i) => i.code === 'UNRESOLVED_CONFLICT'));
});

test('D. Needs confirmation on required field -> Ok false, Construction_result null', () => {
  const draft = setWidthCell(baseResolvedDraft(), {
    state: 'NEEDS_CONFIRMATION',
    value: 600,
    source_type: 'DEFAULT_CANDIDATE',
    source_ref: 'NOTE_A',
    evidence_state: 'ALPHA_DEFAULT',
    note: 'confirm me'
  });
  const result = runConstructionFromDraft(draft, profile, benchmarkReference);
  assert.equal(result.Ok, false);
  assert.equal(result.Construction_result, null);
  assert.ok(result.Issues.some((i) => i.code === 'CONFIRMATION_REQUIRED'));
});

test('E. Confirmed schema validation: successful confirmed_configuration valid vs CONFIRMED_CONFIGURATION_V1.schema.json', () => {
  const result = runConstructionFromDraft(baseResolvedDraft(), profile, benchmarkReference);
  assert.equal(result.Ok, true);
  assert.equal(validateConfirmed(result.Confirmed_configuration), true, JSON.stringify(validateConfirmed.errors));
});

test('F. Construction result shape: canonical Construction Core sections present', () => {
  const result = runConstructionFromDraft(baseResolvedDraft(), profile, benchmarkReference);
  assert.equal(result.Ok, true);
  const r = result.Construction_result;
  for (const key of ['Project', 'Parts', 'Materials', 'Materials_by_component', 'Edge', 'Edge_by_component', 'Part_count_by_component', 'Hardware', 'Manufacturing_features', 'Issues', 'Benchmark']) {
    assert.ok(key in r, `missing canonical section ${key}`);
  }
  assert.ok(Array.isArray(r.Parts));
  assert.ok(Array.isArray(r.Materials));
  assert.ok(r.Benchmark && r.Benchmark.aggregates.length === 4);
});

test('G. Width 733 end-to-end preservation: Draft -> Confirmed -> generated part geometry reflects 733 without normalization', () => {
  const draft = withWidth(baseResolvedDraft(), 733);
  const result = runConstructionFromDraft(draft, profile, benchmarkReference);
  assert.equal(result.Ok, true);
  const confirmed = result.Confirmed_configuration;
  assert.equal(confirmed.assemblies[0].modules[0].width_mm, 733);
  const parts = result.Construction_result.Parts;
  const bottom = parts.find((p) => p.Module_id === 'mod-733' && p.Part_type === 'BOTTOM');
  assert.ok(bottom, 'BOTTOM part exists');
  assert.equal(bottom.Length_mm, 733 - core.RULES.dimensions.horizontal_width_reduction_mm);
  assert.equal(confirmed.assemblies[0].modules[0].width_mm, 733);
  const side = parts.find((p) => p.Module_id === 'mod-733' && p.Part_type === 'LEFT_SIDE');
  assert.ok(side);
  assert.equal(side.Length_mm, 770);
});

test('H. Determinism: two identical runs produce byte-equivalent result', () => {
  const draft = baseResolvedDraft();
  const a = runConstructionFromDraft(draft, profile, benchmarkReference);
  const b = runConstructionFromDraft(draft, profile, benchmarkReference);
  assert.strictEqual(JSON.stringify(a), JSON.stringify(b));
});

test('I. Input immutability: draft, profile, benchmarkReference unchanged after run', () => {
  const draft = baseResolvedDraft();
  const draftBefore = JSON.stringify(draft);
  const profileBefore = JSON.stringify(profile);
  const refBefore = JSON.stringify(benchmarkReference);
  runConstructionFromDraft(draft, profile, benchmarkReference);
  assert.strictEqual(JSON.stringify(draft), draftBefore);
  assert.strictEqual(JSON.stringify(profile), profileBefore);
  assert.strictEqual(JSON.stringify(benchmarkReference), refBefore);
});

test('Blocking prevents Construction Core execution: missing -> no parts computed', () => {
  const draft = setWidthCell(baseResolvedDraft(), { state: 'MISSING' });
  const result = runConstructionFromDraft(draft, profile, benchmarkReference);
  assert.equal(result.Ok, false);
  assert.equal(result.Construction_result, null);
  assert.ok(result.Issues.some((i) => i.code === 'MISSING_REQUIRED_VALUE' || i.status === 'BLOCKING'));
});

test('Adapter does not recompute confirmed values: buildConfirmedConfiguration result equals adapter confirmed', () => {
  const draft = baseResolvedDraft();
  const direct = buildConfirmedConfiguration(structuredClone(draft));
  assert.equal(direct.ok, true);
  const adapterResult = runConstructionFromDraft(draft, profile, benchmarkReference);
  assert.equal(adapterResult.Ok, true);
  assert.strictEqual(JSON.stringify(adapterResult.Confirmed_configuration), JSON.stringify(direct.confirmed));
});