import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';

import stage10 from '../Stage_10_input_understanding/index.js';
import confirmation from '../Stage_10_input_understanding/confirmation.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const taskRoot = resolve(root, '_tasks/stage-10-input-understanding');
const fixturesRoot = resolve(root, 'Stage_10_input_understanding/fixtures');

const evidenceSchema = JSON.parse(readFileSync(resolve(taskRoot, 'INPUT_EVIDENCE_V1.schema.json'), 'utf8'));
const draftSchema = JSON.parse(readFileSync(resolve(taskRoot, 'DRAFT_CONFIGURATION_V1.schema.json'), 'utf8'));
const miniDraft = JSON.parse(readFileSync(resolve(fixturesRoot, 'mini_kitchen_draft_733.json'), 'utf8'));

const { clarifyDraft, buildDynamicBrief, BuildDynamicBrief, applyConfirmationAnswers, ApplyConfirmationAnswers } = stage10;

const ajv = new Ajv2020({ strict: false, validateFormats: false });
const validateEvidenceSchema = ajv.compile(evidenceSchema);
const validateDraftSchema = ajv.compile(draftSchema);

function defaultCandidateDraft() {
  const draft = structuredClone(miniDraft);
  draft.assemblies[0].modules[0].dimensions.width_mm = {
    state: 'NEEDS_CONFIRMATION',
    value: 600,
    source_type: 'DEFAULT_CANDIDATE',
    source_ref: 'NOTE_MINI',
    evidence_state: 'ALPHA_DEFAULT',
    note: 'Default candidate width.'
  };
  return draft;
}

function conflictDraft() {
  const draft = structuredClone(miniDraft);
  draft.assemblies[0].modules[0].dimensions.width_mm = {
    state: 'CONFLICT',
    options: [650, 600]
  };
  return draft;
}

function missingDraft() {
  const draft = structuredClone(miniDraft);
  draft.assemblies[0].modules[0].dimensions.width_mm = { state: 'MISSING' };
  return draft;
}

function knownUnderstoodDraft() {
  const draft = structuredClone(miniDraft);
  return draft;
}

test('Export check: buildDynamicBrief/applyConfirmationAnswers and aliases exported from index and confirmation module', () => {
  assert.equal(typeof buildDynamicBrief, 'function');
  assert.equal(typeof BuildDynamicBrief, 'function');
  assert.equal(typeof applyConfirmationAnswers, 'function');
  assert.equal(typeof ApplyConfirmationAnswers, 'function');
  assert.equal(buildDynamicBrief, BuildDynamicBrief);
  assert.equal(applyConfirmationAnswers, ApplyConfirmationAnswers);
  assert.equal(buildDynamicBrief, confirmation.buildDynamicBrief);
  assert.equal(applyConfirmationAnswers, confirmation.applyConfirmationAnswers);
});

test('Existing Stage 10 API preserved: clarifyDraft and fuseEvidence still exported', () => {
  assert.equal(typeof stage10.clarifyDraft, 'function');
  assert.equal(typeof stage10.ClarifyDraft, 'function');
  assert.equal(typeof stage10.fuseEvidence, 'function');
  assert.equal(typeof stage10.FuseEvidence, 'function');
  assert.equal(typeof stage10.validateEvidence, 'function');
  assert.equal(typeof stage10.validateDraft, 'function');
  assert.equal(typeof stage10.buildConfirmedConfiguration, 'function');
});

