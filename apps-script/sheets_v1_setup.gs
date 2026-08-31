/** Sheets V1 deterministic workbook adapter; canonical source is contracts/sheets. */

function setupSheetsV1() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('setupSheetsV1 requires an active Google Spreadsheet.');
  }
  return setupSheetsV1_(spreadsheet);
}


function setupSheetsV1_(spreadsheet) {
  var definitions = sheetsV1DefinitionsInOrder_(SHEETS_V1_MANIFEST);
  definitions.forEach(function (definition) {
    var sheet = spreadsheet.getSheetByName(definition.sheet_name);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(definition.sheet_name);
    }
    sheetsV1ConfigureSheet_(sheet, definition);
  });
  sheetsV1OrderSheets_(spreadsheet, definitions.map(function (definition) {
    return definition.sheet_name;
  }));
  return {
    status: 'PASS',
    manifest: SHEETS_V1_MANIFEST.manifest_name,
    schemaVersion: SHEETS_V1_MANIFEST.schema_version,
    sheets: definitions.map(function (definition) { return definition.sheet_name; })
  };
}


function sheetsV1DefinitionsInOrder_(manifest) {
  var definitions = manifest.sheets.slice();
  definitions.sort(function (left, right) { return left.order - right.order; });
  return definitions;
}


function sheetsV1ConfigureSheet_(sheet, definition) {
  var headers = definition.columns.map(function (column) { return column.name; });
  sheetsV1ValidateOrCreateHeaders_(sheet, headers);
  sheet.setFrozenRows(1);

  var bodyRowCount = Math.max(sheet.getMaxRows() - 1, 1);
  sheet.getRange(2, 1, bodyRowCount, headers.length).clearDataValidations();

  definition.columns.forEach(function (column, index) {
    var columnRange = sheet.getRange(2, index + 1, bodyRowCount, 1);
    var rule = sheetsV1ValidationForColumn_(column);
    if (rule) {
      columnRange.setDataValidation(rule);
    }
    if (column.visibility === 'HIDDEN') {
      sheet.hideColumn(index + 1);
    } else {
      sheet.showColumn(index + 1);
    }
  });
}


function sheetsV1ValidateOrCreateHeaders_(sheet, expectedHeaders) {
  if (sheetsV1IsSheetEmpty_(sheet)) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    return;
  }

  var actual = sheet.getRange(1, 1, 1, expectedHeaders.length).getDisplayValues()[0];
  if (JSON.stringify(actual) !== JSON.stringify(expectedHeaders)) {
    throw new Error('Incompatible headers in non-empty sheet: ' + sheet.getName());
  }
  if (sheet.getLastColumn() > expectedHeaders.length) {
    var extraRows = Math.max(sheet.getLastRow(), 1);
    var extraColumns = sheet.getLastColumn() - expectedHeaders.length;
    var extra = sheet.getRange(1, expectedHeaders.length + 1, extraRows, extraColumns);
    if (!extra.isBlank()) {
      throw new Error('Non-canonical data exists beyond expected columns in: ' + sheet.getName());
    }
  }
}


function sheetsV1ValidationForColumn_(column) {
  var validation = column.validation || {};
  var builder = SpreadsheetApp.newDataValidation().setAllowInvalid(false);

  if (Object.prototype.toString.call(validation['enum']) === '[object Array]' && validation['enum'].length) {
    return builder.requireValueInList(validation['enum'], true).build();
  }
  if (validation.format === 'date-time' || validation.format === 'date') {
    return builder.requireDate().build();
  }
  if (column.type === 'boolean') {
    return builder.requireCheckbox().build();
  }
  if (column.type === 'number' || column.type === 'integer') {
    if (typeof validation.minimum === 'number') {
      return builder.requireNumberGreaterThanOrEqualTo(validation.minimum).build();
    }
  }
  return null;
}


function sheetsV1OrderSheets_(spreadsheet, order) {
  order.forEach(function (name, index) {
    spreadsheet.setActiveSheet(spreadsheet.getSheetByName(name));
    spreadsheet.moveActiveSheet(index + 1);
  });
}


function sheetsV1IsSheetEmpty_(sheet) {
  return sheet.getDataRange().isBlank();
}