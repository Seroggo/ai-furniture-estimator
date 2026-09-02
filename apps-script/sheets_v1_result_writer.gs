/**
 * Sheets V1 result writer adapter.
 *
 * Writes calculated BOM_LAST, CALC_LOG, and SYSTEM bundle to a Google Spreadsheet.
 * Deterministic column mapping via SHEETS_V1_MANIFEST.
 */

function writeSheetsV1Result(bundle) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('writeSheetsV1Result requires an active Google Spreadsheet.');
  }
  return writeSheetsV1Result_(spreadsheet, bundle);
}

/**
 * Public internal writer function.
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} spreadsheet
 * @param {Object} bundle - { BOM_LAST: Array<Object>, CALC_LOG: Object, SYSTEM: Array<Object> }
 * @returns {Object} { status: 'PASS', written_sheets: Array<string> }
 */


var ACTIVE_V1_BOM_SHEET_NAME = 'BOM';
var ACTIVE_V1_BOM_HEADERS = [
  'Раздел', 'Наименование', 'Характеристика', 'Размер', 'Количество', 'Ед. изм.',
  'Цена за ед.', 'Сумма', 'Модуль / узел', 'Комментарий', 'item_id', 'module_id',
  'material_code', 'calculation_id'
];


/**
 * Active V1 boundary writer: canonical BOM_LAST rows -> human-first BOM,
 * while retaining the existing CALC_LOG and SYSTEM contracts.
 */
function writeActiveV1SheetsResult_(spreadsheet, bundle, sprMappings, calculationDate) {
  if (!spreadsheet) {
    throw new Error('writeActiveV1SheetsResult_: spreadsheet is required.');
  }
  if (!bundle || typeof bundle !== 'object') {
    throw new Error('writeActiveV1SheetsResult_: bundle must be an object.');
  }
  if (typeof SHEETS_V1_MANIFEST === 'undefined' || !SHEETS_V1_MANIFEST || !Array.isArray(SHEETS_V1_MANIFEST.sheets)) {
    throw new Error('writeActiveV1SheetsResult_: SHEETS_V1_MANIFEST is required.');
  }

  var writtenSheets = [];
  if (bundle.BOM_LAST) {
    activeV1WriteBomSheet_(spreadsheet, bundle.BOM_LAST, sprMappings, calculationDate, bundle);
    writtenSheets.push(ACTIVE_V1_BOM_SHEET_NAME);
  }
  if (bundle.CALC_LOG) {
    activeV1WriteCalcLog_(spreadsheet, bundle.CALC_LOG);
    writtenSheets.push('CALC_LOG');
  }
  if (bundle.SYSTEM) {
    activeV1WriteSystem_(spreadsheet, bundle.SYSTEM);
    writtenSheets.push('SYSTEM');
  }
  return {
    status: 'PASS',
    written_sheets: writtenSheets
  };
}


