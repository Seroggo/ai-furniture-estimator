'use strict';

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import stage10 from '../../src/input-understanding/index.js';
import pipelineModule from '../../src/input-understanding/pipeline.js';
import visionModule from '../../src/input-understanding/vision.js';
import core from '../../src/construction-core/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const taskRoot = resolve(root, 'config/construction');
const e2eFixturesRoot = resolve(root, 'fixtures/e2e');

const profile = JSON.parse(readFileSync(resolve(taskRoot, 'ALPHA_CONSTRUCTION_PROFILE_V1.json'), 'utf8'));
const benchmarkReference = JSON.parse(readFileSync(resolve(root, 'fixtures/construction/BENCHMARK_REFERENCE_BASIS_KITCHEN_V1.json'), 'utf8'));
const goldenConfirmed = JSON.parse(readFileSync(resolve(root, 'fixtures/construction/GOLDEN_INPUT_KITCHEN_2025-04-01.json'), 'utf8'));

const scenarioADraft = JSON.parse(readFileSync(resolve(e2eFixturesRoot, 'scenario_a_draft.json'), 'utf8'));
const scenarioAObservation = JSON.parse(readFileSync(resolve(e2eFixturesRoot, 'scenario_a_vision_observation.json'), 'utf8'));
const scenarioBDraft = JSON.parse(readFileSync(resolve(e2eFixturesRoot, 'scenario_b_draft.json'), 'utf8'));
const scenarioBObservation = JSON.parse(readFileSync(resolve(e2eFixturesRoot, 'scenario_b_vision_observation.json'), 'utf8'));
const scenarioCDraft = JSON.parse(readFileSync(resolve(e2eFixturesRoot, 'scenario_c_draft.json'), 'utf8'));
const scenarioCObservation = JSON.parse(readFileSync(resolve(e2eFixturesRoot, 'scenario_c_vision_observation.json'), 'utf8'));

const { runStage10Pipeline, RunStage10Pipeline } = pipelineModule;
const { recognizeImage } = visionModule;

function makeProvider(observation) {
  return {
    analyze() {
      return observation;
    }
  };
}

function visionInputFor(observation, sourceRef) {
  return {
    Image_input: sourceRef || observation.source_ref,
    Provider: makeProvider(observation)
  };
}

function knownCell(value, sourceRef, sourceType, evidenceState, note) {
  return {
    state: 'KNOWN',
    value,
    source_ref: sourceRef,
    source_type: sourceType,
    evidence_state: evidenceState,
    note
  };
}

function draftFromConfirmed(confirmed) {
  const draft = {
    schema_version: 'draft-configuration-v1',
    project_id: confirmed.project_id,
    construction_profile_id: confirmed.construction_profile_id,
    source_refs: confirmed.source_refs.map((r) => ({ ...r })),
    global_dimensions: { ...confirmed.global_dimensions },
    assemblies: []
  };
  for (const assembly of confirmed.assemblies) {
    const draftAssembly = {
      id: assembly.id,
      kind: assembly.kind,
      overall_width_mm: assembly.overall_width_mm === null ? undefined : assembly.overall_width_mm,
      overall_depth_mm: assembly.overall_depth_mm === null ? undefined : assembly.overall_depth_mm,
      finished_height_mm: assembly.finished_height_mm === null ? undefined : assembly.finished_height_mm,
      modules: [],
      openings: assembly.openings || [],
      non_carcass_surfaces: (assembly.non_carcass_surfaces || []).map((s) => ({
        ...s,
        thickness_mm: s.thickness_mm === null || s.thickness_mm === undefined ? 40 : s.thickness_mm
      }))
    };
    if (assembly.notes !== undefined) draftAssembly.notes = [...assembly.notes];
    for (const module_ of assembly.modules) {
      const dimEvidenceByField = {};
      for (const ev of module_.dimension_evidence || []) {
        dimEvidenceByField[ev.field] = ev;
      }
      const makeCell = (field, value) => {
        const ev = dimEvidenceByField[field];
        const evidenceState = ev ? ev.state : 'EXPLICIT';
        const sourceRef = ev ? ev.source_ref : 'MANUAL_ALPHA';
        const note = ev ? ev.note : 'Carried from golden confirmed configuration.';
        return knownCell(value, sourceRef, 'USER_DIMENSION', evidenceState, note);
      };
      const draftModule = {
        id: module_.id,
        module_type: module_.module_type,
        role: module_.role,
        x_mm: module_.x_mm,
        dimensions: {
          width_mm: makeCell('width_mm', module_.width_mm),
          height_mm: makeCell('height_mm', module_.height_mm),
          depth_mm: makeCell('depth_mm', module_.depth_mm)
        },
        fronts: module_.fronts.map((f) => ({ ...f })),
        appliance_slots: module_.appliance_slots.map((s) => ({ ...s }))
      };
      if (module_.y_mm !== undefined) draftModule.y_mm = module_.y_mm;
      if (module_.quantity !== undefined) draftModule.quantity = module_.quantity;
      if (module_.notes !== undefined) draftModule.notes = [...module_.notes];
      draftAssembly.modules.push(draftModule);
    }
    draft.assemblies.push(draftAssembly);
  }
  return draft;
}

