import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';

import stage10 from '../Stage_10_input_understanding/index.js';
import fusion from '../Stage_10_input_understanding/fusion.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const taskRoot = resolve(root, '_tasks/stage-10-input-understanding');
const fixturesRoot = resolve(root, 'Stage_10_input_understanding/fixtures');

const draftSchema = JSON.parse(readFileSync(resolve(taskRoot, 'DRAFT_CONFIGURATION_V1.schema.json'), 'utf8'));
const miniDraft = JSON.parse(readFileSync(resolve(fixturesRoot, 'mini_kitchen_draft_733.json'), 'utf8'));

const { fuseEvidence, FuseEvidence, clarifyDraft } = stage10;

function createBlankTemplate() {
  const draft = structuredClone(miniDraft);
  draft.assemblies[0].modules[0].dimensions.width_mm = { state: 'MISSING' };
  draft.assemblies[0].modules[0].dimensions.height_mm = { state: 'MISSING' };
  draft.assemblies[0].modules[0].dimensions.depth_mm = { state: 'MISSING' };
  draft.assemblies[0].modules[1].dimensions.width_mm = { state: 'MISSING' };
  draft.assemblies[0].modules[1].dimensions.height_mm = { state: 'MISSING' };
  draft.assemblies[0].modules[1].dimensions.depth_mm = { state: 'MISSING' };
  return draft;
}

test('Export check: fuseEvidence and FuseEvidence exported from index and fusion modules', () => {
  assert.equal(typeof fuseEvidence, 'function');
  assert.equal(typeof FuseEvidence, 'function');
  assert.equal(fuseEvidence, FuseEvidence);
  assert.equal(fuseEvidence, fusion.fuseEvidence);
});

test('A. USER_CONFIRMATION wins over lower-priority evidence', () => {
  const template = createBlankTemplate();
  const targetPath = 'assemblies[0].modules[0].dimensions.width_mm';

  const evidence = [
    {
      target_path: targetPath,
      value: 600,
      source_type: 'VISION_ENTITY',
      confidence: 0.8,
      state: 'ACTIVE',
      source_ref: 'IMG_01'
    },
    {
      target_path: targetPath,
      value: 700,
      source_type: 'IMAGE_TEXT',
      confidence: 0.9,
      state: 'ACTIVE',
      source_ref: 'IMG_02'
    },
    {
      target_path: targetPath,
      value: 733,
      source_type: 'USER_CONFIRMATION',
      confidence: 1.0,
      state: 'ACTIVE',
      source_ref: 'CONFIRM_USER'
    }
  ];

  const result = fuseEvidence(template, evidence);
  assert.equal(result.Ok, true);
  assert.equal(result.Issues.length, 0);

  const cell = result.Draft.assemblies[0].modules[0].dimensions.width_mm;
  assert.equal(cell.state, 'KNOWN');
  assert.equal(cell.value, 733);
  assert.equal(cell.source_type, 'USER_CONFIRMATION');
  assert.equal(cell.source_ref, 'CONFIRM_USER');
  assert.equal(cell.evidence_state, 'MANAGER_CONFIRMED');
});

test('B. USER_DIMENSION beats IMAGE_TEXT', () => {
  const template = createBlankTemplate();
  const targetPath = 'assemblies[0].modules[0].dimensions.width_mm';

  const evidence = [
    {
      target_path: targetPath,
      value: 700,
      source_type: 'IMAGE_TEXT',
      confidence: 0.9,
      state: 'ACTIVE',
      source_ref: 'IMG_TEXT_01'
    },
    {
      target_path: targetPath,
      value: 733,
      source_type: 'USER_DIMENSION',
      confidence: 1.0,
      state: 'ACTIVE',
      source_ref: 'NOTE_USER_DIM'
    }
  ];

  const result = fuseEvidence(template, evidence);
  assert.equal(result.Ok, true);
  const cell = result.Draft.assemblies[0].modules[0].dimensions.width_mm;
  assert.equal(cell.state, 'KNOWN');
  assert.equal(cell.value, 733);
  assert.equal(cell.source_type, 'USER_DIMENSION');
  assert.equal(cell.source_ref, 'NOTE_USER_DIM');
});

