import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';

import stage10 from '../Stage_10_input_understanding/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const taskRoot = resolve(root, '_tasks/stage-10-input-understanding');
const fixturesRoot = resolve(root, 'Stage_10_input_understanding/fixtures');

const evidenceSchema = JSON.parse(readFileSync(resolve(taskRoot, 'INPUT_EVIDENCE_V1.schema.json'), 'utf8'));
const draftSchema = JSON.parse(readFileSync(resolve(taskRoot, 'DRAFT_CONFIGURATION_V1.schema.json'), 'utf8'));
const confirmedSchema = JSON.parse(readFileSync(resolve(root, '_tasks/alpha-construction-core/CONFIRMED_CONFIGURATION_V1.schema.json'), 'utf8'));
const miniDraft = JSON.parse(readFileSync(resolve(fixturesRoot, 'mini_kitchen_draft_733.json'), 'utf8'));

test('Evidence schema compiles and validates sample evidence', () => {
  const ajv = new Ajv2020({ strict: false, validateFormats: false });
  const validate = ajv.compile(evidenceSchema);
  const sampleEvidence = [
    {
      target_path: 'assemblies[0].modules[0].dimensions.width_mm',
      value: 733,
      source_type: 'USER_DIMENSION',
      confidence: 0.95,
      state: 'ACTIVE',
      source_ref: 'NOTE_01'
    }
  ];
  assert.ok(validate(sampleEvidence), 'Valid evidence should pass schema validation');
  
  const invalidEvidence = [
    {
      target_path: 'test',
      value: 100,
      source_type: 'INVALID_TYPE',
      confidence: 0.5,
      state: 'ACTIVE',
      source_ref: 'REF'
    }
  ];
  assert.ok(!validate(invalidEvidence), 'Invalid source_type should fail schema validation');
});

test('Draft schema compiles and validates mini draft fixture', () => {
  const ajv = new Ajv2020({ strict: false, validateFormats: false });
  const validate = ajv.compile(draftSchema);
  assert.ok(validate(miniDraft), 'Mini draft fixture should pass schema validation');
});

test('buildConfirmedConfiguration with fully resolved draft succeeds', () => {
  const result = stage10.buildConfirmedConfiguration(miniDraft);
  assert.equal(result.ok, true, 'Fully resolved draft should succeed');
  assert.ok(result.confirmed, 'Should return confirmed configuration');
  assert.equal(result.issues.length, 0, 'Should have no issues');
});

test('Custom width 733 is preserved exactly', () => {
  const result = stage10.buildConfirmedConfiguration(miniDraft);
  assert.equal(result.ok, true);
  const module = result.confirmed.assemblies[0].modules[0];
  assert.strictEqual(module.width_mm, 733, 'Custom width 733 must be preserved exactly');
});

test('Confirmed output validates against CONFIRMED_CONFIGURATION_V1 schema', () => {
  const result = stage10.buildConfirmedConfiguration(miniDraft);
  assert.equal(result.ok, true);
  
  const ajv = new Ajv2020({ strict: false, validateFormats: false });
  const validate = ajv.compile(confirmedSchema);
  const valid = validate(result.confirmed);
  
  if (!valid) {
    console.error('Validation errors:', JSON.stringify(validate.errors, null, 2));
  }
  assert.ok(valid, 'Confirmed output must validate against CONFIRMED_CONFIGURATION_V1 schema');
});

test('Mapper is deterministic', () => {
  const result1 = stage10.buildConfirmedConfiguration(miniDraft);
  const result2 = stage10.buildConfirmedConfiguration(miniDraft);
  
  assert.equal(result1.ok, result2.ok);
  assert.deepStrictEqual(result1.confirmed, result2.confirmed, 'Two runs should produce identical confirmed output');
  assert.deepStrictEqual(result1.issues, result2.issues, 'Two runs should produce identical issues');
  
  const json1 = JSON.stringify(result1.confirmed);
  const json2 = JSON.stringify(result2.confirmed);
  assert.strictEqual(json1, json2, 'JSON strings should be byte-identical');
});

test('MISSING required field blocks confirmation', () => {
  const draft = structuredClone(miniDraft);
  draft.assemblies[0].modules[1].dimensions.width_mm = { state: 'MISSING' };
  
  const result = stage10.buildConfirmedConfiguration(draft);
  assert.equal(result.ok, false, 'MISSING required field should block');
  assert.equal(result.confirmed, null);
  assert.ok(result.issues.length > 0, 'Should have blocking issues');
  assert.ok(result.issues.some(i => i.code === 'MISSING_REQUIRED_VALUE'), 'Should have MISSING_REQUIRED_VALUE issue');
});

test('CONFLICT dimension blocks confirmation', () => {
  const draft = structuredClone(miniDraft);
  draft.assemblies[0].modules[0].dimensions.width_mm = {
    state: 'CONFLICT',
    options: [733, 750]
  };
  
  const result = stage10.buildConfirmedConfiguration(draft);
  assert.equal(result.ok, false, 'CONFLICT should block');
  assert.equal(result.confirmed, null);
  assert.ok(result.issues.some(i => i.code === 'UNRESOLVED_CONFLICT'), 'Should have UNRESOLVED_CONFLICT issue');
});

