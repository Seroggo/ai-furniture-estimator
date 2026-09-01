import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const appsRoot = resolve(root, 'apps-script');
const contractsRoot = resolve(root, 'contracts', 'sheets');

const manifestJson = JSON.parse(readFileSync(resolve(contractsRoot, 'SHEETS_V1.json'), 'utf8'));
const orderedNames = manifestJson.sheets
  .slice()
  .sort((a, b) => a.order - b.order)
  .map((entry) => entry.sheet_name);
const contracts = {};
for (const entry of manifestJson.sheets) {
  contracts[entry.sheet_name] = JSON.parse(
    readFileSync(resolve(contractsRoot, entry.contract_file), 'utf8'),
  );
}

function expectedHeaders(sheetName) {
  return contracts[sheetName].columns
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((column) => column.name);
}

function expectedVisibility(sheetName) {
  return contracts[sheetName].columns
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((column) => column.visibility);
}

class FakeDataValidationBuilder {
  constructor() {
    this.allowInvalid = true;
    this.criteria = null;
  }
  setAllowInvalid(value) { this.allowInvalid = value; return this; }
  requireValueInList(values, showDropdown) { this.criteria = { type: 'VALUE_IN_LIST', values: values.slice(), showDropdown }; return this; }
  requireCheckbox() { this.criteria = { type: 'CHECKBOX' }; return this; }
  requireNumberGreaterThanOrEqualTo(value) { this.criteria = { type: 'NUMBER_GREATER_THAN_OR_EQUAL_TO', value }; return this; }
  requireDate() { this.criteria = { type: 'DATE_IS_VALID' }; return this; }
  build() { return { allowInvalid: this.allowInvalid, criteria: this.criteria }; }
}

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
    return this.getValues().map((row) => row.map((value) => (value === '' || value === null || value === undefined ? '' : String(value))));
  }
  setValues(values) {
    assert.equal(this.numRows, values.length, `${this.sheet.name}: setValues row count mismatch`);
    for (let r = 0; r < this.numRows; r += 1) {
      assert.equal(this.numColumns, values[r].length, `${this.sheet.name}: setValues column count mismatch`);
      for (let c = 0; c < this.numColumns; c += 1) {
        this.sheet.writeValue(this.row + r, this.column + c, values[r][c]);
      }
    }
    return this;
  }
  isBlank() {
    for (let r = 0; r < this.numRows; r += 1) {
      for (let c = 0; c < this.numColumns; c += 1) {
        const value = this.sheet.readValue(this.row + r, this.column + c);
        if (value !== '' && value !== null && value !== undefined) return false;
      }
    }
    return true;
  }
  setDataValidation(rule) {
    for (let c = 0; c < this.numColumns; c += 1) {
      this.sheet.validations.set(this.column + c, rule);
    }
    return this;
  }
  clearDataValidations() {
    for (let c = 0; c < this.numColumns; c += 1) {
      this.sheet.validations.delete(this.column + c);
    }
    return this;
  }
}

class FakeSheet {
  constructor(name) {
    this.name = name;
    this.grid = [];
    this.frozenRows = 0;
    this.hiddenColumns = new Set();
    this.validations = new Map();
  }
  getName() { return this.name; }
  setName(name) { this.name = name; }
  readValue(row, column) {
    const sheetRow = this.grid[row - 1];
    return sheetRow ? sheetRow[column - 1] ?? '' : '';
  }
  writeValue(row, column, value) {
    while (this.grid.length < row) this.grid.push([]);
    const sheetRow = this.grid[row - 1];
    while (sheetRow.length < column - 1) sheetRow.push('');
    sheetRow[column - 1] = value;
  }
  getLastRow() {
    for (let r = this.grid.length - 1; r >= 0; r -= 1) {
      const row = this.grid[r];
      if (row && row.some((value) => value !== '' && value !== null && value !== undefined)) return r + 1;
    }
    return 0;
  }
  getLastColumn() {
    let max = 0;
    for (const row of this.grid) {
      if (!row) continue;
      for (let c = row.length - 1; c >= 0; c -= 1) {
        if (row[c] !== '' && row[c] !== null && row[c] !== undefined) {
          if (c + 1 > max) max = c + 1;
          break;
        }
      }
    }
    return max;
  }
  getMaxRows() { return Math.max(this.grid.length, 1); }
  getRange(row, column, numRows = 1, numColumns = 1) {
    return new FakeRange(this, row, column, numRows, numColumns);
  }
  getDataRange() {
    return new FakeRange(this, 1, 1, Math.max(this.getLastRow(), 1), Math.max(this.getLastColumn(), 1));
  }
  setFrozenRows(n) { this.frozenRows = n; return this; }
  getFrozenRows() { return this.frozenRows; }
  hideColumns(position) { this.hiddenColumns.add(position); return this; }
  showColumns(position) { this.hiddenColumns.delete(position); return this; }
  isColumnHidden(position) { return this.hiddenColumns.has(position); }
  validationForColumn(position) { return this.validations.get(position) || null; }
}