test('C. Same-priority agreement: two IMAGE_TEXT (600, 600) -> KNOWN without conflict', () => {
  const template = createBlankTemplate();
  const targetPath = 'assemblies[0].modules[0].dimensions.width_mm';

  const evidence = [
    {
      target_path: targetPath,
      value: 600,
      source_type: 'IMAGE_TEXT',
      confidence: 0.85,
      state: 'ACTIVE',
      source_ref: 'IMG_A'
    },
    {
      target_path: targetPath,
      value: 600,
      source_type: 'IMAGE_TEXT',
      confidence: 0.95,
      state: 'ACTIVE',
      source_ref: 'IMG_B'
    }
  ];

  const result = fuseEvidence(template, evidence);
  assert.equal(result.Ok, true);
  const cell = result.Draft.assemblies[0].modules[0].dimensions.width_mm;
  assert.equal(cell.state, 'KNOWN');
  assert.equal(cell.value, 600);
});

test('D. Same-priority conflict: two IMAGE_TEXT (600, 650) -> CONFLICT with both retained', () => {
  const template = createBlankTemplate();
  const targetPath = 'assemblies[0].modules[0].dimensions.width_mm';

  const evidence = [
    {
      target_path: targetPath,
      value: 600,
      source_type: 'IMAGE_TEXT',
      confidence: 0.9,
      state: 'ACTIVE',
      source_ref: 'IMG_A'
    },
    {
      target_path: targetPath,
      value: 650,
      source_type: 'IMAGE_TEXT',
      confidence: 0.85,
      state: 'ACTIVE',
      source_ref: 'IMG_B'
    }
  ];

  const result = fuseEvidence(template, evidence);
  assert.equal(result.Ok, true);
  const cell = result.Draft.assemblies[0].modules[0].dimensions.width_mm;
  assert.equal(cell.state, 'CONFLICT');
  assert.deepEqual(cell.options, [600, 650]);
});

test('E. DEFAULT_CANDIDATE only -> NEEDS_CONFIRMATION and not KNOWN', () => {
  const template = createBlankTemplate();
  const targetPath = 'assemblies[0].modules[0].dimensions.width_mm';

  const evidence = [
    {
      target_path: targetPath,
      value: 600,
      source_type: 'DEFAULT_CANDIDATE',
      confidence: 0.5,
      state: 'ACTIVE',
      source_ref: 'CATALOG_DEFAULT'
    }
  ];

  const result = fuseEvidence(template, evidence);
  assert.equal(result.Ok, true);
  const cell = result.Draft.assemblies[0].modules[0].dimensions.width_mm;
  assert.equal(cell.state, 'NEEDS_CONFIRMATION');
  assert.equal(cell.value, 600);
  assert.equal(cell.source_type, 'DEFAULT_CANDIDATE');
  assert.notEqual(cell.state, 'KNOWN');
});

test('F. Lower-priority evidence retained in source_refs provenance', () => {
  const template = createBlankTemplate();
  const targetPath = 'assemblies[0].modules[0].dimensions.width_mm';

  const evidence = [
    {
      target_path: targetPath,
      value: 600,
      source_type: 'DEFAULT_CANDIDATE',
      confidence: 0.5,
      state: 'ACTIVE',
      source_ref: 'REF_DEFAULT'
    },
    {
      target_path: targetPath,
      value: 700,
      source_type: 'IMAGE_TEXT',
      confidence: 0.85,
      state: 'ACTIVE',
      source_ref: 'REF_IMAGE'
    },
    {
      target_path: targetPath,
      value: 733,
      source_type: 'USER_DIMENSION',
      confidence: 1.0,
      state: 'ACTIVE',
      source_ref: 'REF_USER'
    }
  ];

  const result = fuseEvidence(template, evidence);
  assert.equal(result.Ok, true);
  const cell = result.Draft.assemblies[0].modules[0].dimensions.width_mm;
  assert.equal(cell.value, 733);
  assert.equal(cell.state, 'KNOWN');

  const refIds = result.Draft.source_refs.map(r => r.id);
  assert.ok(refIds.includes('REF_DEFAULT'), 'DEFAULT_CANDIDATE source_ref retained');
  assert.ok(refIds.includes('REF_IMAGE'), 'IMAGE_TEXT source_ref retained');
  assert.ok(refIds.includes('REF_USER'), 'USER_DIMENSION source_ref retained');
});