test('Export check: runStage10Pipeline and RunStage10Pipeline exported from pipeline module and index', () => {
  assert.equal(typeof runStage10Pipeline, 'function');
  assert.equal(runStage10Pipeline, RunStage10Pipeline);
  assert.equal(typeof stage10.runStage10Pipeline, 'function');
  assert.equal(typeof stage10.RunStage10Pipeline, 'function');
  assert.equal(stage10.runStage10Pipeline, runStage10Pipeline);
});

test('I. Existing Stage 10.1-10.6 APIs remain compatible', () => {
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
  assert.equal(typeof stage10.runConstructionFromDraft, 'function');
  assert.equal(typeof stage10.RunConstructionFromDraft, 'function');
});

test('A. Scenario A (image + dimensions + description) reaches Construction Core', () => {
  const input = {
    Draft: structuredClone(scenarioADraft),
    Evidence: [],
    Vision: visionInputFor(structuredClone(scenarioAObservation), scenarioAObservation.source_ref),
    Profile: structuredClone(profile),
    Benchmark_reference: structuredClone(benchmarkReference)
  };
  const result = runStage10Pipeline(input);

  assert.equal(result.Ok, true, JSON.stringify(result.Issues));
  assert.ok(result.Construction_result, 'construction result present');
  assert.ok(result.Confirmed_configuration, 'confirmed configuration present');
  assert.equal(result.Confirmed_configuration.assemblies[0].modules[0].width_mm, 600);
  assert.equal(result.Confirmed_configuration.assemblies[0].modules[0].height_mm, 720);
  assert.equal(result.Confirmed_configuration.assemblies[0].modules[0].depth_mm, 560);

  const r = result.Construction_result;
  for (const key of ['Project', 'Parts', 'Materials', 'Materials_by_component', 'Edge', 'Edge_by_component', 'Part_count_by_component', 'Hardware', 'Manufacturing_features', 'Issues', 'Benchmark']) {
    assert.ok(key in r, `missing canonical section ${key}`);
  }
});

test('B. Scenario B first pass: brief/blockers present, no construction result', () => {
  const input = {
    Draft: structuredClone(scenarioBDraft),
    Evidence: [],
    Vision: visionInputFor(structuredClone(scenarioBObservation), scenarioBObservation.source_ref),
    Profile: structuredClone(profile),
    Benchmark_reference: structuredClone(benchmarkReference)
  };
  const result = runStage10Pipeline(input);

  assert.equal(result.Ok, false, 'first pass must be blocked');
  assert.equal(result.Construction_result, null);
  assert.ok(result.Brief, 'brief present');
  assert.ok(result.Brief.Blockers && result.Brief.Blockers.length > 0, 'blockers present');
  const widthPath = '$.assemblies[0].modules[0].dimensions.width_mm';
  assert.ok(result.Brief.Questions.some((q) => q.Target_path === widthPath && q.Reason === 'CONFIRMATION_REQUIRED'), 'width confirmation question present');
});

test('C. Scenario B after confirmation answers reaches Construction Core', () => {
  const firstInput = {
    Draft: structuredClone(scenarioBDraft),
    Evidence: [],
    Vision: visionInputFor(structuredClone(scenarioBObservation), scenarioBObservation.source_ref),
    Profile: structuredClone(profile),
    Benchmark_reference: structuredClone(benchmarkReference)
  };
  const firstResult = runStage10Pipeline(firstInput);
  assert.equal(firstResult.Ok, false);

  const widthPath = '$.assemblies[0].modules[0].dimensions.width_mm';
  const q = firstResult.Brief.Questions.find((qq) => qq.Target_path === widthPath);
  assert.ok(q, 'width confirmation question present on first pass');

  const secondInput = {
    Draft: structuredClone(scenarioBDraft),
    Evidence: [],
    Vision: visionInputFor(structuredClone(scenarioBObservation), scenarioBObservation.source_ref),
    Confirmation_answers: [
      { Question_id: q.Question_id, Target_path: widthPath, Value: 600 }
    ],
    Profile: structuredClone(profile),
    Benchmark_reference: structuredClone(benchmarkReference)
  };
  const result = runStage10Pipeline(secondInput);

  assert.equal(result.Ok, true, JSON.stringify(result.Issues));
  assert.ok(result.Construction_result, 'construction result present after answers');
  assert.ok(result.Confirmed_configuration);
  assert.equal(result.Confirmed_configuration.assemblies[0].modules[0].width_mm, 600);
  assert.equal(result.Confirmed_configuration.assemblies[0].modules[0].height_mm, 720);
  assert.equal(result.Confirmed_configuration.assemblies[0].modules[0].depth_mm, 560);
});

