import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const appsRoot = resolve(root, 'apps-script');

class FakeRange {
  constructor(sheet, row, column, numRows = 1, numColumns = 1) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.numRows = numRows;
    this.numColumns = numColumns;
  }
  getValues() {
    return Array.from({length: this.numRows}, (_, rowOffset) =>
      Array.from({length: this.numColumns}, (_, columnOffset) =>
        this.sheet.readValue(this.row + rowOffset, this.column + columnOffset)));
  }
  setValues(values) {
    assert.equal(values.length, this.numRows);
    values.forEach((row, rowOffset) => {
      row.forEach((value, columnOffset) => {
        this.sheet.writeValue(this.row + rowOffset, this.column + columnOffset, value);
      });
    });
    return this;
  }
  getDisplayValues() {
    return this.getValues().map((row) => row.map((value) => (
      value === null || value === undefined ? '' : String(value))));
  }
  clearContent() {
    for (let rowOffset = 0; rowOffset < this.numRows; rowOffset += 1) {
      for (let columnOffset = 0; columnOffset < this.numColumns; columnOffset += 1) {
        this.sheet.writeValue(this.row + rowOffset, this.column + columnOffset, null);
      }
    }
    return this;
  }
}

class FakeSheet {
  constructor(name) { this.name = name; this.grid = new Map(); }
  getName() { return this.name; }
  cellKey(row, column) { return `${row}:${column}`; }
  readValue(row, column) { return this.grid.has(this.cellKey(row, column)) ? this.grid.get(this.cellKey(row, column)) : null; }
  writeValue(row, column, value) {
    if (value === null || value === undefined || value === '') this.grid.delete(this.cellKey(row, column));
    else this.grid.set(this.cellKey(row, column), value);
  }
  getLastRow() {
    let r = 0;
    for (const key of this.grid.keys()) r = Math.max(r, Number(key.split(':')[0]));
    return r;
  }
  getLastColumn() {
    let c = 0;
    for (const key of this.grid.keys()) c = Math.max(c, Number(key.split(':')[1]));
    return c;
  }
  getRange(row, column, numRows = 1, numColumns = 1) {
    return new FakeRange(this, row, column, numRows, numColumns);
  }
}

class FakeSpreadsheet {
  constructor() { this.sheets = []; }
  getSheetByName(name) { return this.sheets.find((sheet) => sheet.getName() === name) || null; }
  insertSheet(name) { const sheet = new FakeSheet(name); this.sheets.push(sheet); return sheet; }
}

function loadHelpers() {
  const spreadsheet = new FakeSpreadsheet();
  const context = vm.createContext({
    SpreadsheetApp: {getActiveSpreadsheet: () => spreadsheet},
    console,
    getOpenRouterVisionModel_: () => 'openrouter/test-model',
    getSheetsV1Spreadsheet_: () => spreadsheet,
    PropertiesService: {getScriptProperties: () => ({getProperty: () => null})},
  });
  vm.runInContext(readFileSync(resolve(appsRoot, 'generated/sheets_v1_manifest.gs'), 'utf8'), context);
  vm.runInContext(readFileSync(resolve(appsRoot, 'generated/active_v1_runtime.gs'), 'utf8'), context);
  vm.runInContext(readFileSync(resolve(appsRoot, 'generated/active_v1_config.gs'), 'utf8'), context);
  vm.runInContext(readFileSync(resolve(appsRoot, 'active_v1_server.gs'), 'utf8'), context);
  return {spreadsheet, context};
}