test('G. Unknown target_path produces deterministic issue without silent ignore', () => {
  const template = createBlankTemplate();
  const evidence = [
    {
      target_path: 'invalid.target.path.dimensions.width_mm',
      value: 600,
      source_type: 'USER_DIMENSION',
      confidence: 1.0,
      state: 'ACTIVE',
      source_ref: 'NOTE_01'
    }
  ];

  const result = fuseEvidence(template, evidence);
  assert.equal(result.Ok, false);
  assert.equal(result.Draft, null);
  assert.ok(result.Issues.length > 0);
  assert.ok(result.Issues.some(i => i.code === 'UNKNOWN_TARGET_PATH' || i.code === 'TARGET_PATH_NOT_FOUND'));
});

test('H. Input-order determinism produces byte-equivalent Unified Draft', () => {
  const template = createBlankTemplate();

  const evidence1 = [
    {
      target_path: 'assemblies[0].modules[0].dimensions.width_mm',
      value: 733,
      source_type: 'USER_DIMENSION',
      confidence: 1.0,
      state: 'ACTIVE',
      source_ref: 'REF_A'
    },
    {
      target_path: 'assemblies[0].modules[0].dimensions.width_mm',
      value: 700,
      source_type: 'IMAGE_TEXT',
      confidence: 0.9,
      state: 'ACTIVE',
      source_ref: 'REF_B'
    },
    {
      target_path: 'assemblies[0].modules[1].dimensions.width_mm',
      value: 600,
      source_type: 'DEFAULT_CANDIDATE',
      confidence: 0.5,
      state: 'ACTIVE',
      source_ref: 'REF_C'
    },
    {
      target_path: 'assemblies[0].modules[1].dimensions.height_mm',
      value: 720,
      source_type: 'IMAGE_TEXT',
      confidence: 0.8,
      state: 'ACTIVE',
      source_ref: 'REF_D'
    },
    {
      target_path: 'assemblies[0].modules[1].dimensions.height_mm',
      value: 750,
      source_type: 'IMAGE_TEXT',
      confidence: 0.8,
      state: 'ACTIVE',
      source_ref: 'REF_E'
    }
  ];

  const evidence2 = evidence1.slice().reverse();

  const result1 = fuseEvidence(template, evidence1);
  const result2 = fuseEvidence(template, evidence2);

  assert.equal(result1.Ok, true);
  assert.equal(result2.Ok, true);
  assert.strictEqual(JSON.stringify(result1.Draft), JSON.stringify(result2.Draft), 'Drafts must be byte-equivalent');
});

test('I. Custom numeric value 733 is preserved without normalization', () => {
  const template = createBlankTemplate();
  const evidence = [
    {
      target_path: 'assemblies[0].modules[0].dimensions.width_mm',
      value: 733,
      source_type: 'USER_DIMENSION',
      confidence: 1.0,
      state: 'ACTIVE',
      source_ref: 'NOTE_CUSTOM_733'
    }
  ];

  const result = fuseEvidence(template, evidence);
  assert.equal(result.Ok, true);
  const cell = result.Draft.assemblies[0].modules[0].dimensions.width_mm;
  assert.strictEqual(cell.value, 733);
});