test('A. Clarification result -> stable Dynamic Brief', () => {
  const draft = structuredClone(miniDraft);
  draft.assemblies[0].modules[0].dimensions.width_mm = {
    state: 'CONFLICT',
    options: [650, 600]
  };
  draft.assemblies[0].modules[0].dimensions.height_mm = {
    state: 'NEEDS_CONFIRMATION',
    value: 720,
    source_type: 'DEFAULT_CANDIDATE',
    source_ref: 'NOTE_MINI',
    evidence_state: 'ALPHA_DEFAULT',
    note: 'Default candidate height.'
  };

  const clarification = clarifyDraft(draft);
  const brief = buildDynamicBrief(clarification);

  assert.ok(Array.isArray(brief.Understood));
  assert.ok(Array.isArray(brief.Defaults_to_confirm));
  assert.ok(Array.isArray(brief.Questions));
  assert.ok(Array.isArray(brief.Conflicts));
  assert.ok(Array.isArray(brief.Blockers));

  const heightPath = '$.assemblies[0].modules[0].dimensions.height_mm';
  assert.ok(brief.Defaults_to_confirm.some(d => d.Target_path === heightPath && d.Value === 720));
  assert.ok(brief.Questions.some(q => q.Target_path === heightPath && q.Reason === 'CONFIRMATION_REQUIRED'));

  const widthPath = '$.assemblies[0].modules[0].dimensions.width_mm';
  assert.ok(brief.Conflicts.some(c => c.Target_path === widthPath));
  assert.ok(brief.Blockers.some(b => b.Target_path === widthPath));
});

test('A2. Brief determinism: same clarification result -> byte-equivalent brief twice', () => {
  const draft = conflictDraft();
  const clarification = clarifyDraft(draft);
  const b1 = buildDynamicBrief(clarification);
  const b2 = buildDynamicBrief(clarification);
  assert.strictEqual(JSON.stringify(b1), JSON.stringify(b2), 'byte-equivalent brief');
});

test('B. KNOWN values -> understood', () => {
  const draft = knownUnderstoodDraft();
  const clarification = clarifyDraft(draft);
  const brief = buildDynamicBrief(clarification);
  const widthPath = '$.assemblies[0].modules[0].dimensions.width_mm';
  assert.ok(brief.Understood.some(u => u.Target_path === widthPath && u.Value === 733));
});

test('C. DEFAULT_CANDIDATE -> defaults_to_confirm', () => {
  const draft = defaultCandidateDraft();
  const clarification = clarifyDraft(draft);
  const brief = buildDynamicBrief(clarification);
  const widthPath = '$.assemblies[0].modules[0].dimensions.width_mm';
  const dc = brief.Defaults_to_confirm.find(d => d.Target_path === widthPath);
  assert.ok(dc, 'default candidate present in defaults_to_confirm');
  assert.equal(dc.Value, 600);
  assert.equal(dc.Evidence_id, 'NOTE_MINI');
});

test('D. Default acceptance -> USER_CONFIRMATION Evidence', () => {
  const draft = defaultCandidateDraft();
  const clarification = clarifyDraft(draft);
  const brief = buildDynamicBrief(clarification);
  const widthPath = '$.assemblies[0].modules[0].dimensions.width_mm';
  const q = brief.Questions.find(qq => qq.Target_path === widthPath);
  assert.ok(q, 'question present');

  const result = applyConfirmationAnswers(draft, brief, [
    { Question_id: q.Question_id, Target_path: widthPath, Value: 600 }
  ]);

  assert.equal(result.Ok, true);
  assert.equal(result.Evidence.length, 1);
  const ev = result.Evidence[0];
  assert.equal(ev.source_type, 'USER_CONFIRMATION');
  assert.equal(ev.target_path, widthPath);
  assert.equal(ev.value, 600);
  assert.equal(ev.state, 'ACTIVE');
  assert.equal(typeof ev.source_ref, 'string');
  assert.ok(ev.source_ref.length > 0, 'evidence_id/source_ref must be deterministic non-empty string');
  assert.equal(ev.confidence, 1.0);
});

