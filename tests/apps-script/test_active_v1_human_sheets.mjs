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

  getDisplayValues() {
    return this.getValues().map((row) => row.map((value) => (
      value === null || value === undefined ? '' : String(value))));
  }

  setValues(values) {
    assert.equal(values.length, this.numRows);
    values.forEach((row, rowOffset) => {
      assert.equal(row.length, this.numColumns);
      row.forEach((value, columnOffset) => {
        this.sheet.writeValue(this.row + rowOffset, this.column + columnOffset, value);
      });
    });
    return this;
  }

  setValue(value) {
    assert.equal(this.numRows, 1);
    assert.equal(this.numColumns, 1);
    this.sheet.writeValue(this.row, this.column, value);
    return this;
  }

  setNumberFormat(format) {
    assert.equal(this.numRows, 1);
    assert.equal(this.numColumns, 1);
    this.sheet.numberFormats.set(`${this.row}:${this.column}`, format);
    return this;
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
  constructor(name) {
    this.name = name;
    this.grid = new Map();
    this.numberFormats = new Map();
  }

  getName() { return this.name; }
  cellKey(row, column) { return `${row}:${column}`; }
  readValue(row, column) { return this.grid.has(this.cellKey(row, column)) ? this.grid.get(this.cellKey(row, column)) : null; }
  writeValue(row, column, value) {
    if (value === null || value === undefined || value === '') this.grid.delete(this.cellKey(row, column));
    else this.grid.set(this.cellKey(row, column), value);
  }
  getLastRow() {
    let result = 0;
    for (const key of this.grid.keys()) result = Math.max(result, Number(key.split(':')[0]));
    return result;
  }
  getLastColumn() {
    let result = 0;
    for (const key of this.grid.keys()) result = Math.max(result, Number(key.split(':')[1]));
    return result;
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

function createRuntime() {
  const spreadsheet = new FakeSpreadsheet();
  const context = vm.createContext({SpreadsheetApp: {getActiveSpreadsheet: () => spreadsheet}});
  vm.runInContext(readFileSync(resolve(appsRoot, 'generated/sheets_v1_manifest.gs'), 'utf8'), context);
  vm.runInContext(readFileSync(resolve(appsRoot, 'active_v1_server.gs'), 'utf8'), context);
  vm.runInContext(readFileSync(resolve(appsRoot, 'sheets_v1_result_writer.gs'), 'utf8'), context);
  return {spreadsheet, context};
}

function writeRow(sheet, row, values) {
  sheet.getRange(row, 1, 1, values.length).setValues([values]);
}

const customHeaders = ['Категория', 'Наименование', 'Ед. изм.', 'Цена', 'Валюта', 'Режим цены', 'Курс ручной', 'Курс текущий', 'Цена в ₽', 'По умолчанию', 'Дата обновления', 'Комментарий', 'item_id'];
const sprHeaders = ['type', 'human_value', 'machine_value', 'direction', 'comment'];
const bomHeaders = ['Раздел', 'Наименование', 'Характеристика', 'Размер', 'Количество', 'Ед. изм.', 'Цена за ед.', 'Сумма', 'Модуль / узел', 'Комментарий', 'item_id', 'module_id', 'material_code', 'calculation_id'];

function installInputSheets(spreadsheet, customRows = [], sprRows = []) {
  const custom = spreadsheet.insertSheet('Custom_Price');
  const spr = spreadsheet.insertSheet('spr');
  writeRow(custom, 1, customHeaders);
  customRows.forEach((row, index) => writeRow(custom, index + 2, row));
  writeRow(spr, 1, sprHeaders);
  sprRows.forEach((row, index) => writeRow(spr, index + 2, row));
  return {custom, spr};
}

const standardSprRows = [
  ['price_category', 'ЛДСП', 'MATERIALS', 'HUMAN_TO_MACHINE', ''],
  ['unit', 'м²', 'm2', 'BOTH', ''],
];

function customRow({category = 'ЛДСП', name = 'ЛДСП 16 мм', unit = 'м²', priceRub = 600.89, defaultValue = false, itemId = 'MAT_001', comment = ''} = {}) {
  return [category, name, unit, 100, 'RUB', 'Рубли', 1, 1, priceRub, defaultValue, new Date('2026-09-02T10:00:00.000Z'), comment, itemId];
}

test('Custom_Price adapter maps human category/unit and uses effective RUB price', () => {
  const {spreadsheet, context} = createRuntime();
  installInputSheets(spreadsheet, [customRow()], standardSprRows);
  context.spreadsheet = spreadsheet;
  const rows = vm.runInContext('activeV1ReadCustomPriceRows_(spreadsheet)', context);
  assert.equal(JSON.stringify(rows), JSON.stringify([{
    category: 'MATERIALS', name: 'ЛДСП 16 мм', unit: 'm2', price: 600.89, currency: 'RUB',
    vendor: null, article: null, active: true, notes: null,
    updated_at: rows[0].updated_at, item_id: 'MAT_001',
  }]));
  assert.ok(rows[0].updated_at instanceof Date);
});

test('Custom_Price default flag does not filter either TRUE or FALSE rows', () => {
  const {spreadsheet, context} = createRuntime();
  installInputSheets(spreadsheet, [customRow({itemId: 'TRUE_ROW', defaultValue: true}), customRow({itemId: 'FALSE_ROW', defaultValue: false})], standardSprRows);
  context.spreadsheet = spreadsheet;
  const rows = vm.runInContext('activeV1ReadCustomPriceRows_(spreadsheet)', context);
  assert.equal(JSON.stringify(rows.map((row) => row.item_id)), JSON.stringify(['TRUE_ROW', 'FALSE_ROW']));
  assert.equal(JSON.stringify(rows.map((row) => row.active)), JSON.stringify([true, true]));
});

test('Custom_Price reader ignores service columns O:P', () => {
  const {spreadsheet, context} = createRuntime();
  const {custom} = installInputSheets(spreadsheet, [customRow()], standardSprRows);
  writeRow(custom, 1, [...customHeaders, '', 'FX currency cache', 'FX rate cache']);
  writeRow(custom, 2, [...customRow(), '', 'USD', 999]);
  context.spreadsheet = spreadsheet;
  const rows = vm.runInContext('activeV1ReadCustomPriceRows_(spreadsheet)', context);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].item_id, 'MAT_001');
});

