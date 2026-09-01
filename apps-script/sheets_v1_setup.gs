/** Sheets V1 deterministic workbook adapter; canonical source is contracts/sheets. */

function setupSheetsV1() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('setupSheetsV1 requires an active Google Spreadsheet.');
  return setupSheetsV1_(spreadsheet);
}


function getSheetsV1Spreadsheet_() {
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  var id = PropertiesService.getScriptProperties().getProperty('SHEETS_V1_SPREADSHEET_ID');
  if (!id) throw new Error('Set SHEETS_V1_SPREADSHEET_ID or bind the script to the DEV Spreadsheet.');
  return SpreadsheetApp.openById(id);
}


function backupAndSetupSheetsV1() {
  var spreadsheet = getSheetsV1Spreadsheet_();
  var stamp = Utilities.formatDate(new Date(), 'Etc/UTC', 'yyyyMMdd-HHmmss');
  var backup = spreadsheet.copy(spreadsheet.getName() + ' DEV backup ' + stamp);
  PropertiesService.getScriptProperties().setProperty('SHEETS_V1_SPREADSHEET_ID', spreadsheet.getId());
  if (typeof getOpenRouterVisionModel_ === 'function') getOpenRouterVisionModel_();
  var result = setupSheetsV1_(spreadsheet, {reset: true, seed: true, prune: true});
  result.backup_id = backup.getId();
  result.backup_url = backup.getUrl();
  result.spreadsheet_id = spreadsheet.getId();
  result.spreadsheet_url = spreadsheet.getUrl();
  return result;
}


function setupSheetsV1_(spreadsheet, options) {
  options = options || {};
  var definitions = sheetsV1DefinitionsInOrder_(SHEETS_V1_MANIFEST);
  definitions.forEach(function (definition) {
    var sheet = spreadsheet.getSheetByName(definition.sheet_name);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(definition.sheet_name);
    }
    if (options.reset === true) sheet.clear();
    sheetsV1ConfigureSheet_(sheet, definition);
  });
  if (options.seed === true) sheetsV1ApplyDeploymentSeed_(spreadsheet, definitions);
  if (options.prune === true) sheetsV1PruneExtraSheets_(spreadsheet, definitions);
  sheetsV1OrderSheets_(spreadsheet, definitions.map(function (definition) {
    return definition.sheet_name;
  }));
  return {
    status: 'PASS',
    manifest: SHEETS_V1_MANIFEST.manifest_name,
    schemaVersion: SHEETS_V1_MANIFEST.schema_version,
    sheets: definitions.map(function (definition) { return definition.sheet_name; }),
    price_rows: options.seed === true ? SHEETS_V1_DEPLOYMENT_SEED.Prices.length : null,
    construction_default_rows: options.seed === true ? SHEETS_V1_DEPLOYMENT_SEED.Construction_Defaults.length : null
  };
}


function sheetsV1ApplyDeploymentSeed_(spreadsheet, definitions) {
  ['Prices', 'Construction_Defaults'].forEach(function (sheetName) {
    var definition = definitions.filter(function (item) { return item.sheet_name === sheetName; })[0];
    var rows = SHEETS_V1_DEPLOYMENT_SEED[sheetName];
    var columns = definition.columns.slice().sort(function (left, right) { return left.order - right.order; });
    var matrix = rows.map(function (row) {
      return columns.map(function (column) {
        return sheetsV1NormalizeSeedValue_(row[column.name], column);
      });
    });
    var sheet = spreadsheet.getSheetByName(sheetName);
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, columns.length).clearContent();
    if (matrix.length) sheet.getRange(2, 1, matrix.length, columns.length).setValues(matrix);
  });
}


function sheetsV1NormalizeSeedValue_(value, column) {
  if (value === undefined || value === null || value === '') return '';
  var validation = column.validation || {};
  var types = Object.prototype.toString.call(column.type) === '[object Array]' ? column.type : [column.type];

  if (Object.prototype.toString.call(validation['enum']) === '[object Array]') {
    var text = String(value);
    if (validation['enum'].indexOf(text) !== -1) return text;
    if (column.name === 'category' && text === 'MATERIAL' && validation['enum'].indexOf('MATERIALS') !== -1) return 'MATERIALS';
    if (validation['enum'].indexOf('OTHER') !== -1) return 'OTHER';
    throw new Error('Deployment seed value is outside enum for ' + column.name + ': ' + text);
  }
  if (validation.format === 'date-time' || validation.format === 'date') {
    var date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) throw new Error('Deployment seed date is invalid for ' + column.name + '.');
    return date;
  }
  if (types.indexOf('boolean') !== -1 && (typeof value === 'boolean' || /^(true|false)$/i.test(String(value)))) {
    return typeof value === 'boolean' ? value : String(value).toLowerCase() === 'true';
  }
  if ((types.indexOf('number') !== -1 || types.indexOf('integer') !== -1) && typeof value === 'number') {
    if (!isFinite(value)) throw new Error('Deployment seed number is invalid for ' + column.name + '.');
    return value;
  }
  if (types.indexOf('string') !== -1) return String(value);
  return value;
}


function sheetsV1PruneExtraSheets_(spreadsheet, definitions) {
  var allowed = {};
  definitions.forEach(function (definition) { allowed[definition.sheet_name] = true; });
  spreadsheet.getSheets().slice().forEach(function (sheet) {
    if (!allowed[sheet.getName()]) spreadsheet.deleteSheet(sheet);
  });
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
      sheet.hideColumns(index + 1);
    } else {
      sheet.showColumns(index + 1);
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
