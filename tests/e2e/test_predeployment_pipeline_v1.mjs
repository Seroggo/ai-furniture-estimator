'use strict';

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import predeployment from '../../src/runtime/predeployment_pipeline_v1.js';
import stage10 from '../../src/input-understanding/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const appsRoot = resolve(root, 'apps-script');
const fixture = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const profile = fixture('config/construction/ALPHA_CONSTRUCTION_PROFILE_V1.json');
const benchmarkReference = fixture('fixtures/construction/BENCHMARK_REFERENCE_BASIS_KITCHEN_V1.json');
const scenarioADraft = fixture('fixtures/e2e/scenario_a_draft.json');
const scenarioAObservation = fixture('fixtures/e2e/scenario_a_vision_observation.json');
const scenarioCDraft = fixture('fixtures/e2e/scenario_c_draft.json');
const scenarioCObservation = fixture('fixtures/e2e/scenario_c_vision_observation.json');
const constructionDefaults = fixture('fixtures/e2e/construction_defaults_v1.json');
const prices = fixture('fixtures/e2e/prices_v1.json');
const { runPredeploymentPipelineV1 } = predeployment;

function provider(observation) { return { analyze() { return structuredClone(observation); } }; }
function baseOptions(observation, calculationId = 'CALC_E2E_001') {
  return {
    VisionProvider: provider(observation),
    ConstructionDefaults: structuredClone(constructionDefaults),
    PriceRows: structuredClone(prices),
    CalculationContext: {
      calculation_id: calculationId,
      timestamp: '2026-08-31T12:00:00.000Z',
      project_name: 'Predeployment E2E',
      manager: 'E2E',
      vision_model: 'deterministic-fixture',
      app_version: '1.0.0',
      schema_version: '1.0',
      construction_profile_version: 'alpha-basis-v1'
    },
    CostingOptions: { TargetCurrency: 'RUB' }
  };
}
function stageInput(draft, observation) {
  return { Stage10: { Draft: structuredClone(draft), Evidence: [], Vision: { Image_input: observation.source_ref }, Profile: structuredClone(profile), Benchmark_reference: structuredClone(benchmarkReference) } };
}
function runConfirmed(input, options) {
  const first = runPredeploymentPipelineV1(input, options);
  if (first.Status !== 'NEEDS_CLARIFICATION') return first;
  const questions = first.Stage10.Brief.Questions;
  const answers = questions.map((question) => {
    assert.ok(question.Options.length > 0, 'test fixture needs a value for ' + question.Target_path);
    return {Question_id: question.Question_id, Target_path: question.Target_path, Value: question.Options[0]};
  });
  const confirmedInput = structuredClone(input);
  confirmedInput.Stage10.Draft = structuredClone(first.Stage10.Draft);
  delete confirmedInput.Stage10.Vision;
  confirmedInput.Stage10.Confirmation_answers = answers;
  const confirmOptions = {...options};
  delete confirmOptions.VisionProvider;
  return runPredeploymentPipelineV1(confirmedInput, confirmOptions);
}