function activeV1WriteBomSheet_(spreadsheet, bomRows, sprMappings, calculationDate, bundle) {
  var bomSheet = spreadsheet.getSheetByName(ACTIVE_V1_BOM_SHEET_NAME);
  if (!bomSheet) {
    throw new Error('Missing Active V1 tab: ' + ACTIVE_V1_BOM_SHEET_NAME);
  }

  var actualHeaders = bomSheet.getRange(2, 1, 1, ACTIVE_V1_BOM_HEADERS.length).getDisplayValues()[0];
  if (JSON.stringify(actualHeaders) !== JSON.stringify(ACTIVE_V1_BOM_HEADERS)) {
    throw new Error('Incompatible headers in BOM row 2: expected ' + ACTIVE_V1_BOM_HEADERS.join('|') + ', got ' + actualHeaders.join('|'));
  }

  var matrix = [];
  var sourceRows = Array.isArray(bomRows) ? bomRows : [];
  for (var i = 0; i < sourceRows.length; i += 1) {
    var row = sourceRows[i];
    if (!row || typeof row !== 'object') {
      throw new Error('BOM_LAST row ' + (i + 1) + ' is invalid.');
    }
    if (String(row.section || '').trim() === 'TOTALS') continue;
    matrix.push([
      activeV1BomDisplayValue_(sprMappings, 'bom_section', row.section, 'BOM_LAST row ' + (i + 1) + '!Раздел'),
      activeV1BomCellValue_(row, 'item_name'),
      activeV1BomCellValue_(row, 'specification'),
      activeV1BomCellValue_(row, 'size'),
      activeV1BomCellValue_(row, 'quantity'),
      activeV1BomDisplayValue_(sprMappings, 'unit', row.unit, 'BOM_LAST row ' + (i + 1) + '!Ед. изм.'),
      activeV1BomCellValue_(row, 'unit_price'),
      activeV1BomCellValue_(row, 'total'),
      activeV1BomCellValue_(row, 'source_module'),
      activeV1BomCellValue_(row, 'comment'),
      activeV1BomCellValue_(row, 'item_id'),
      activeV1BomCellValue_(row, 'module_id'),
      activeV1BomCellValue_(row, 'material_code'),
      activeV1BomCellValue_(row, 'calculation_id')
    ]);
  }

  var rawTimestamp = calculationDate;
  if (rawTimestamp === undefined || rawTimestamp === null) {
    rawTimestamp = bundle && bundle.CALC_LOG ? bundle.CALC_LOG.timestamp : null;
  }
  var timestamp = rawTimestamp instanceof Date
    ? new Date(rawTimestamp.getTime()) : new Date(rawTimestamp);
  if (isNaN(timestamp.getTime())) {
    throw new Error('Invalid calculation timestamp for BOM!A1: ' + JSON.stringify(rawTimestamp));
  }

  var lastRow = bomSheet.getLastRow();
  if (lastRow >= 3) {
    bomSheet.getRange(3, 1, lastRow - 2, ACTIVE_V1_BOM_HEADERS.length).clearContent();
  }
  bomSheet.getRange(1, 1).setValue(timestamp);
  bomSheet.getRange(1, 1).setNumberFormat('dd.MM.yyyy HH:mm');
  if (matrix.length > 0) {
    bomSheet.getRange(3, 1, matrix.length, ACTIVE_V1_BOM_HEADERS.length).setValues(matrix);
  }
}


function activeV1BomDisplayValue_(sprMappings, type, value, source) {
  var machineValue = value === null || value === undefined ? '' : String(value).trim();
  var machineKey = type + '\\u0000MACHINE_TO_HUMAN\\u0000' + machineValue;
  var bothKey = type + '\\u0000BOTH\\u0000' + machineValue;
  var mapping = sprMappings && (sprMappings[machineKey] || sprMappings[bothKey]);
  if (!mapping) {
    throw new Error(source + ': missing spr mapping for type=' + type + ', direction=MACHINE_TO_HUMAN, value=' + JSON.stringify(machineValue) + '.');
  }
  return mapping.value;
}


function activeV1BomCellValue_(row, key) {
  return row[key] === undefined || row[key] === null ? '' : row[key];
}


function activeV1SheetDefinition_(sheetName) {
  for (var i = 0; i < SHEETS_V1_MANIFEST.sheets.length; i += 1) {
    if (SHEETS_V1_MANIFEST.sheets[i].sheet_name === sheetName) {
      return SHEETS_V1_MANIFEST.sheets[i];
    }
  }
  throw new Error('Sheet definition not found in SHEETS_V1_MANIFEST: ' + sheetName);
}


function activeV1FormatSheetRow_(rowObj, columns) {
  return columns.map(function (column) {
    var value = rowObj[column.name];
    return value === undefined || value === null ? '' : value;
  });
}


function activeV1WriteCalcLog_(spreadsheet, calcLog) {
  var logSheet = spreadsheet.getSheetByName('CALC_LOG');
  if (!logSheet) {
    throw new Error('Sheet CALC_LOG does not exist in spreadsheet.');
  }
  var logColumns = activeV1SheetDefinition_('CALC_LOG').columns.slice().sort(function (a, b) {
    return a.order - b.order;
  });
  var targetRow = logSheet.getLastRow() + 1;
  if (targetRow < 2) targetRow = 2;
  logSheet.getRange(targetRow, 1, 1, logColumns.length).setValues([
    activeV1FormatSheetRow_(calcLog, logColumns)
  ]);
}