test('D. Scenario C (image only) produces structured brief and no construction result', () => {
  const input = {
    Draft: structuredClone(scenarioCDraft),
    Evidence: [],
    Vision: visionInputFor(structuredClone(scenarioCObservation), scenarioCObservation.source_ref),
    Profile: structuredClone(profile),
    Benchmark_reference: structuredClone(benchmarkReference)
  };
  const result = runStage10Pipeline(input);

  assert.equal(result.Ok, false, 'image-only scenario must not reach construction');
  assert.equal(result.Construction_result, null);
  assert.ok(result.Brief, 'brief present');
  assert.ok(Array.isArray(result.Brief.Questions));
  assert.ok(result.Brief.Blockers && result.Brief.Blockers.length > 0, 'width blocker present (required field missing)');
  const widthPath = '$.assemblies[0].modules[0].dimensions.width_mm';
  assert.ok(result.Brief.Blockers.some((b) => b.Target_path === widthPath), 'width blocker recorded');
  assert.ok(result.Evidence.length > 0, 'vision evidence captured');
  assert.ok(result.Draft, 'draft present');
  assert.ok(result.Clarification, 'clarification present');
});

test('E. Golden regression: pipeline Construction Core matches canonical Construction Core output', () => {
  const goldenDraft = draftFromConfirmed(goldenConfirmed);
  const input = {
    Draft: structuredClone(goldenDraft),
    Evidence: [],
    Profile: structuredClone(profile),
    Benchmark_reference: structuredClone(benchmarkReference)
  };
  const result = runStage10Pipeline(input);

  assert.equal(result.Ok, true, JSON.stringify(result.Issues));
  assert.ok(result.Construction_result, 'golden pipeline must reach construction core');
  assert.ok(result.Confirmed_configuration, 'golden confirmed configuration present');

  const canonical = core.calculateConstructionCore(
    structuredClone(goldenConfirmed),
    structuredClone(profile),
    structuredClone(benchmarkReference)
  );

  assert.deepEqual(result.Construction_result.Materials, canonical.Materials, 'Materials match canonical');
  assert.deepEqual(result.Construction_result.Materials_by_component, canonical.Materials_by_component, 'Materials_by_component match canonical');
  assert.deepEqual(result.Construction_result.Edge, canonical.Edge, 'Edge matches canonical');
  assert.deepEqual(result.Construction_result.Hardware, canonical.Hardware, 'Hardware matches canonical');
  assert.deepEqual(result.Construction_result.Benchmark, canonical.Benchmark, 'Benchmark matches canonical');
  assert.deepEqual(result.Construction_result.Parts, canonical.Parts, 'Parts match canonical');
  assert.deepEqual(result.Construction_result, canonical, 'full construction result matches canonical byte-equivalent');
});

