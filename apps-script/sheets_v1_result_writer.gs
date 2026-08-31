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

  // Helper to find sheet definition in manifest
  function getSheetDefinition(sheetName) {
    for (var i = 0; i < SHEETS_V1_MANIFEST.sheets.length; i += 1) {
      if (SHEETS_V1_MANIFEST.sheets[i].sheet_name === sheetName) {
        return SHEETS_V1_MANIFEST.sheets[i];
      }
    }
    throw new Error('Sheet definition not found in SHEETS_V1_MANIFEST: ' + sheetName);
  }

  // Helper to extract row values according to column definitions in manifest
  function formatRowValues(rowObj, columns) {
    var values = [];
    for (var c = 0; c < columns.length; c += 1) {
      var colName = columns[c].name;
      var val = rowObj[colName];
      if (val === undefined || val === null) {
        values.push('');
      } else {
        values.push(val);
      }
    }
    return values;
  }

  // 1. BOM_LAST: Overwrite data rows, preserve headers
  if (bundle.BOM_LAST) {
    var bomDef = getSheetDefinition('BOM_LAST');
    var bomSheet = spreadsheet.getSheetByName('BOM_LAST');
    if (!bomSheet) {
      throw new Error('Sheet BOM_LAST does not exist in spreadsheet.');
    }

    var bomColumns = bomDef.columns.slice().sort(function (a, b) { return a.order - b.order; });
    var bomRows = Array.isArray(bundle.BOM_LAST) ? bundle.BOM_LAST : [];

    // Clear existing data rows (from row 2 down)
    var lastRow = bomSheet.getLastRow();
    var lastCol = Math.max(bomSheet.getLastColumn(), bomColumns.length);
    if (lastRow > 1) {
      bomSheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
    }

    if (bomRows.length > 0) {
      var matrix = [];
      for (var b = 0; b < bomRows.length; b += 1) {
        matrix.push(formatRowValues(bomRows[b], bomColumns));
      }
      bomSheet.getRange(2, 1, matrix.length, bomColumns.length).setValues(matrix);
    }
    writtenSheets.push('BOM_LAST');
  }

  // 2. CALC_LOG: Append one row, preserve headers & existing rows
  if (bundle.CALC_LOG) {
    var logDef = getSheetDefinition('CALC_LOG');
    var logSheet = spreadsheet.getSheetByName('CALC_LOG');
    if (!logSheet) {
      throw new Error('Sheet CALC_LOG does not exist in spreadsheet.');
    }

    var logColumns = logDef.columns.slice().sort(function (a, b) { return a.order - b.order; });
    var logRowValues = formatRowValues(bundle.CALC_LOG, logColumns);

    var targetRow = logSheet.getLastRow() + 1;
    if (targetRow < 2) {
      targetRow = 2;
    }
    logSheet.getRange(targetRow, 1, 1, logColumns.length).setValues([logRowValues]);
    writtenSheets.push('CALC_LOG');
  }

  // 3. SYSTEM: Overwrite data rows, preserve headers
  if (bundle.SYSTEM) {
    var sysDef = getSheetDefinition('SYSTEM');
    var sysSheet = spreadsheet.getSheetByName('SYSTEM');
    if (!sysSheet) {
      throw new Error('Sheet SYSTEM does not exist in spreadsheet.');
    }

    var sysColumns = sysDef.columns.slice().sort(function (a, b) { return a.order - b.order; });
    var sysRows = Array.isArray(bundle.SYSTEM) ? bundle.SYSTEM : [];

    // Clear existing data rows (from row 2 down)
    var sysLastRow = sysSheet.getLastRow();
    var sysLastCol = Math.max(sysSheet.getLastColumn(), sysColumns.length);
    if (sysLastRow > 1) {
      sysSheet.getRange(2, 1, sysLastRow - 1, sysLastCol).clearContent();
    }

    if (sysRows.length > 0) {
      var sysMatrix = [];
      for (var s = 0; s < sysRows.length; s += 1) {
        sysMatrix.push(formatRowValues(sysRows[s], sysColumns));
      }
      sysSheet.getRange(2, 1, sysMatrix.length, sysColumns.length).setValues(sysMatrix);
    }
    writtenSheets.push('SYSTEM');
  }

  return {
    status: 'PASS',
    written_sheets: writtenSheets
  };
}