function activeV1WriteSystem_(spreadsheet, systemRows) {
  var systemSheet = spreadsheet.getSheetByName('SYSTEM');
  if (!systemSheet) {
    throw new Error('Sheet SYSTEM does not exist in spreadsheet.');
  }
  var systemColumns = activeV1SheetDefinition_('SYSTEM').columns.slice().sort(function (a, b) {
    return a.order - b.order;
  });
  var rows = Array.isArray(systemRows) ? systemRows : [];
  var lastRow = systemSheet.getLastRow();
  var lastColumn = Math.max(systemSheet.getLastColumn(), systemColumns.length);
  if (lastRow > 1) {
    systemSheet.getRange(2, 1, lastRow - 1, lastColumn).clearContent();
  }
  if (rows.length > 0) {
    systemSheet.getRange(2, 1, rows.length, systemColumns.length).setValues(rows.map(function (row) {
      return activeV1FormatSheetRow_(row, systemColumns);
    }));
  }
}


function writeSheetsV1Result_(spreadsheet, bundle) {
  if (!spreadsheet) {
    throw new Error('writeSheetsV1Result_: spreadsheet is required.');
  }
  if (!bundle || typeof bundle !== 'object') {
    throw new Error('writeSheetsV1Result_: bundle must be an object.');
  }
  if (typeof SHEETS_V1_MANIFEST === 'undefined' || !SHEETS_V1_MANIFEST || !Array.isArray(SHEETS_V1_MANIFEST.sheets)) {
    throw new Error('writeSheetsV1Result_: SHEETS_V1_MANIFEST is required.');
  }

  var writtenSheets = [];
  function getSheetDefinition(sheetName) {
    return activeV1SheetDefinition_(sheetName);
  }
  function formatRowValues(rowObj, columns) {
    return activeV1FormatSheetRow_(rowObj, columns);
  }

  if (bundle.BOM_LAST) {
    var bomDef = getSheetDefinition('BOM_LAST');
    var bomSheet = spreadsheet.getSheetByName('BOM_LAST');
    if (!bomSheet) {
      throw new Error('Sheet BOM_LAST does not exist in spreadsheet.');
    }
    var bomColumns = bomDef.columns.slice().sort(function (a, b) { return a.order - b.order; });
    var bomRows = Array.isArray(bundle.BOM_LAST) ? bundle.BOM_LAST : [];
    var lastRow = bomSheet.getLastRow();
    var lastCol = Math.max(bomSheet.getLastColumn(), bomColumns.length);
    if (lastRow > 1) {
      bomSheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
    }
    if (bomRows.length > 0) {
      bomSheet.getRange(2, 1, bomRows.length, bomColumns.length).setValues(bomRows.map(function (row) {
        return formatRowValues(row, bomColumns);
      }));
    }
    writtenSheets.push('BOM_LAST');
  }

  if (bundle.CALC_LOG) {
    var logSheet = spreadsheet.getSheetByName('CALC_LOG');
    if (!logSheet) {
      throw new Error('Sheet CALC_LOG does not exist in spreadsheet.');
    }
    var logColumns = getSheetDefinition('CALC_LOG').columns.slice().sort(function (a, b) { return a.order - b.order; });
    var targetRow = Math.max(logSheet.getLastRow() + 1, 2);
    logSheet.getRange(targetRow, 1, 1, logColumns.length).setValues([formatRowValues(bundle.CALC_LOG, logColumns)]);
    writtenSheets.push('CALC_LOG');
  }

  if (bundle.SYSTEM) {
    var systemSheet = spreadsheet.getSheetByName('SYSTEM');
    if (!systemSheet) {
      throw new Error('Sheet SYSTEM does not exist in spreadsheet.');
    }
    var systemColumns = getSheetDefinition('SYSTEM').columns.slice().sort(function (a, b) { return a.order - b.order; });
    var systemRows = Array.isArray(bundle.SYSTEM) ? bundle.SYSTEM : [];
    var systemLastRow = systemSheet.getLastRow();
    var systemLastCol = Math.max(systemSheet.getLastColumn(), systemColumns.length);
    if (systemLastRow > 1) {
      systemSheet.getRange(2, 1, systemLastRow - 1, systemLastCol).clearContent();
    }
    if (systemRows.length > 0) {
      systemSheet.getRange(2, 1, systemRows.length, systemColumns.length).setValues(systemRows.map(function (row) {
        return formatRowValues(row, systemColumns);
      }));
    }
    writtenSheets.push('SYSTEM');
  }

  return {
    status: 'PASS',
    written_sheets: writtenSheets
  };
}