function buildStage10Result() {
  return {
    Status: 'NEEDS_CLARIFICATION',
    Stage10: {
      Draft: {
        schema_version: 'draft-configuration-v1',
        project_id: 'web-v1-001',
        construction_profile_id: 'default',
        source_refs: [{id: 'WEB_TEXT', type: 'NOTE', file: 'web-request', note: 'note'}],
        global_dimensions: {},
        layout: {run_length_mm: 3000, run_shape: 'straight', zone: 'base'},
        layout_summary: {run_length_mm: 3000, run_shape: 'straight', zone: 'base'},
        assemblies: [{
            id: 'WEB_ASSEMBLY_1',
            kind: 'LINEAR_RUN',
            overall_width_mm: 3000,
            modules: [
              {
                id: 'WEB_MOD_1_1',
                module_type: 'BASE_CABINET',
                role: 'BASE_CABINET',
                dimensions: {
                  width_mm: {state: 'KNOWN', value: 600, source_ref: 'WEB_TEXT', source_type: 'USER_TEXT', evidence_state: 'EXPLICIT', note: 'ok'},
                  height_mm: {state: 'MISSING'},
                  depth_mm: {state: 'MISSING'},
                },
              },
              {
                id: 'WEB_MOD_1_2',
                module_type: 'BASE_CABINET',
                role: 'SINK_BASE',
                dimensions: {
                  width_mm: {state: 'KNOWN', value: 800, source_ref: 'WEB_TEXT', source_type: 'USER_TEXT', evidence_state: 'EXPLICIT', note: 'ok'},
                  height_mm: {state: 'NEEDS_CONFIRMATION', value: 850, source_ref: 'PARSER_INFERENCE', source_type: 'DEFAULT_CANDIDATE', evidence_state: 'VISUAL_INFERRED', note: 'inferred'},
                  depth_mm: {state: 'MISSING'},
                },
              },
            ],
            openings: [],
            non_carcass_surfaces: [],
            notes: [],
          }],
      },
      Brief: {
        Questions: [
          {Question_id: 'Q_W1', Target_path: 'assemblies[0].modules[0].dimensions.depth_mm', Reason: 'FIELD_REQUIRED', Options: [], Default_value: null},
          {Question_id: 'Q_H2', Target_path: 'assemblies[0].modules[1].dimensions.height_mm', Reason: 'CONFIRMATION_REQUIRED', Options: [850], Default_value: 850},
        ],
        Defaults_to_confirm: [],
      },
    },
    Costing: {Totals: {}, Currency: 'RUB'},
    Sheets_bundle: {BOM_LAST: []},
  };
}

test('activeV1HumanLabel_ formats assembly module dimension paths with friendly Russian label', () => {
  const {context} = loadHelpers();
  const label = vm.runInContext('activeV1HumanLabel_(\'assemblies[0].modules[0].dimensions.depth_mm\')', context);
  assert.equal(label, 'Глубина модуля 1, мм');
  const width = vm.runInContext('activeV1HumanLabel_(\'assemblies[0].modules[1].dimensions.width_mm\')', context);
  assert.equal(width, 'Ширина модуля 2, мм');
  const height = vm.runInContext('activeV1HumanLabel_(\'assemblies[0].modules[0].dimensions.height_mm\')', context);
  assert.equal(height, 'Высота модуля 1, мм');
});

test('activeV1HumanLabel_ returns empty string for unknown target path', () => {
  const {context} = loadHelpers();
  const unknown = vm.runInContext('activeV1HumanLabel_(\'unknown.field\')', context);
  assert.equal(unknown, '');
});

test('activeV1KnownFacts_ lists only KNOWN facts already present in the Draft', () => {
  const {context} = loadHelpers();
  context.draft = buildStage10Result().Stage10.Draft;
  const facts = vm.runInContext('activeV1KnownFacts_(draft)', context);
  const labels = facts.map((fact) => fact.label);
  assert.ok(labels.includes('Длина стены'));
  assert.ok(labels.includes('Форма кухни'));
  assert.ok(labels.includes('Зона'));
  assert.ok(labels.includes('Ширина модуля 1'));
  assert.ok(labels.includes('Ширина модуля 2'));
  assert.ok(labels.includes('Тип модуля 1'));
  assert.ok(labels.includes('Тип модуля 2'));
  const heightFacts = facts.filter((fact) => fact.label.startsWith('Высота модуля'));
  assert.equal(heightFacts.length, 0, 'Heights must not appear because they are not KNOWN.');
});