class FakeSpreadsheet {
  constructor(initialSheetNames = ['Sheet1']) {
    this.sheets = initialSheetNames.map((name) => new FakeSheet(name));
    this.active = this.sheets[0] || null;
  }
  getSheets() { return this.sheets.slice(); }
  getSheetByName(name) { return this.sheets.find((sheet) => sheet.name === name) || null; }
  insertSheet(name) {
    if (this.getSheetByName(name)) throw new Error('Sheet with name ' + name + ' already exists');
    const sheet = new FakeSheet(name);
    this.sheets.push(sheet);
    return sheet;
  }
  setActiveSheet(sheet) { this.active = sheet; return this; }
  getActiveSheet() { return this.active; }
  moveActiveSheet(position) {
    const sheet = this.active;
    const index = this.sheets.indexOf(sheet);
    if (index === -1) throw new Error('Active sheet is not part of the workbook');
    this.sheets.splice(index, 1);
    this.sheets.splice(position - 1, 0, sheet);
    return this;
  }
}

function createRuntime(initialSheetNames = ['Sheet1']) {
  const spreadsheet = new FakeSpreadsheet(initialSheetNames);
  const SpreadsheetApp = {
    getActiveSpreadsheet() { return spreadsheet; },
    newDataValidation() { return new FakeDataValidationBuilder(); },
    flush() {},
  };
  const context = vm.createContext({ SpreadsheetApp });
  vm.runInContext(
    readFileSync(resolve(appsRoot, 'generated/sheets_v1_manifest.gs'), 'utf8'),
    context,
    { filename: 'generated/sheets_v1_manifest.gs' },
  );
  vm.runInContext(
    readFileSync(resolve(appsRoot, 'sheets_v1_setup.gs'), 'utf8'),
    context,
    { filename: 'sheets_v1_setup.gs' },
  );
  return { spreadsheet, context };
}

function snapshot(value) {
  return JSON.parse(JSON.stringify(value));
}

function serialize(spreadsheet) {
  return spreadsheet.getSheets().map((sheet) => ({
    name: sheet.getName(),
    grid: sheet.grid,
    frozenRows: sheet.getFrozenRows(),
    hiddenColumns: [...sheet.hiddenColumns].sort((a, b) => a - b),
    validations: [...sheet.validations.entries()].sort((a, b) => a[0] - b[0]).map(([col, rule]) => [col, rule]),
  }));
}

test('setupSheetsV1_ creates exactly five target sheets without duplicates', () => {
  const { spreadsheet, context } = createRuntime();
  const result = context.setupSheetsV1_(spreadsheet);
  assert.equal(result.status, 'PASS');
  const counts = {};
  for (const sheet of spreadsheet.getSheets()) counts[sheet.getName()] = (counts[sheet.getName()] || 0) + 1;
  for (const name of orderedNames) assert.equal(counts[name], 1, `duplicate or missing sheet: ${name}`);
  assert.equal(spreadsheet.getSheets().filter((sheet) => orderedNames.includes(sheet.getName())).length, 5);
});

test('setupSheetsV1_ orders target sheets per manifest', () => {
  const { spreadsheet, context } = createRuntime();
  context.setupSheetsV1_(spreadsheet);
  assert.deepEqual(spreadsheet.getSheets().slice(0, 5).map((sheet) => sheet.getName()), orderedNames);
});

test('setupSheetsV1_ writes contract headers and freezes the first row', () => {
  const { spreadsheet, context } = createRuntime();
  context.setupSheetsV1_(spreadsheet);
  for (const name of orderedNames) {
    const sheet = spreadsheet.getSheetByName(name);
    const headers = sheet.getRange(1, 1, 1, expectedHeaders(name).length).getDisplayValues()[0];
    assert.deepEqual(headers, expectedHeaders(name), `headers for ${name}`);
    assert.equal(sheet.getFrozenRows(), 1, `frozen row for ${name}`);
  }
});

test('setupSheetsV1_ hides HIDDEN columns and keeps VISIBLE columns visible', () => {
  const { spreadsheet, context } = createRuntime();
  context.setupSheetsV1_(spreadsheet);
  for (const name of orderedNames) {
    const sheet = spreadsheet.getSheetByName(name);
    const visibility = expectedVisibility(name);
    visibility.forEach((expected, index) => {
      const position = index + 1;
      if (expected === 'HIDDEN') assert.ok(sheet.isColumnHidden(position), `${name} column ${position} should be hidden`);
      else assert.ok(!sheet.isColumnHidden(position), `${name} column ${position} should be visible`);
    });
  }
  const prices = spreadsheet.getSheetByName('Prices');
  assert.ok(prices.isColumnHidden(11), 'Prices.item_id should be hidden');
  assert.ok(!prices.isColumnHidden(1), 'Prices.category should be visible');
  const system = spreadsheet.getSheetByName('SYSTEM');
  for (let i = 1; i <= 4; i += 1) assert.ok(system.isColumnHidden(i), `SYSTEM column ${i} should be hidden`);
});