test('E. Confirmed default -> field KNOWN and selected_evidence_id points to USER_CONFIRMATION', () => {
  const draft = defaultCandidateDraft();
  const clarification = clarifyDraft(draft);
  const brief = buildDynamicBrief(clarification);
  const widthPath = '$.assemblies[0].modules[0].dimensions.width_mm';
  const q = brief.Questions.find(qq => qq.Target_path === widthPath);

  const result = applyConfirmationAnswers(draft, brief, [
    { Question_id: q.Question_id, Target_path: widthPath, Value: 600 }
  ]);

  assert.equal(result.Ok, true);
  const cell = result.Draft.assemblies[0].modules[0].dimensions.width_mm;
  assert.equal(cell.state, 'KNOWN');
  assert.equal(cell.value, 600);
  assert.equal(cell.source_type, 'USER_CONFIRMATION');
  assert.equal(cell.evidence_state, 'MANAGER_CONFIRMED');
  assert.equal(cell.source_ref, result.Evidence[0].source_ref, 'selected_evidence_id points to USER_CONFIRMATION evidence');

  const reclarified = clarifyDraft(result.Draft);
  const understood = reclarified.Understood.find(u => u.Target_path === widthPath);
  assert.ok(understood, 'default now understood');
  assert.equal(understood.Selected_evidence_id, result.Evidence[0].source_ref);
  assert.ok(!reclarified.Questions.some(qq => qq.Target_path === widthPath), 'no longer needs confirmation');
  assert.ok(!reclarified.Default_candidates.some(d => d.Target_path === widthPath), 'no longer a default candidate');
});

test('F. Conflict 600/650 + answer 650 -> KNOWN 650', () => {
  const draft = conflictDraft();
  const clarification = clarifyDraft(draft);
  const brief = buildDynamicBrief(clarification);
  const widthPath = '$.assemblies[0].modules[0].dimensions.width_mm';
  const q = brief.Questions.find(qq => qq.Target_path === widthPath);

  const result = applyConfirmationAnswers(draft, brief, [
    { Question_id: q.Question_id, Target_path: widthPath, Value: 650 }
  ]);

  assert.equal(result.Ok, true);
  const cell = result.Draft.assemblies[0].modules[0].dimensions.width_mm;
  assert.equal(cell.state, 'KNOWN');
  assert.strictEqual(cell.value, 650);
  assert.equal(cell.source_type, 'USER_CONFIRMATION');
});

test('G. Conflict provenance retains 600 and 650 source_refs in source_refs', () => {
  const draft = structuredClone(miniDraft);
  draft.source_refs.push(
    { id: 'CONFLICT_SRC_600', type: 'IMAGE', file: 'img600', note: 'Conflict width 600 source.' },
    { id: 'CONFLICT_SRC_650', type: 'IMAGE', file: 'img650', note: 'Conflict width 650 source.' }
  );
  draft.assemblies[0].modules[0].dimensions.width_mm = {
    state: 'CONFLICT',
    options: [650, 600],
    source_ref: 'CONFLICT_SRC_600',
    source_type: 'IMAGE_TEXT',
    evidence_state: 'EXPLICIT',
    note: 'Conflicting width from images.'
  };
  const clarification = clarifyDraft(draft);
  const brief = buildDynamicBrief(clarification);
  assert.ok(brief.Conflicts.find(c => c.Target_path === '$.assemblies[0].modules[0].dimensions.width_mm').Evidence.length === 2);

  const widthPath = '$.assemblies[0].modules[0].dimensions.width_mm';
  const q = brief.Questions.find(qq => qq.Target_path === widthPath);
  const result = applyConfirmationAnswers(draft, brief, [
    { Question_id: q.Question_id, Target_path: widthPath, Value: 650 }
  ]);

  assert.equal(result.Ok, true);
  const conflictRecord = brief.Conflicts.find(c => c.Target_path === widthPath);
  assert.deepEqual(conflictRecord.Evidence.map(e => e.Value), [600, 650], 'both conflict evidence retained in brief provenance');

  const refIds = result.Draft.source_refs.map(r => r.id);
  assert.ok(refIds.includes('CONFLICT_SRC_600'), 'original conflict 600 source_ref retained in draft source_refs');
  assert.ok(refIds.includes('CONFLICT_SRC_650'), 'original conflict 650 source_ref retained in draft source_refs');
});