test('Custom_Price reader reports missing mapping with lowercase spr context', () => {
  const {spreadsheet, context} = createRuntime();
  installInputSheets(spreadsheet, [customRow()], [['unit', 'м²', 'm2', 'BOTH', '']]);
  context.spreadsheet = spreadsheet;
  assert.throws(() => vm.runInContext('activeV1ReadCustomPriceRows_(spreadsheet)', context), /Custom_Price!2!Категория: missing spr mapping/);
});

test('spr adapter rejects ambiguous exact mappings', () => {
  const {spreadsheet, context} = createRuntime();
  installInputSheets(spreadsheet, [], [
    ['price_category', 'ЛДСП', 'MATERIALS', 'HUMAN_TO_MACHINE', ''],
    ['price_category', 'ЛДСП', 'EDGE', 'HUMAN_TO_MACHINE', ''],
  ]);
  context.spreadsheet = spreadsheet;
  assert.throws(() => vm.runInContext('activeV1ReadSprMappings_(spreadsheet)', context), /spr!3: ambiguous mapping/);
});

test('Active V1 BOM writer preserves rows 1-2, writes row 3, maps display labels, and filters TOTALS', () => {
  const {spreadsheet, context} = createRuntime();
  const bom = spreadsheet.insertSheet('BOM');
  const calcLog = spreadsheet.insertSheet('CALC_LOG');
  const system = spreadsheet.insertSheet('SYSTEM');
  const legacyBom = spreadsheet.insertSheet('BOM_LAST');
  writeRow(legacyBom, 1, ['legacy sentinel']);
  writeRow(calcLog, 1, ['timestamp', 'project_name', 'manager', 'status', 'currency', 'material_total', 'hardware_total', 'work_total', 'grand_total', 'vision_model', 'calculation_id', 'fx_rate_used']);
  writeRow(calcLog, 2, ['old timestamp', 'old project', '', 'COMPLETED', 'RUB', 0, 0, 0, 0, '', 'OLD_CALC', 1]);
  writeRow(system, 1, ['Key', 'Value', 'Value_type', 'Updated_at']);
  writeRow(system, 2, ['Old_Key', 'Old_Value', 'string', 'old timestamp']);
  writeRow(bom, 1, ['calculation formula', '=SUM(H3:H20)', 'user formula', '', '', '', '', '', '', '', '', '', '', '']);
  writeRow(bom, 2, bomHeaders);
  writeRow(bom, 3, ['OLD', 'old item', '', '', '', '', '', '', '', '', 'OLD_ID', '', '', 'OLD_CALC']);
  writeRow(bom, 4, ['OLD_2', 'old item 2', '', '', '', '', '', '', '', '', 'OLD_ID_2', '', '', 'OLD_CALC']);
  const mappings = {
    'bom_section\\u0000MACHINE_TO_HUMAN\\u0000MATERIALS': {value: 'Материалы'},
    'unit\\u0000BOTH\\u0000m2': {value: 'м²'},
  };
  const bundle = {
    BOM_LAST: [
      {section: 'MATERIALS', item_name: 'LDSP', specification: 'A', size: '16', quantity: 2, unit: 'm2', unit_price: 600.89, total: 1201.78, source_module: 'M1', comment: 'note', item_id: 'I1', module_id: 'M1', material_code: 'LDSP', calculation_id: 'C1'},
      {section: 'TOTALS', item_name: 'Grand Total', unit: 'sum', unit_price: 1201.78, total: 1201.78, item_id: 'TOTAL_GRAND', calculation_id: 'C1'},
    ],
    CALC_LOG: {timestamp: '2026-09-02T10:00:00.000Z', calculation_id: 'C1'},
    SYSTEM: [{Key: 'Calculation_id', Value: 'C1', Value_type: 'string', Updated_at: '2026-09-02T10:00:00.000Z'}],
  };
  context.spreadsheet = spreadsheet;
  context.bundle = bundle;
  context.mappings = mappings;
  const result = vm.runInContext('writeActiveV1SheetsResult_(spreadsheet, bundle, mappings)', context);
  assert.equal(JSON.stringify(result.written_sheets), JSON.stringify(['BOM', 'CALC_LOG', 'SYSTEM']));
  assert.equal(typeof bom.getRange(1, 1).getValues()[0][0].getTime, 'function');
  assert.equal(bom.getRange(1, 1, 1, 14).getValues()[0][1], '=SUM(H3:H20)');
  assert.equal(bom.getRange(1, 1, 1, 14).getValues()[0][2], 'user formula');
  assert.equal(JSON.stringify(bom.getRange(2, 1, 1, 14).getValues()[0]), JSON.stringify(bomHeaders));
  const row = bom.getRange(3, 1, 1, 14).getValues()[0];
  assert.equal(JSON.stringify(row), JSON.stringify(['Материалы', 'LDSP', 'A', '16', 2, 'м²', 600.89, 1201.78, 'M1', 'note', 'I1', 'M1', 'LDSP', 'C1']));
  assert.equal(bom.getRange(4, 1, 1, 14).getValues()[0].every((value) => value === null), true);
  assert.equal(legacyBom.getRange(1, 1).getValues()[0][0], 'legacy sentinel');
  assert.equal(calcLog.getLastRow(), 3);
  assert.equal(system.getRange(2, 1).getValues()[0][0], 'Calculation_id');
  assert.equal(typeof bom.getRange(1, 1).getValues()[0][0].getTime, 'function');
  assert.equal(bom.numberFormats.get('1:1'), 'dd.MM.yyyy HH:mm');
});

test('Active V1 BOM writer rejects an incompatible row-2 header', () => {
  const {spreadsheet, context} = createRuntime();
  const bom = spreadsheet.insertSheet('BOM');
  writeRow(bom, 2, [...bomHeaders.slice(0, 13), 'wrong']);
  context.spreadsheet = spreadsheet;
  context.bundle = {BOM_LAST: [], CALC_LOG: {timestamp: '2026-09-02T10:00:00.000Z'}};
  context.mappings = {};
  assert.throws(() => vm.runInContext('writeActiveV1SheetsResult_(spreadsheet, bundle, mappings)', context), /Incompatible headers in BOM row 2/);
});