test('F. Width 733 preserved end-to-end through pipeline into generated geometry', () => {
  const baseDraft = {
    schema_version: 'draft-configuration-v1',
    project_id: 'e2e-width-733',
    construction_profile_id: 'alpha-basis-v1',
    source_refs: [
      { id: 'NOTE_733', type: 'NOTE', file: 'note733.md', note: 'Custom width 733 note.' }
    ],
    global_dimensions: {
      finished_worktop_height_mm: 910,
      toe_kick_height_mm: 100,
      countertop_thickness_mm: 40
    },
    assemblies: [
      {
        id: 'ASM_733',
        kind: 'LINEAR_RUN',
        overall_width_mm: 733,
        overall_depth_mm: 600,
        finished_height_mm: 910,
        modules: [
          {
            id: 'mod-733',
            module_type: 'BASE_CABINET',
            role: 'GENERAL_STORAGE',
            x_mm: 0,
            y_mm: 100,
            dimensions: {
              width_mm: knownCell(733, 'NOTE_733', 'USER_DIMENSION', 'EXPLICIT', 'Custom width 733 mm from user.'),
              height_mm: knownCell(770, 'NOTE_733', 'DEFAULT_CANDIDATE', 'ALPHA_DEFAULT', 'Alpha default height.'),
              depth_mm: knownCell(560, 'NOTE_733', 'DEFAULT_CANDIDATE', 'ALPHA_DEFAULT', 'Alpha default depth.')
            },
            fronts: [
              { kind: 'HINGED_DOOR', count: 1, width_mm: 733, height_mm: 730, evidence_state: 'EXPLICIT' }
            ],
            appliance_slots: [],
            notes: ['733 width module']
          }
        ],
        openings: [],
        non_carcass_surfaces: []
      }
    ]
  };

  const input = {
    Draft: structuredClone(baseDraft),
    Evidence: [],
    Profile: structuredClone(profile),
    Benchmark_reference: structuredClone(benchmarkReference)
  };
  const result = runStage10Pipeline(input);

  assert.equal(result.Ok, true, JSON.stringify(result.Issues));
  assert.ok(result.Construction_result);
  assert.equal(result.Confirmed_configuration.assemblies[0].modules[0].width_mm, 733);
  assert.equal(result.Draft.assemblies[0].modules[0].dimensions.width_mm.value, 733);

  const parts = result.Construction_result.Parts;
  const bottom = parts.find((p) => p.Module_id === 'mod-733' && p.Part_type === 'BOTTOM');
  assert.ok(bottom, 'BOTTOM part exists');
  assert.equal(bottom.Length_mm, 733 - core.RULES.dimensions.horizontal_width_reduction_mm);
});

test('G. Determinism: identical full input twice -> byte-equivalent pipeline result', () => {
  const buildInput = () => ({
    Draft: structuredClone(scenarioADraft),
    Evidence: [],
    Vision: visionInputFor(structuredClone(scenarioAObservation), scenarioAObservation.source_ref),
    Profile: structuredClone(profile),
    Benchmark_reference: structuredClone(benchmarkReference)
  });
  const a = runStage10Pipeline(buildInput());
  const b = runStage10Pipeline(buildInput());
  assert.strictEqual(JSON.stringify(a), JSON.stringify(b), 'byte-equivalent pipeline result');
});

test('H. Input immutability: pipeline does not mutate any input field', () => {
  const input = {
    Draft: structuredClone(scenarioADraft),
    Evidence: [],
    Vision: visionInputFor(structuredClone(scenarioAObservation), scenarioAObservation.source_ref),
    Profile: structuredClone(profile),
    Benchmark_reference: structuredClone(benchmarkReference)
  };
  const before = JSON.stringify(input);
  runStage10Pipeline(input);
  assert.strictEqual(JSON.stringify(input), before, 'input unchanged after pipeline run');

  const inputB = {
    Draft: structuredClone(scenarioBDraft),
    Evidence: [],
    Vision: visionInputFor(structuredClone(scenarioBObservation), scenarioBObservation.source_ref),
    Confirmation_answers: [
      { Question_id: 'q_assemblies_0_modules_0_dimensions_width_mm_confirmation_required', Target_path: '$.assemblies[0].modules[0].dimensions.width_mm', Value: 600 }
    ],
    Profile: structuredClone(profile),
    Benchmark_reference: structuredClone(benchmarkReference)
  };
  const beforeB = JSON.stringify(inputB);
  runStage10Pipeline(inputB);
  assert.strictEqual(JSON.stringify(inputB), beforeB, 'input with confirmation_answers unchanged after pipeline run');
});

test('J. Pipeline result contains all canonical intermediate sections', () => {
  const input = {
    Draft: structuredClone(scenarioADraft),
    Evidence: [],
    Vision: visionInputFor(structuredClone(scenarioAObservation), scenarioAObservation.source_ref),
    Profile: structuredClone(profile),
    Benchmark_reference: structuredClone(benchmarkReference)
  };
  const result = runStage10Pipeline(input);

  for (const key of ['Ok', 'Evidence', 'Draft', 'Clarification', 'Brief', 'Confirmation_result', 'Confirmed_configuration', 'Construction_result', 'Issues']) {
    assert.ok(key in result, `pipeline result missing canonical section ${key}`);
  }
  assert.ok(Array.isArray(result.Evidence), 'Evidence is array');
  assert.ok(result.Draft && typeof result.Draft === 'object', 'Draft present');
  assert.ok(result.Clarification && typeof result.Clarification === 'object', 'Clarification present');
  assert.ok(result.Brief && typeof result.Brief === 'object', 'Brief present');
  assert.ok(result.Confirmed_configuration && typeof result.Confirmed_configuration === 'object', 'Confirmed_configuration present');
  assert.ok(result.Construction_result && typeof result.Construction_result === 'object', 'Construction_result present');
  assert.ok(Array.isArray(result.Issues), 'Issues is array');
});