test('H. Unknown question_id -> deterministic issue, no partial apply', () => {
  const draft = defaultCandidateDraft();
  const clarification = clarifyDraft(draft);
  const brief = buildDynamicBrief(clarification);
  const widthPath = '$.assemblies[0].modules[0].dimensions.width_mm';
  const realQ = brief.Questions.find(qq => qq.Target_path === widthPath);

  const snapshot = JSON.stringify(draft);
  const result = applyConfirmationAnswers(draft, brief, [
    { Question_id: 'q_nonexistent_question', Target_path: widthPath, Value: 600 },
    { Question_id: realQ.Question_id, Target_path: widthPath, Value: 600 }
  ]);

  assert.equal(result.Ok, false);
  assert.equal(result.Draft, null);
  assert.equal(result.Evidence.length, 0);
  assert.ok(result.Issues.some(i => i.code === 'UNKNOWN_QUESTION_ID'));
  assert.strictEqual(JSON.stringify(draft), snapshot, 'no partial application: input draft unchanged');
});

test('I. Question_id/target_path mismatch -> deterministic issue', () => {
  const draft = defaultCandidateDraft();
  const clarification = clarifyDraft(draft);
  const brief = buildDynamicBrief(clarification);
  const widthPath = '$.assemblies[0].modules[0].dimensions.width_mm';
  const q = brief.Questions.find(qq => qq.Target_path === widthPath);
  const wrongPath = '$.assemblies[0].modules[1].dimensions.width_mm';

  const result = applyConfirmationAnswers(draft, brief, [
    { Question_id: q.Question_id, Target_path: wrongPath, Value: 600 }
  ]);

  assert.equal(result.Ok, false);
  assert.equal(result.Draft, null);
  assert.ok(result.Issues.some(i => i.code === 'QUESTION_TARGET_MISMATCH'));
});

test('I2. Missing answer Value -> deterministic issue', () => {
  const draft = defaultCandidateDraft();
  const clarification = clarifyDraft(draft);
  const brief = buildDynamicBrief(clarification);
  const widthPath = '$.assemblies[0].modules[0].dimensions.width_mm';
  const q = brief.Questions.find(qq => qq.Target_path === widthPath);

  const resultMissing = applyConfirmationAnswers(draft, brief, [
    { Question_id: q.Question_id, Target_path: widthPath }
  ]);
  assert.equal(resultMissing.Ok, false);
  assert.ok(resultMissing.Issues.some(i => i.code === 'ANSWER_VALUE_MISSING'));

  const resultNull = applyConfirmationAnswers(draft, brief, [
    { Question_id: q.Question_id, Target_path: widthPath, Value: null }
  ]);
  assert.equal(resultNull.Ok, false);
  assert.ok(resultNull.Issues.some(i => i.code === 'ANSWER_VALUE_MISSING'));
});

test('J. Input answer order does not change resulting Draft', () => {
  const draft = structuredClone(miniDraft);
  draft.assemblies[0].modules[0].dimensions.width_mm = {
    state: 'CONFLICT',
    options: [650, 600]
  };
  draft.assemblies[0].modules[0].dimensions.height_mm = {
    state: 'NEEDS_CONFIRMATION',
    value: 720,
    source_type: 'DEFAULT_CANDIDATE',
    source_ref: 'NOTE_MINI',
    evidence_state: 'ALPHA_DEFAULT',
    note: 'Default candidate height.'
  };
  const clarification = clarifyDraft(draft);
  const brief = buildDynamicBrief(clarification);

  const widthPath = '$.assemblies[0].modules[0].dimensions.width_mm';
  const heightPath = '$.assemblies[0].modules[0].dimensions.height_mm';
  const widthQ = brief.Questions.find(qq => qq.Target_path === widthPath);
  const heightQ = brief.Questions.find(qq => qq.Target_path === heightPath);

  const answersA = [
    { Question_id: widthQ.Question_id, Target_path: widthPath, Value: 650 },
    { Question_id: heightQ.Question_id, Target_path: heightPath, Value: 720 }
  ];
  const answersB = answersA.slice().reverse();

  const rA = applyConfirmationAnswers(draft, brief, answersA);
  const rB = applyConfirmationAnswers(draft, brief, answersB);

  assert.equal(rA.Ok, true);
  assert.equal(rB.Ok, true);
  assert.strictEqual(JSON.stringify(rA.Draft), JSON.stringify(rB.Draft), 'order-independent draft');
});

