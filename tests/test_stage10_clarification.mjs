import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import stage10 from '../Stage_10_input_understanding/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixturesRoot = resolve(root, 'Stage_10_input_understanding/fixtures');
const miniDraft = JSON.parse(readFileSync(resolve(fixturesRoot, 'mini_kitchen_draft_733.json'), 'utf8'));

const { clarifyDraft, ClarifyDraft } = stage10;

function knownCell(value, sourceType, evidenceState, note) {
  return {
    state: 'KNOWN',
    value: value,
    source_ref: 'NOTE_MINI',
    source_type: sourceType || 'USER_DIMENSION',
    evidence_state: evidenceState || 'MANAGER_CONFIRMED',
    note: note || 'Confirmed value.'
  };
}

function fullyKnownDraft() {
  const draft = structuredClone(miniDraft);
  draft.assemblies[0].modules[0].dimensions.height_mm = knownCell(715, 'USER_DIMENSION', 'EXPLICIT', 'Height confirmed.');
  draft.assemblies[0].modules[0].dimensions.depth_mm = knownCell(560, 'USER_DIMENSION', 'EXPLICIT', 'Depth confirmed.');
  return draft;
}

test('A. Fully KNOWN draft has no blockers, questions, or conflicts', () => {
  const draft = fullyKnownDraft();
  const result = clarifyDraft(draft);
  assert.deepEqual(result.Blockers, [], 'blockers must be empty');
  assert.deepEqual(result.Questions, [], 'questions must be empty');
  assert.deepEqual(result.Conflicts, [], 'conflicts must be empty');
  assert.ok(result.Understood.length > 0, 'understood must contain KNOWN fields');
});

test('B. MISSING required field produces missing + blocker + question', () => {
  const draft = structuredClone(miniDraft);
  draft.assemblies[0].modules[0].dimensions.width_mm = { state: 'MISSING' };
  const result = clarifyDraft(draft);

  const widthPath = '$.assemblies[0].modules[0].dimensions.width_mm';
  assert.ok(result.Missing.some(m => m.Target_path === widthPath), 'missing must include width');
  assert.ok(result.Blockers.some(b => b.Target_path === widthPath && b.Reason === 'MISSING_REQUIRED_VALUE'), 'blocker present');
  const q = result.Questions.find(qq => qq.Target_path === widthPath);
  assert.ok(q, 'question present');
  assert.equal(q.Reason, 'MISSING_REQUIRED_VALUE');
  assert.equal(q.Current_state, 'MISSING');
});

test('C. CONFLICT 600 vs 650 retains both evidence, blocker, question, options=[600,650]', () => {
  const draft = structuredClone(miniDraft);
  draft.assemblies[0].modules[0].dimensions.width_mm = {
    state: 'CONFLICT',
    options: [650, 600]
  };
  const result = clarifyDraft(draft);

  const widthPath = '$.assemblies[0].modules[0].dimensions.width_mm';
  const conflict = result.Conflicts.find(c => c.Target_path === widthPath);
  assert.ok(conflict, 'conflict record present');
  assert.deepEqual(conflict.Options, [600, 650], 'options sorted ascending');
  assert.equal(conflict.Evidence.length, 2, 'both evidence items retained');
  assert.deepEqual(conflict.Evidence.map(e => e.Value), [600, 650], 'evidence values retained');

  assert.ok(result.Blockers.some(b => b.Target_path === widthPath && b.Reason === 'UNRESOLVED_CONFLICT'), 'blocker present');
  const q = result.Questions.find(qq => qq.Target_path === widthPath);
  assert.ok(q, 'question present');
  assert.equal(q.Reason, 'UNRESOLVED_CONFLICT');
  assert.deepEqual(q.Options, [600, 650]);
});