class FakeRange {
  constructor(sheet, row, column, rows, columns) { Object.assign(this, { sheet, row, column, rows, columns }); }
  getValues() { return Array.from({ length: this.rows }, (_, r) => Array.from({ length: this.columns }, (_, c) => this.sheet.read(this.row + r, this.column + c))); }
  getDisplayValues() { return this.getValues().map((row) => row.map((value) => value == null ? '' : String(value))); }
  setValues(values) { values.forEach((row, r) => row.forEach((value, c) => this.sheet.write(this.row + r, this.column + c, value))); return this; }
  clearContent() { for (let r = 0; r < this.rows; r += 1) for (let c = 0; c < this.columns; c += 1) this.sheet.write(this.row + r, this.column + c, null); return this; }
  clearDataValidations() { return this; }
  setDataValidation() { return this; }
  isBlank() { return this.getValues().flat().every((value) => value == null || value === ''); }
}
class FakeSheet {
  constructor(name) { this.name = name; this.grid = new Map(); this.hidden = new Set(); }
  key(r, c) { return `${r}:${c}`; }
  read(r, c) { return this.grid.has(this.key(r, c)) ? this.grid.get(this.key(r, c)) : null; }
  write(r, c, value) { if (value == null || value === '') this.grid.delete(this.key(r, c)); else this.grid.set(this.key(r, c), value); }
  getName() { return this.name; }
  getRange(r, c, rows, columns) { return new FakeRange(this, r, c, rows, columns); }
  getDataRange() { return this.getRange(1, 1, Math.max(this.getLastRow(), 1), Math.max(this.getLastColumn(), 1)); }
  getLastRow() { return Math.max(0, ...[...this.grid.keys()].map((key) => Number(key.split(':')[0]))); }
  getLastColumn() { return Math.max(0, ...[...this.grid.keys()].map((key) => Number(key.split(':')[1]))); }
  getMaxRows() { return Math.max(100, this.getLastRow()); }
  setFrozenRows() {}
  hideColumns(column) { this.hidden.add(column); }
  showColumns(column) { this.hidden.delete(column); }
}
class FakeSpreadsheet {
  constructor() { this.sheets = []; this.active = null; }
  getSheets() { return this.sheets; }
  getSheetByName(name) { return this.sheets.find((sheet) => sheet.name === name) || null; }
  insertSheet(name) { const sheet = new FakeSheet(name); this.sheets.push(sheet); return sheet; }
  setActiveSheet(sheet) { this.active = sheet; return sheet; }
  moveActiveSheet(index) { const current = this.sheets.indexOf(this.active); if (current >= 0) this.sheets.splice(current, 1); this.sheets.splice(index - 1, 0, this.active); }
}
function sheetsRuntime() {
  const spreadsheet = new FakeSpreadsheet();
  const SpreadsheetApp = {
    getActiveSpreadsheet: () => spreadsheet,
    newDataValidation: () => ({ setAllowInvalid() { return this; }, requireValueInList() { return this; }, requireCheckbox() { return this; }, requireNumberGreaterThanOrEqualTo() { return this; }, requireDate() { return this; }, build() { return {}; } })
  };
  const context = vm.createContext({ SpreadsheetApp });
  for (const file of ['generated/sheets_v1_manifest.gs', 'sheets_v1_setup.gs', 'sheets_v1_result_writer.gs']) vm.runInContext(readFileSync(resolve(appsRoot, file), 'utf8'), context, { filename: file });
  vm.runInContext('setupSheetsV1_(SpreadsheetApp.getActiveSpreadsheet())', context);
  return { spreadsheet, context };
}
function rows(sheet) { const last = sheet.getLastRow(); return last < 2 ? [] : sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getValues(); }

let happyResult;
test('A. happy path reaches COMPLETE and writes Sheets V1 twice correctly', () => {
  const input = stageInput(scenarioADraft, scenarioAObservation);
  const opts = baseOptions(scenarioAObservation);
  const inputBefore = JSON.stringify(input), defaultsBefore = JSON.stringify(opts.ConstructionDefaults), pricesBefore = JSON.stringify(opts.PriceRows);
  const clarification = runPredeploymentPipelineV1(input, opts);
  assert.equal(clarification.Status, 'NEEDS_CLARIFICATION');
  assert.equal(clarification.Sheets_bundle, null);
  happyResult = runConfirmed(input, opts);
  assert.equal(happyResult.Status, 'COMPLETE');
  assert.equal(happyResult.Stage10.Ok, true);
  assert.ok(happyResult.Confirmed_configuration);
  assert.ok(happyResult.Construction_result);
  assert.equal(happyResult.Costing.Status, 'COMPLETE');
  assert.equal(happyResult.Costing.Unresolved_lines.length, 0);
  assert.ok(happyResult.Sheets_bundle.BOM_LAST.length > 0);
  assert.equal(JSON.stringify(input), inputBefore);
  assert.equal(JSON.stringify(opts.ConstructionDefaults), defaultsBefore);
  assert.equal(JSON.stringify(opts.PriceRows), pricesBefore);
  const again = runConfirmed(input, opts);
  assert.equal(JSON.stringify(again), JSON.stringify(happyResult));

  const { spreadsheet, context } = sheetsRuntime();
  assert.equal(spreadsheet.getSheets().length, 5);
  context.bundle = happyResult.Sheets_bundle;
  vm.runInContext('writeSheetsV1Result_(SpreadsheetApp.getActiveSpreadsheet(), bundle)', context);
  const firstBom = rows(spreadsheet.getSheetByName('BOM_LAST'));
  assert.equal(firstBom.length, happyResult.Sheets_bundle.BOM_LAST.length);
  assert.equal(rows(spreadsheet.getSheetByName('CALC_LOG')).length, 1);
  assert.ok(rows(spreadsheet.getSheetByName('SYSTEM')).length > 0);

  const secondOptions = baseOptions(scenarioAObservation, 'CALC_E2E_002');
  const second = runConfirmed(input, secondOptions);
  context.bundle2 = second.Sheets_bundle;
  vm.runInContext('setupSheetsV1_(SpreadsheetApp.getActiveSpreadsheet()); writeSheetsV1Result_(SpreadsheetApp.getActiveSpreadsheet(), bundle2)', context);
  assert.equal(spreadsheet.getSheets().length, 5);
  const secondBom = rows(spreadsheet.getSheetByName('BOM_LAST'));
  const bomHeaders = spreadsheet.getSheetByName('BOM_LAST').getRange(1, 1, 1, spreadsheet.getSheetByName('BOM_LAST').getLastColumn()).getValues()[0];
  assert.ok(secondBom.every((row) => row[bomHeaders.indexOf('calculation_id')] === 'CALC_E2E_002'));
  assert.equal(rows(spreadsheet.getSheetByName('CALC_LOG')).length, 2);
  const system = rows(spreadsheet.getSheetByName('SYSTEM'));
  assert.ok(system.some((row) => row[0] === 'Calculation_id' && row[1] === 'CALC_E2E_002'));
  assert.ok(!system.some((row) => row[0] === 'Calculation_id' && row[1] === 'CALC_E2E_001'));
});