test('K. Answer 733 -> Draft value 733 preserved', () => {
  const draft = structuredClone(miniDraft);
  draft.assemblies[0].modules[0].dimensions.width_mm = {
    state: 'CONFLICT',
    options: [733, 600]
  };
  const clarification = clarifyDraft(draft);
  const brief = buildDynamicBrief(clarification);
  const widthPath = '$.assemblies[0].modules[0].dimensions.width_mm';
  const q = brief.Questions.find(qq => qq.Target_path === widthPath);

  const result = applyConfirmationAnswers(draft, brief, [
    { Question_id: q.Question_id, Target_path: widthPath, Value: 733 }
  ]);

  assert.equal(result.Ok, true);
  const cell = result.Draft.assemblies[0].modules[0].dimensions.width_mm;
  assert.strictEqual(cell.value, 733, '733 preserved without normalization');
  assert.equal(cell.state, 'KNOWN');
});

test('L. Resolved question disappears after clarifyDraft(updatedDraft)', () => {
  const draft = conflictDraft();
  const clarification = clarifyDraft(draft);
  const brief = buildDynamicBrief(clarification);
  const widthPath = '$.assemblies[0].modules[0].dimensions.width_mm';
  const q = brief.Questions.find(qq => qq.Target_path === widthPath);

  const result = applyConfirmationAnswers(draft, brief, [
    { Question_id: q.Question_id, Target_path: widthPath, Value: 650 }
  ]);
  assert.equal(result.Ok, true);

  const reclarified = clarifyDraft(result.Draft);
  assert.ok(!reclarified.Questions.some(qq => qq.Target_path === widthPath), 'resolved question disappears');
  assert.ok(!reclarified.Blockers.some(b => b.Target_path === widthPath), 'resolved conflict no longer a blocker');
  assert.ok(!reclarified.Conflicts.some(c => c.Target_path === widthPath), 'resolved conflict no longer in conflicts');
});

test('L2. Confirmed default no longer NEEDS_CONFIRMATION after round-trip', () => {
  const draft = defaultCandidateDraft();
  const clarification = clarifyDraft(draft);
  const brief = buildDynamicBrief(clarification);
  const widthPath = '$.assemblies[0].modules[0].dimensions.width_mm';
  const q = brief.Questions.find(qq => qq.Target_path === widthPath);

  const result = applyConfirmationAnswers(draft, brief, [
    { Question_id: q.Question_id, Target_path: widthPath, Value: 600 }
  ]);
  assert.equal(result.Ok, true);

  const reclarified = clarifyDraft(result.Draft);
  assert.ok(!reclarified.Questions.some(qq => qq.Target_path === widthPath), 'confirmed default not asked again');
  assert.ok(!reclarified.Default_candidates.some(d => d.Target_path === widthPath), 'confirmed default not a candidate');
  const cell = result.Draft.assemblies[0].modules[0].dimensions.width_mm;
  assert.notEqual(cell.state, 'NEEDS_CONFIRMATION', 'no longer NEEDS_CONFIRMATION');
  assert.equal(cell.state, 'KNOWN');
});

test('M. USER_CONFIRMATION evidence valid per INPUT_EVIDENCE_V1.schema.json', () => {
  const draft = defaultCandidateDraft();
  const clarification = clarifyDraft(draft);
  const brief = buildDynamicBrief(clarification);
  const widthPath = '$.assemblies[0].modules[0].dimensions.width_mm';
  const q = brief.Questions.find(qq => qq.Target_path === widthPath);

  const result = applyConfirmationAnswers(draft, brief, [
    { Question_id: q.Question_id, Target_path: widthPath, Value: 600 }
  ]);
  assert.equal(result.Ok, true);

  const valid = validateEvidenceSchema(result.Evidence);
  if (!valid) {
    console.error('Evidence schema errors:', JSON.stringify(validateEvidenceSchema.errors, null, 2));
  }
  assert.ok(valid, 'USER_CONFIRMATION evidence must validate against INPUT_EVIDENCE_V1.schema.json');
});

