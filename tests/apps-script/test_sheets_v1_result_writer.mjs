import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import CostingV1 from '../../src/costing/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const appsRoot = resolve(root, 'apps-script');
const goldenResult = JSON.parse(
  readFileSync(resolve(root, 'fixtures/construction/golden_kitchen_result.json'), 'utf8')
);

class FakeRange {
  constructor(sheet, row, column, numRows, numColumns) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.numRows = numRows;
    this.numColumns = numColumns;
  }

  getValues() {
    const rows = [];
    for (let r = 0; r < this.numRows; r += 1) {
      const cells = [];
      for (let c = 0; c < this.numColumns; c += 1) {
        cells.push(this.sheet.readValue(this.row + r, this.column + c));
      }
      rows.push(cells);
    }
    return rows;
  }

  getDisplayValues() {
    return this.getValues().map((row) =>
      row.map((cell) => (cell === null || cell === undefined ? '' : String(cell)))
    );
  }

  setValues(values) {
    assert.equal(this.numRows, values.length, `${this.sheet.name}: setValues row count mismatch`);
    for (let r = 0; r < this.numRows; r += 1) {
      assert.equal(this.numColumns, values[r].length, `${this.sheet.name}: setValues col count mismatch`);
      for (let c = 0; c < this.numColumns; c += 1) {
        this.sheet.writeValue(this.row + r, this.column + c, values[r][c]);
      }
    }
  }

  clearContent() {
    for (let r = 0; r < this.numRows; r += 1) {
      for (let c = 0; c < this.numColumns; c += 1) {
        this.sheet.writeValue(this.row + r, this.column + c, null);
      }
    }
  }

  clearDataValidations() {}
  setDataValidation() {}
  isBlank() {
    for (let r = 0; r < this.numRows; r += 1) {
      for (let c = 0; c < this.numColumns; c += 1) {
        const val = this.sheet.readValue(this.row + r, this.column + c);
        if (val !== null && val !== undefined && val !== '') return false;
      }
    }
    return true;
  }
}

class FakeSheet {
  constructor(name) {
    this.name = name;
    this.grid = new Map();
    this.frozenRows = 0;
    this.hiddenColumns = new Set();
    this.validations = new Map();
  }

  getName() { return this.name; }
  getFrozenRows() { return this.frozenRows; }
  setFrozenRows(n) { this.frozenRows = n; }
  hideColumns(c) { this.hiddenColumns.add(c); }
  showColumns(c) { this.hiddenColumns.delete(c); }

  cellKey(row, col) { return `${row}:${col}`; }

  readValue(row, col) {
    return this.grid.has(this.cellKey(row, col)) ? this.grid.get(this.cellKey(row, col)) : null;
  }

  writeValue(row, col, value) {
    if (value === null || value === undefined || value === '') {
      this.grid.delete(this.cellKey(row, col));
    } else {
      this.grid.set(this.cellKey(row, col), value);
    }
  }

  getLastRow() {
    let max = 0;
    for (const key of this.grid.keys()) {
      const [r] = key.split(':').map(Number);
      if (r > max) max = r;
    }
    return max;
  }

  getLastColumn() {
    let max = 0;
    for (const key of this.grid.keys()) {
      const [, c] = key.split(':').map(Number);
      if (c > max) max = c;
    }
    return max;
  }

  getMaxRows() { return Math.max(100, this.getLastRow()); }
  getMaxColumns() { return Math.max(26, this.getLastColumn()); }

  getRange(row, column, numRows, numColumns) {
    return new FakeRange(this, row, column, numRows, numColumns);
  }

  getDataRange() {
    return new FakeRange(
      this,
      1,
      1,
      Math.max(this.getLastRow(), 1),
      Math.max(this.getLastColumn(), 1)
    );
  }
}

class FakeSpreadsheet {
  constructor() {
    this.sheets = [];
    this.activeSheet = null;
  }

  getSheets() { return this.sheets; }
  getSheetByName(name) { return this.sheets.find((s) => s.getName() === name) || null; }
  insertSheet(name) {
    const sheet = new FakeSheet(name);
    this.sheets.push(sheet);
    return sheet;
  }
  setActiveSheet(sheet) { this.activeSheet = sheet; return sheet; }
  moveActiveSheet() { return this.activeSheet; }
}