test('B. clarification stop prevents construction, costing, and bundle', () => {
  const result = runPredeploymentPipelineV1(stageInput(scenarioCDraft, scenarioCObservation), baseOptions(scenarioCObservation));
  assert.equal(result.Status, 'NEEDS_CLARIFICATION');
  assert.equal(result.Construction_result, null);
  assert.equal(result.Costing, null);
  assert.equal(result.Sheets_bundle, null);
});

test('C. default candidate is not KNOWN until explicit USER_CONFIRMATION and explicit value wins', () => {
  const firstPass = runPredeploymentPipelineV1(stageInput(scenarioADraft, scenarioAObservation), { ...baseOptions(scenarioAObservation), ConstructionDefaults: [], PriceRows: [] });
  const draftWithCandidate = structuredClone(firstPass.Stage10.Draft);
  draftWithCandidate.assemblies[0].modules[0].construction = {
    shelf_count: { state: 'NEEDS_CONFIRMATION', value: 1, source_type: 'DEFAULT_CANDIDATE', source_ref: 'DEFAULT_BASE_DOOR_SHELF', evidence_state: 'ALPHA_DEFAULT', note: 'Default candidate.' }
  };
  const clarification = stage10.clarifyDraft(draftWithCandidate);
  const brief = stage10.buildDynamicBrief(clarification);
  const first = { Stage10: { Draft: draftWithCandidate, Brief: brief } };
  const path = '$.assemblies[0].modules[0].construction.shelf_count';
  const question = first.Stage10.Brief.Questions.find((item) => item.Target_path === path);
  assert.ok(question);
  assert.deepEqual(question.Options, [1]);
  assert.equal(first.Stage10.Draft.assemblies[0].modules[0].construction.shelf_count.state, 'NEEDS_CONFIRMATION');
  const applied = stage10.applyConfirmationAnswers(first.Stage10.Draft, first.Stage10.Brief, [{ Question_id: question.Question_id, Target_path: path, Value: 1 }]);
  assert.equal(applied.Ok, true);
  assert.equal(applied.Draft.assemblies[0].modules[0].construction.shelf_count.source_type, 'USER_CONFIRMATION');
  assert.equal(applied.Evidence[0].source_type, 'USER_CONFIRMATION');
  const confirmed = stage10.buildConfirmedConfiguration(applied.Draft);
  assert.equal(confirmed.ok, true);
  assert.equal(confirmed.confirmed.assemblies[0].modules[0].construction.shelf_count, 1);

  const explicit = structuredClone(scenarioADraft);
  explicit.assemblies[0].modules[0].construction = { shelf_count: { state: 'KNOWN', value: 7, source_ref: 'NOTE_A', source_type: 'USER_TEXT', evidence_state: 'EXPLICIT', note: 'Explicit project shelf count.' } };
  const resolved = stage10.resolveConstructionDefaults(explicit, constructionDefaults);
  assert.equal(resolved.Default_candidates.some((item) => item.parameter === 'shelf_count'), false);
});

test('D. 733 mm width remains exact and deterministic through Construction Core', () => {
  const draft = structuredClone(scenarioADraft);
  draft.project_id = 'predeployment-733';
  draft.assemblies[0].overall_width_mm = 733;
  draft.assemblies[0].modules[0].dimensions.width_mm = { state: 'KNOWN', value: 733, source_ref: 'NOTE_A', source_type: 'USER_DIMENSION', evidence_state: 'EXPLICIT', note: 'Explicit 733 mm.' };
  const observation = structuredClone(scenarioAObservation);
  observation.visible_dimensions = observation.visible_dimensions.filter((item) => !item.target_path.endsWith('width_mm'));
  const result = runConfirmed(stageInput(draft, observation), baseOptions(observation, 'CALC_733'));
  assert.equal(result.Status, 'COMPLETE');
  assert.equal(result.Confirmed_configuration.assemblies[0].modules[0].width_mm, 733);
  const bottom = result.Construction_result.Parts.find((part) => part.Part_type === 'BOTTOM');
  assert.equal(bottom.Length_mm, 733 - 32);
  assert.equal(JSON.stringify(result), JSON.stringify(runConfirmed(stageInput(draft, observation), baseOptions(observation, 'CALC_733'))));
});