test('N. Updated Draft valid per DRAFT_CONFIGURATION_V1.schema.json', () => {
  const draft = conflictDraft();
  const clarification = clarifyDraft(draft);
  const brief = buildDynamicBrief(clarification);
  const widthPath = '$.assemblies[0].modules[0].dimensions.width_mm';
  const q = brief.Questions.find(qq => qq.Target_path === widthPath);

  const result = applyConfirmationAnswers(draft, brief, [
    { Question_id: q.Question_id, Target_path: widthPath, Value: 650 }
  ]);
  assert.equal(result.Ok, true);

  const valid = validateDraftSchema(result.Draft);
  if (!valid) {
    console.error('Draft schema errors:', JSON.stringify(validateDraftSchema.errors, null, 2));
  }
  assert.ok(valid, 'Updated Draft must validate against DRAFT_CONFIGURATION_V1.schema.json');
});

test('O. Input draft/brief/answers not mutated', () => {
  const draft = conflictDraft();
  const clarification = clarifyDraft(draft);
  const brief = buildDynamicBrief(clarification);
  const widthPath = '$.assemblies[0].modules[0].dimensions.width_mm';
  const q = brief.Questions.find(qq => qq.Target_path === widthPath);

  const draftSnapshot = JSON.stringify(draft);
  const briefSnapshot = JSON.stringify(brief);
  const answers = [{ Question_id: q.Question_id, Target_path: widthPath, Value: 650 }];
  const answersSnapshot = JSON.stringify(answers);

  const result = applyConfirmationAnswers(draft, brief, answers);
  assert.equal(result.Ok, true);

  assert.strictEqual(JSON.stringify(draft), draftSnapshot, 'input draft not mutated');
  assert.strictEqual(JSON.stringify(brief), briefSnapshot, 'input brief not mutated');
  assert.strictEqual(JSON.stringify(answers), answersSnapshot, 'input answers not mutated');
});

test('O2. Deterministic evidence_id: same answer -> same source_ref twice', () => {
  const draft = defaultCandidateDraft();
  const clarification = clarifyDraft(draft);
  const brief = buildDynamicBrief(clarification);
  const widthPath = '$.assemblies[0].modules[0].dimensions.width_mm';
  const q = brief.Questions.find(qq => qq.Target_path === widthPath);

  const r1 = applyConfirmationAnswers(draft, brief, [
    { Question_id: q.Question_id, Target_path: widthPath, Value: 600 }
  ]);
  const r2 = applyConfirmationAnswers(draft, brief, [
    { Question_id: q.Question_id, Target_path: widthPath, Value: 600 }
  ]);

  assert.equal(r1.Ok, true);
  assert.equal(r2.Ok, true);
  assert.strictEqual(r1.Evidence[0].source_ref, r2.Evidence[0].source_ref, 'deterministic evidence_id');
  assert.strictEqual(JSON.stringify(r1.Draft), JSON.stringify(r2.Draft), 'byte-equivalent updated draft');
});

test('P. MISSING required field produces a question and accepts a numeric answer', () => {
  const draft = missingDraft();
  const clarification = clarifyDraft(draft);
  const brief = buildDynamicBrief(clarification);
  const widthPath = '$.assemblies[0].modules[0].dimensions.width_mm';
  const q = brief.Questions.find(qq => qq.Target_path === widthPath);
  assert.ok(q, 'MISSING required field produces a question');
  assert.equal(q.Reason, 'MISSING_REQUIRED_VALUE');

  const result = applyConfirmationAnswers(draft, brief, [
    { Question_id: q.Question_id, Target_path: widthPath, Value: 500 }
  ]);
  assert.equal(result.Ok, true);
  const cell = result.Draft.assemblies[0].modules[0].dimensions.width_mm;
  assert.equal(cell.state, 'KNOWN');
  assert.strictEqual(cell.value, 500);
});