test('setupSheetsV1_ applies contract validations', () => {
  const { spreadsheet, context } = createRuntime();
  context.setupSheetsV1_(spreadsheet);
  const prices = spreadsheet.getSheetByName('Prices');
  const categoryRule = prices.validationForColumn(1);
  assert.equal(categoryRule.criteria.type, 'VALUE_IN_LIST');
  assert.deepEqual(snapshot(categoryRule.criteria.values), ['MATERIALS', 'EDGE', 'HARDWARE', 'WORKS', 'OTHER']);
  assert.equal(categoryRule.allowInvalid, false);
  assert.equal(prices.validationForColumn(8).criteria.type, 'CHECKBOX', 'Prices.active checkbox');
  assert.equal(prices.validationForColumn(4).criteria.type, 'NUMBER_GREATER_THAN_OR_EQUAL_TO', 'Prices.price number');
  assert.equal(prices.validationForColumn(4).criteria.value, 0);
  assert.equal(prices.validationForColumn(10).criteria.type, 'DATE_IS_VALID', 'Prices.updated_at date');
  assert.equal(prices.validationForColumn(2), null, 'Prices.name has no representable validation');
  assert.equal(prices.validationForColumn(5), null, 'Prices.currency has only pattern validation');
  const system = spreadsheet.getSheetByName('SYSTEM');
  assert.equal(system.validationForColumn(3).criteria.type, 'VALUE_IN_LIST', 'SYSTEM.Value_type enum');
  assert.equal(system.validationForColumn(1), null, 'SYSTEM.Key has no validation');
  const calcLog = spreadsheet.getSheetByName('CALC_LOG');
  assert.equal(calcLog.validationForColumn(4).criteria.type, 'VALUE_IN_LIST', 'CALC_LOG.status enum');
  assert.equal(calcLog.validationForColumn(1).criteria.type, 'DATE_IS_VALID', 'CALC_LOG.timestamp date');
});

test('setupSheetsV1_ is idempotent on a second run', () => {
  const { spreadsheet, context } = createRuntime();
  context.setupSheetsV1_(spreadsheet);
  const before = serialize(spreadsheet);
  const sheetCountBefore = spreadsheet.getSheets().length;
  context.setupSheetsV1_(spreadsheet);
  assert.deepEqual(serialize(spreadsheet), before);
  assert.equal(spreadsheet.getSheets().length, sheetCountBefore);
});

test('setupSheetsV1_ preserves existing data rows', () => {
  const { spreadsheet, context } = createRuntime(['Prices']);
  const prices = spreadsheet.getSheetByName('Prices');
  const headers = expectedHeaders('Prices');
  prices.getRange(1, 1, 1, headers.length).setValues([headers]);
  const dataRow = headers.map((header, index) => (index === 0 ? 'MATERIALS' : index === 3 ? 120 : `v${index}`));
  prices.getRange(2, 1, 1, headers.length).setValues([dataRow]);
  context.setupSheetsV1_(spreadsheet);
  const after = prices.getRange(2, 1, 1, headers.length).getValues()[0];
  assert.deepEqual(after, dataRow);
  const afterHeaders = prices.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
  assert.deepEqual(afterHeaders, headers);
});

test('setupSheetsV1_ throws on incompatible headers', () => {
  const { spreadsheet, context } = createRuntime(['Prices']);
  const prices = spreadsheet.getSheetByName('Prices');
  prices.getRange(1, 1, 1, 3).setValues([['wrong', 'headers', 'here']]);
  prices.getRange(2, 1, 1, 1).setValues([['data']]);
  assert.throws(() => context.setupSheetsV1_(spreadsheet), /Incompatible headers/);
});

test('setupSheetsV1_ throws when non-canonical data exists beyond contract columns', () => {
  const { spreadsheet, context } = createRuntime(['Prices']);
  const prices = spreadsheet.getSheetByName('Prices');
  const headers = expectedHeaders('Prices');
  prices.getRange(1, 1, 1, headers.length).setValues([headers]);
  prices.getRange(1, headers.length + 1, 1, 1).setValues([['extra']]);
  assert.throws(() => context.setupSheetsV1_(spreadsheet), /Non-canonical data exists beyond expected columns/);
});

test('setupSheetsV1 uses the active spreadsheet', () => {
  const { spreadsheet, context } = createRuntime();
  const result = context.setupSheetsV1();
  assert.equal(result.status, 'PASS');
  assert.deepEqual(snapshot(result.sheets), orderedNames);
  assert.deepEqual(spreadsheet.getSheets().slice(0, 5).map((sheet) => sheet.getName()), orderedNames);
});