test('J. Draft schema validation passes for successful Unified Draft', () => {
  const template = createBlankTemplate();
  const evidence = [
    {
      target_path: 'assemblies[0].modules[0].dimensions.width_mm',
      value: 733,
      source_type: 'USER_DIMENSION',
      confidence: 1.0,
      state: 'ACTIVE',
      source_ref: 'NOTE_USER'
    },
    {
      target_path: 'assemblies[0].modules[0].dimensions.height_mm',
      value: 720,
      source_type: 'IMAGE_TEXT',
      confidence: 0.9,
      state: 'ACTIVE',
      source_ref: 'IMG_EVIDENCE'
    },
    {
      target_path: 'assemblies[0].modules[1].dimensions.width_mm',
      value: 800,
      source_type: 'USER_DIMENSION',
      confidence: 1.0,
      state: 'ACTIVE',
      source_ref: 'NOTE_USER'
    }
  ];

  const result = fuseEvidence(template, evidence);
  assert.equal(result.Ok, true);

  const ajv = new Ajv2020({ strict: false, validateFormats: false });
  const validate = ajv.compile(draftSchema);
  const valid = validate(result.Draft);
  if (!valid) {
    console.error('Schema validation errors:', JSON.stringify(validate.errors, null, 2));
  }
  assert.ok(valid, 'Unified Draft must be valid according to DRAFT_CONFIGURATION_V1.schema.json');
});

test('K. Clarification compatibility', () => {
  const template = createBlankTemplate();
  const evidence = [
    {
      target_path: 'assemblies[0].modules[0].dimensions.width_mm',
      value: 733,
      source_type: 'USER_CONFIRMATION',
      confidence: 1.0,
      state: 'ACTIVE',
      source_ref: 'CONFIRM_01'
    },
    {
      target_path: 'assemblies[0].modules[0].dimensions.height_mm',
      value: 700,
      source_type: 'IMAGE_TEXT',
      confidence: 0.8,
      state: 'ACTIVE',
      source_ref: 'IMG_1'
    },
    {
      target_path: 'assemblies[0].modules[0].dimensions.height_mm',
      value: 720,
      source_type: 'IMAGE_TEXT',
      confidence: 0.8,
      state: 'ACTIVE',
      source_ref: 'IMG_2'
    },
    {
      target_path: 'assemblies[0].modules[1].dimensions.width_mm',
      value: 600,
      source_type: 'DEFAULT_CANDIDATE',
      confidence: 0.5,
      state: 'ACTIVE',
      source_ref: 'CATALOG_DEF'
    }
  ];

  const fused = fuseEvidence(template, evidence);
  assert.equal(fused.Ok, true);

  const clarification = clarifyDraft(fused.Draft);

  const knownPath = '$.assemblies[0].modules[0].dimensions.width_mm';
  assert.ok(clarification.Understood.some(u => u.Target_path === knownPath), 'KNOWN field in Understood');
  assert.ok(!clarification.Questions.some(q => q.Target_path === knownPath), 'KNOWN field not asked again in Questions');

  const conflictPath = '$.assemblies[0].modules[0].dimensions.height_mm';
  assert.ok(clarification.Conflicts.some(c => c.Target_path === conflictPath), 'CONFLICT in Conflicts');
  assert.ok(clarification.Blockers.some(b => b.Target_path === conflictPath), 'CONFLICT in Blockers');
  assert.ok(clarification.Questions.some(q => q.Target_path === conflictPath), 'CONFLICT in Questions');

  const defaultPath = '$.assemblies[0].modules[1].dimensions.width_mm';
  assert.ok(clarification.Default_candidates.some(d => d.Target_path === defaultPath), 'DEFAULT_CANDIDATE in Default_candidates');
  assert.ok(clarification.Questions.some(q => q.Target_path === defaultPath && q.Reason === 'CONFIRMATION_REQUIRED'), 'DEFAULT_CANDIDATE produces question for confirmation');
});

test('Input immutability: neither input draft nor evidenceItems is mutated', () => {
  const template = createBlankTemplate();
  const templateSnapshot = JSON.stringify(template);
  const evidence = [
    {
      target_path: 'assemblies[0].modules[0].dimensions.width_mm',
      value: 733,
      source_type: 'USER_DIMENSION',
      confidence: 1.0,
      state: 'ACTIVE',
      source_ref: 'NOTE_01'
    }
  ];
  const evidenceSnapshot = JSON.stringify(evidence);

  fuseEvidence(template, evidence);

  assert.strictEqual(JSON.stringify(template), templateSnapshot, 'Input draft must not be mutated');
  assert.strictEqual(JSON.stringify(evidence), evidenceSnapshot, 'Input evidenceItems must not be mutated');
});