function createRuntime() {
  const spreadsheet = new FakeSpreadsheet();
  const SpreadsheetApp = {
    getActiveSpreadsheet() { return spreadsheet; },
    newDataValidation() {
      return {
        setAllowInvalid() { return this; },
        requireValueInList() { return this; },
        requireCheckbox() { return this; },
        requireNumberGreaterThanOrEqualTo() { return this; },
        requireDate() { return this; },
        build() { return {}; }
      };
    },
    flush() {}
  };
  const context = vm.createContext({ SpreadsheetApp });

  vm.runInContext(
    readFileSync(resolve(appsRoot, 'generated/sheets_v1_manifest.gs'), 'utf8'),
    context,
    { filename: 'generated/sheets_v1_manifest.gs' }
  );
  vm.runInContext(
    readFileSync(resolve(appsRoot, 'sheets_v1_setup.gs'), 'utf8'),
    context,
    { filename: 'sheets_v1_setup.gs' }
  );
  vm.runInContext(
    readFileSync(resolve(appsRoot, 'sheets_v1_result_writer.gs'), 'utf8'),
    context,
    { filename: 'sheets_v1_result_writer.gs' }
  );

  return { spreadsheet, context };
}

function makeSampleBundle() {
  const priceRows = [
    {
      category: 'MATERIALS',
      name: 'LDSP 16mm White',
      unit: 'm2',
      price: 650,
      currency: 'RUB',
      article: 'LDSP_16_ALPHA',
      active: true,
      item_id: 'MAT_LDSP_16_ALPHA'
    },
    {
      category: 'EDGE',
      name: 'Edge 19x1mm White',
      unit: 'm',
      price: 45,
      currency: 'RUB',
      article: 'EDGE_19x1_ALPHA',
      active: true,
      item_id: 'EDGE_19x1_ALPHA'
    },
    {
      category: 'HARDWARE',
      name: 'Hinge Standard',
      unit: 'pcs',
      price: 180,
      currency: 'RUB',
      article: 'HINGES',
      active: true,
      item_id: 'HW_HINGES'
    }
  ];
  const snapshot = CostingV1.buildPriceSnapshot(priceRows, {
    TargetCurrency: 'RUB',
    created_at: '2026-08-31T12:00:00.000Z'
  });
  const costing = CostingV1.calculateCosting(goldenResult, snapshot);
  const calculationContext = {
    calculation_id: 'CALC_TEST_001',
    timestamp: '2026-08-31T12:00:00.000Z',
    project_name: 'Test Project',
    manager: 'Estimator',
    vision_model: 'gpt-4o',
    app_version: '1.0.0',
    schema_version: '1.0',
    construction_profile_version: 'alpha-basis-v1'
  };
  return CostingV1.buildSheetsV1Bundle(calculationContext, costing, snapshot);
}

test('writeSheetsV1Result_ writes into pre-setup spreadsheet and returns PASS', () => {
  const { spreadsheet, context } = createRuntime();
  // 1. Setup sheets
  vm.runInContext('setupSheetsV1_(SpreadsheetApp.getActiveSpreadsheet())', context);

  // 2. Write bundle
  const bundle = makeSampleBundle();
  context.bundle = bundle;
  const result = vm.runInContext('writeSheetsV1Result_(SpreadsheetApp.getActiveSpreadsheet(), bundle)', context);

  assert.equal(result.status, 'PASS');
  assert.equal(JSON.stringify(result.written_sheets), JSON.stringify(['BOM_LAST', 'CALC_LOG', 'SYSTEM']));
});

test('BOM_LAST preserves headers and replaces old data rows', () => {
  const { spreadsheet, context } = createRuntime();
  vm.runInContext('setupSheetsV1_(SpreadsheetApp.getActiveSpreadsheet())', context);

  const bomSheet = spreadsheet.getSheetByName('BOM_LAST');
  const headersBefore = bomSheet.getRange(1, 1, 1, bomSheet.getLastColumn()).getValues()[0];

  // Insert a dummy old row
  bomSheet.getRange(2, 1, 1, 3).setValues([['OLD_SECTION', 'Old Item', 'Old Spec']]);
  assert.equal(bomSheet.getLastRow(), 2);

  const bundle = makeSampleBundle();
  context.bundle = bundle;
  vm.runInContext('writeSheetsV1Result_(SpreadsheetApp.getActiveSpreadsheet(), bundle)', context);

  const headersAfter = bomSheet.getRange(1, 1, 1, headersBefore.length).getValues()[0];
  assert.deepEqual(headersAfter, headersBefore);

  // Verify that old item is gone and new data is written
  const rows = bomSheet.getRange(2, 1, bomSheet.getLastRow() - 1, headersBefore.length).getValues();
  assert.ok(rows.length >= bundle.BOM_LAST.length);
  assert.equal(rows[0][0], bundle.BOM_LAST[0].section);
  assert.equal(rows[0][1], bundle.BOM_LAST[0].item_name);
  assert.ok(!rows.some((r) => r[0] === 'OLD_SECTION'));
});