test('NEEDS_CONFIRMATION dimension blocks confirmation', () => {
  const draft = structuredClone(miniDraft);
  draft.assemblies[0].modules[0].dimensions.width_mm = {
    state: 'NEEDS_CONFIRMATION'
  };
  
  const result = stage10.buildConfirmedConfiguration(draft);
  assert.equal(result.ok, false, 'NEEDS_CONFIRMATION should block');
  assert.equal(result.confirmed, null);
  assert.ok(result.issues.some(i => i.code === 'CONFIRMATION_REQUIRED'), 'Should have CONFIRMATION_REQUIRED issue');
});

test('MISSING nullable fields emit null', () => {
  const result = stage10.buildConfirmedConfiguration(miniDraft);
  assert.equal(result.ok, true);
  
  const module = result.confirmed.assemblies[0].modules[0];
  assert.strictEqual(module.height_mm, null, 'MISSING nullable height should emit null');
  assert.strictEqual(module.depth_mm, null, 'MISSING nullable depth should emit null');
});

test('dimension_evidence is generated for KNOWN dimensions', () => {
  const result = stage10.buildConfirmedConfiguration(miniDraft);
  assert.equal(result.ok, true);
  
  const module = result.confirmed.assemblies[0].modules[0];
  assert.ok(Array.isArray(module.dimension_evidence), 'dimension_evidence should be an array');
  
  const widthEvidence = module.dimension_evidence.find(e => e.field === 'width_mm');
  assert.ok(widthEvidence, 'Should have evidence for width_mm');
  assert.equal(widthEvidence.source_ref, 'NOTE_MINI');
  assert.equal(widthEvidence.state, 'MANAGER_CONFIRMED');
  assert.ok(widthEvidence.note.length > 0, 'Evidence should have a note');
});

test('Invalid draft structure is rejected', () => {
  const invalidDraft = {
    schema_version: 'wrong-version',
    project_id: 'test',
    construction_profile_id: 'test',
    source_refs: [],
    assemblies: []
  };
  
  const result = stage10.buildConfirmedConfiguration(invalidDraft);
  assert.equal(result.ok, false, 'Invalid schema_version should be rejected');
  assert.ok(result.issues.some(i => i.code === 'DRAFT_STRUCTURE_INVALID'), 'Should have structure validation error');
});

test('Module with invalid module_type is rejected', () => {
  const draft = structuredClone(miniDraft);
  draft.assemblies[0].modules[0].module_type = 'INVALID_TYPE';
  
  const result = stage10.buildConfirmedConfiguration(draft);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some(i => i.code === 'DRAFT_STRUCTURE_INVALID'), 'Should reject invalid module_type');
});

test('Global dimensions are passed through correctly', () => {
  const result = stage10.buildConfirmedConfiguration(miniDraft);
  assert.equal(result.ok, true);
  
  assert.equal(result.confirmed.global_dimensions.finished_worktop_height_mm, 900);
  assert.equal(result.confirmed.global_dimensions.toe_kick_height_mm, 100);
  assert.equal(result.confirmed.global_dimensions.countertop_thickness_mm, 38);
});

test('Confirmed configuration has correct status and schema_version', () => {
  const result = stage10.buildConfirmedConfiguration(miniDraft);
  assert.equal(result.ok, true);
  
  assert.equal(result.confirmed.schema_version, 'confirmed-configuration-v1');
  assert.equal(result.confirmed.status, 'CONFIRMED_FOR_ALPHA');
  assert.equal(result.confirmed.units, 'mm');
});

test('Fronts and appliance slots are preserved', () => {
  const result = stage10.buildConfirmedConfiguration(miniDraft);
  assert.equal(result.ok, true);
  
  const module = result.confirmed.assemblies[0].modules[0];
  assert.equal(module.fronts.length, 1);
  assert.equal(module.fronts[0].kind, 'HINGED_DOOR');
  assert.equal(module.fronts[0].count, 2);
  assert.equal(module.fronts[0].evidence_state, 'MANAGER_CONFIRMED');
  
  assert.ok(Array.isArray(module.appliance_slots), 'appliance_slots should be an array');
});

test('Openings and surfaces are preserved', () => {
  const result = stage10.buildConfirmedConfiguration(miniDraft);
  assert.equal(result.ok, true);
  
  const assembly = result.confirmed.assemblies[0];
  assert.equal(assembly.openings.length, 1);
  assert.equal(assembly.openings[0].id, 'op-window');
  assert.equal(assembly.openings[0].type, 'WINDOW');
  
  assert.equal(assembly.non_carcass_surfaces.length, 1);
  assert.equal(assembly.non_carcass_surfaces[0].id, 'surf-counter');
  assert.equal(assembly.non_carcass_surfaces[0].type, 'COUNTERTOP');
});