test('activeV1ResultView_ emits human_label, understood_summary, and value_kind without changing target_path', () => {
  const {context} = loadHelpers();
  context.requestId = 'TEST_REQ_001';
  context.result = buildStage10Result();
  context.writeResult = null;
  context.visionModel = null;
  const view = vm.runInContext(
    'activeV1ResultView_(requestId, result, writeResult, visionModel)',
    context,
  );
  const questions = view.questions;
  const depth = questions.find((q) => q.question_id === 'Q_W1');
  assert.equal(depth.target_path, 'assemblies[0].modules[0].dimensions.depth_mm');
  assert.equal(depth.human_label, 'Глубина модуля 1, мм');
  assert.equal(depth.value_kind, 'USER_INPUT');

  const height = questions.find((q) => q.question_id === 'Q_H2');
  assert.equal(height.target_path, 'assemblies[0].modules[1].dimensions.height_mm');
  assert.equal(height.human_label, 'Высота модуля 2, мм');
  assert.equal(height.value_kind, 'CANDIDATE');
  assert.equal(height.default_value, 850);

  assert.ok(Array.isArray(view.understood_summary) && view.understood_summary.length > 0);
  const summaryLabels = view.understood_summary.map((fact) => fact.label);
  assert.ok(summaryLabels.includes('Длина стены'));
  assert.ok(summaryLabels.includes('Ширина модуля 1'));
});

test('Machine target path is preserved verbatim for Stage 10 confirmation', () => {
  const {context} = loadHelpers();
  context.requestId = 'TEST_REQ_002';
  context.result = buildStage10Result();
  context.writeResult = null;
  context.visionModel = null;
  const view = vm.runInContext(
    'activeV1ResultView_(requestId, result, writeResult, visionModel)',
    context,
  );
  for (const question of view.questions) {
    assert.equal(typeof question.target_path, 'string');
    assert.ok(question.target_path.startsWith('assemblies['));
  }
});

test('Web App human label test: human_label is shown and machine path is not visible to user', () => {
  const {context} = loadHelpers();
  context.requestId = 'TEST_REQ_003';
  context.result = buildStage10Result();
  context.writeResult = null;
  context.visionModel = null;
  const view = vm.runInContext(
    'activeV1ResultView_(requestId, result, writeResult, visionModel)',
    context,
  );
  const labelsOnly = view.questions.map((q) => q.human_label);
  for (const text of labelsOnly) {
    assert.ok(!text.includes('$.'), 'Machine JSON path must not leak into human_label: ' + text);
    assert.ok(!text.includes('assemblies['), 'Machine path must not leak into human_label: ' + text);
  }
});

test('Web App understood list test: facts are human-readable and contain layout + KNOWN dimensions only', () => {
  const {context} = loadHelpers();
  context.requestId = 'TEST_REQ_004';
  context.result = buildStage10Result();
  context.writeResult = null;
  context.visionModel = null;
  const view = vm.runInContext(
    'activeV1ResultView_(requestId, result, writeResult, visionModel)',
    context,
  );
  for (const fact of view.understood_summary) {
    assert.equal(typeof fact.label, 'string');
    assert.equal(typeof fact.value, 'string');
    assert.ok(fact.label.length > 0);
    assert.ok(!fact.label.includes('$.'), 'Understood fact labels must not include machine paths: ' + fact.label);
  }
});

test('Candidate value test: CANDIDATE questions carry value_kind=CANDIDATE for explicit UI marking', () => {
  const {context} = loadHelpers();
  context.requestId = 'TEST_REQ_005';
  context.result = buildStage10Result();
  context.writeResult = null;
  context.visionModel = null;
  const view = vm.runInContext(
    'activeV1ResultView_(requestId, result, writeResult, visionModel)',
    context,
  );
  const candidates = view.questions.filter((q) => q.value_kind === 'CANDIDATE');
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].default_value, 850);
  const inputs = view.questions.filter((q) => q.value_kind === 'USER_INPUT');
  assert.equal(inputs.length, 1);
  assert.equal(inputs[0].default_value, null);
});