test('CALC_LOG appends exactly one new row and preserves existing history', () => {
  const { spreadsheet, context } = createRuntime();
  vm.runInContext('setupSheetsV1_(SpreadsheetApp.getActiveSpreadsheet())', context);

  const logSheet = spreadsheet.getSheetByName('CALC_LOG');
  const headers = logSheet.getRange(1, 1, 1, logSheet.getLastColumn()).getValues()[0];

  // Write bundle 1
  const bundle1 = makeSampleBundle();
  bundle1.CALC_LOG.calculation_id = 'CALC_001';
  context.bundle1 = bundle1;
  vm.runInContext('writeSheetsV1Result_(SpreadsheetApp.getActiveSpreadsheet(), bundle1)', context);
  assert.equal(logSheet.getLastRow(), 2);

  // Write bundle 2
  const bundle2 = makeSampleBundle();
  bundle2.CALC_LOG.calculation_id = 'CALC_002';
  context.bundle2 = bundle2;
  vm.runInContext('writeSheetsV1Result_(SpreadsheetApp.getActiveSpreadsheet(), bundle2)', context);
  assert.equal(logSheet.getLastRow(), 3);

  const calcIdColIdx = headers.indexOf('calculation_id');
  const rows = logSheet.getRange(2, 1, 2, headers.length).getValues();
  assert.equal(rows[0][calcIdColIdx], 'CALC_001');
  assert.equal(rows[1][calcIdColIdx], 'CALC_002');
});

test('SYSTEM preserves headers and replaces old key/value data rows', () => {
  const { spreadsheet, context } = createRuntime();
  vm.runInContext('setupSheetsV1_(SpreadsheetApp.getActiveSpreadsheet())', context);

  const sysSheet = spreadsheet.getSheetByName('SYSTEM');
  const headersBefore = sysSheet.getRange(1, 1, 1, sysSheet.getLastColumn()).getValues()[0];

  // Insert dummy old key
  sysSheet.getRange(2, 1, 1, 4).setValues([['Old_Key', 'Old_Val', 'string', '2026-01-01T00:00:00.000Z']]);

  const bundle = makeSampleBundle();
  context.bundle = bundle;
  vm.runInContext('writeSheetsV1Result_(SpreadsheetApp.getActiveSpreadsheet(), bundle)', context);

  const headersAfter = sysSheet.getRange(1, 1, 1, headersBefore.length).getValues()[0];
  assert.deepEqual(headersAfter, headersBefore);

  const rows = sysSheet.getRange(2, 1, sysSheet.getLastRow() - 1, 4).getValues();
  assert.ok(!rows.some((r) => r[0] === 'Old_Key'));
  assert.ok(rows.some((r) => r[0] === 'Calculation_id'));
});

test('Column order matches generated manifest dynamically', () => {
  const { spreadsheet, context } = createRuntime();
  vm.runInContext('setupSheetsV1_(SpreadsheetApp.getActiveSpreadsheet())', context);

  const bundle = makeSampleBundle();
  context.bundle = bundle;
  vm.runInContext('writeSheetsV1Result_(SpreadsheetApp.getActiveSpreadsheet(), bundle)', context);

  const manifest = context.SHEETS_V1_MANIFEST;
  const bomDef = manifest.sheets.find((s) => s.sheet_name === 'BOM_LAST');
  const bomExpectedCols = bomDef.columns.slice().sort((a, b) => a.order - b.order).map((c) => c.name);

  const bomSheet = spreadsheet.getSheetByName('BOM_LAST');
  const actualHeaders = bomSheet.getRange(1, 1, 1, bomExpectedCols.length).getValues()[0];
  assert.equal(JSON.stringify(actualHeaders), JSON.stringify(bomExpectedCols));
});

test('Re-writing identical bundle is idempotent for BOM_LAST and SYSTEM row counts', () => {
  const { spreadsheet, context } = createRuntime();
  vm.runInContext('setupSheetsV1_(SpreadsheetApp.getActiveSpreadsheet())', context);

  const bundle = makeSampleBundle();
  context.bundle = bundle;

  vm.runInContext('writeSheetsV1Result_(SpreadsheetApp.getActiveSpreadsheet(), bundle)', context);
  const bomSheet = spreadsheet.getSheetByName('BOM_LAST');
  const sysSheet = spreadsheet.getSheetByName('SYSTEM');

  const bomRows1 = bomSheet.getLastRow();
  const sysRows1 = sysSheet.getLastRow();

  // Re-write same bundle
  vm.runInContext('writeSheetsV1Result_(SpreadsheetApp.getActiveSpreadsheet(), bundle)', context);

  assert.equal(bomSheet.getLastRow(), bomRows1);
  assert.equal(sysSheet.getLastRow(), sysRows1);
});