test('D. DEFAULT_CANDIDATE 600 lands in default_candidates and does not become KNOWN', () => {
  const draft = structuredClone(miniDraft);
  draft.assemblies[0].modules[0].dimensions.width_mm = {
    state: 'NEEDS_CONFIRMATION',
    value: 600,
    source_type: 'DEFAULT_CANDIDATE',
    source_ref: 'NOTE_MINI',
    evidence_state: 'ALPHA_DEFAULT',
    note: 'Default candidate width.'
  };
  const result = clarifyDraft(draft);

  const widthPath = '$.assemblies[0].modules[0].dimensions.width_mm';
  const dc = result.Default_candidates.find(d => d.Target_path === widthPath);
  assert.ok(dc, 'default candidate present');
  assert.equal(dc.Value, 600);
  assert.equal(dc.Evidence_id, 'NOTE_MINI');

  assert.ok(!result.Understood.some(u => u.Target_path === widthPath), 'default candidate must not become KNOWN');
});

test('E. NEEDS_CONFIRMATION + default produces question with default option', () => {
  const draft = structuredClone(miniDraft);
  draft.assemblies[0].modules[0].dimensions.width_mm = {
    state: 'NEEDS_CONFIRMATION',
    value: 600,
    source_type: 'DEFAULT_CANDIDATE',
    source_ref: 'NOTE_MINI',
    evidence_state: 'ALPHA_DEFAULT',
    note: 'Default candidate width.'
  };
  const result = clarifyDraft(draft);

  const widthPath = '$.assemblies[0].modules[0].dimensions.width_mm';
  const q = result.Questions.find(qq => qq.Target_path === widthPath);
  assert.ok(q, 'question present');
  assert.equal(q.Reason, 'CONFIRMATION_REQUIRED');
  assert.equal(q.Current_state, 'NEEDS_CONFIRMATION');
  assert.deepEqual(q.Options, [600], 'default option included');
});

test('F. Determinism: two clarifyDraft calls produce byte-equivalent JSON', () => {
  const draft = structuredClone(miniDraft);
  draft.assemblies[0].modules[0].dimensions.width_mm = {
    state: 'CONFLICT',
    options: [650, 600]
  };
  draft.assemblies[0].modules[1].dimensions.height_mm = {
    state: 'NEEDS_CONFIRMATION',
    value: 720,
    source_type: 'DEFAULT_CANDIDATE',
    source_ref: 'NOTE_MINI',
    evidence_state: 'ALPHA_DEFAULT',
    note: 'Default candidate height.'
  };
  const r1 = clarifyDraft(draft);
  const r2 = clarifyDraft(draft);
  assert.strictEqual(JSON.stringify(r1), JSON.stringify(r2), 'byte-equivalent JSON');
});

test('G. KNOWN field does not appear in questions', () => {
  const draft = fullyKnownDraft();
  const result = clarifyDraft(draft);
  const widthPath = '$.assemblies[0].modules[0].dimensions.width_mm';
  assert.ok(result.Understood.some(u => u.Target_path === widthPath), 'KNOWN field in understood');
  assert.ok(!result.Questions.some(q => q.Target_path === widthPath), 'KNOWN field not in questions');
});

test('ClarifyDraft alias equals clarifyDraft', () => {
  assert.strictEqual(ClarifyDraft, clarifyDraft);
});

test('Result arrays are sorted by target_path', () => {
  const draft = structuredClone(miniDraft);
  draft.assemblies[0].modules[0].dimensions.width_mm = { state: 'MISSING' };
  draft.assemblies[0].modules[1].dimensions.width_mm = { state: 'MISSING' };
  const result = clarifyDraft(draft);
  const sorted = arr => arr.slice().sort((a, b) => (a.Target_path < b.Target_path ? -1 : a.Target_path > b.Target_path ? 1 : 0));
  assert.deepEqual(result.Blockers, sorted(result.Blockers));
  assert.deepEqual(result.Questions, sorted(result.Questions));
  assert.deepEqual(result.Missing, sorted(result.Missing));
  assert.deepEqual(result.Understood, sorted(result.Understood));
});