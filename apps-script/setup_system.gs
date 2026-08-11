/** Stage 5 deterministic workbook bootstrap; canonical source is local Git from Stage 6. */

function setupSystem() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('setupSystem requires an active Google Spreadsheet.');
  }

  var manifest = STAGE5_SCHEMA_MANIFEST;
  var sheetsByName = prepareCanonicalSheets_(spreadsheet, manifest);
  manifest.sheets.forEach(function (sheetDefinition) {
    configureCanonicalSheet_(sheetsByName[sheetDefinition.name], sheetDefinition, sheetsByName);
  });
  seedSchemaMeta_(sheetsByName.Schema_Meta, manifest);
  appendMissingSeedRows_(
    sheetsByName.Reference_Values,
    manifest.referenceSeeds,
    'reference_value_id'
  );
  appendCalculationRuleSeeds_(sheetsByName.Calculation_Rules, manifest.calculationRuleSeeds);
  orderCanonicalSheets_(spreadsheet, manifest.sheetOrder);
  SpreadsheetApp.flush();

  return verifySetupSystem_();
}


function verifySetupSystem_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var manifest = STAGE5_SCHEMA_MANIFEST;
  var actualSheets = spreadsheet.getSheets();
  var actualNames = actualSheets.map(function (sheet) { return sheet.getName(); });
  if (JSON.stringify(actualNames) !== JSON.stringify(manifest.sheetOrder)) {
    throw new Error('Workbook sheet order differs from the canonical manifest.');
  }

  var totalColumns = 0;
  manifest.sheets.forEach(function (definition, index) {
    var sheet = actualSheets[index];
    var headers = sheet.getRange(1, 1, 1, definition.columns.length).getDisplayValues()[0];
    var expected = definition.columns.map(function (column) { return column.name; });
    if (JSON.stringify(headers) !== JSON.stringify(expected)) {
      throw new Error('Header mismatch after setup: ' + definition.name);
    }
    if (sheet.getFrozenRows() !== 1) {
      throw new Error('Header row is not frozen: ' + definition.name);
    }
    totalColumns += definition.columns.length;
  });
  if (totalColumns !== 136) {
    throw new Error('Canonical manifest must contain exactly 136 columns; got ' + totalColumns + '.');
  }
  return {
    status: 'PASS',
    spreadsheetId: spreadsheet.getId(),
    sheets: actualNames,
    totalColumns: totalColumns,
    schemaVersionId: manifest.schemaVersionId
  };
}


function prepareCanonicalSheets_(spreadsheet, manifest) {
  var canonical = {};
  manifest.sheetOrder.forEach(function (name) { canonical[name] = true; });
  var sheets = spreadsheet.getSheets();
  var existingCanonical = sheets.filter(function (sheet) { return canonical[sheet.getName()]; });
  var unknown = sheets.filter(function (sheet) { return !canonical[sheet.getName()]; });

  if (existingCanonical.length === 0 && unknown.length === 1 && isSheetEmpty_(unknown[0])) {
    unknown[0].setName(manifest.sheetOrder[0]);
    unknown = [];
  }
  if (unknown.length) {
    throw new Error(
      'Unknown sheets must be removed manually after confirming they are disposable: ' +
      unknown.map(function (sheet) { return sheet.getName(); }).join(', ')
    );
  }

  var byName = {};
  spreadsheet.getSheets().forEach(function (sheet) { byName[sheet.getName()] = sheet; });
  manifest.sheetOrder.forEach(function (name) {
    if (!byName[name]) {
      byName[name] = spreadsheet.insertSheet(name);
    }
  });
  return byName;
}


function configureCanonicalSheet_(sheet, definition, sheetsByName) {
  var headers = definition.columns.map(function (column) { return column.name; });
  validateOrCreateHeaders_(sheet, headers);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#eeeeee')
    .setFontColor('#000000')
    .setWrap(true);

  var bodyRowCount = Math.max(sheet.getMaxRows() - 1, 1);
  var bodyRange = sheet.getRange(2, 1, bodyRowCount, headers.length);
  bodyRange.clearDataValidations();
  definition.columns.forEach(function (column, columnIndex) {
    var range = sheet.getRange(2, columnIndex + 1, bodyRowCount, 1);
    range.setNumberFormat(numberFormatForType_(column.dataType));
    sheet.setColumnWidth(columnIndex + 1, columnWidthForType_(column.dataType));
    var rule = dataValidationForColumn_(column, sheetsByName);
    if (rule) {
      range.setDataValidation(rule);
    }
  });
}


function validateOrCreateHeaders_(sheet, expectedHeaders) {
  if (isSheetEmpty_(sheet)) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    return;
  }

  var actual = sheet.getRange(1, 1, 1, expectedHeaders.length).getDisplayValues()[0];
  if (JSON.stringify(actual) !== JSON.stringify(expectedHeaders)) {
    throw new Error('Incompatible headers in non-empty sheet: ' + sheet.getName());
  }
  if (sheet.getLastColumn() > expectedHeaders.length) {
    var extra = sheet.getRange(
      1,
      expectedHeaders.length + 1,
      sheet.getLastRow(),
      sheet.getLastColumn() - expectedHeaders.length
    );
    if (!extra.isBlank()) {
      throw new Error('Non-canonical data exists beyond expected columns in: ' + sheet.getName());
    }
  }
}


function dataValidationForColumn_(column, sheetsByName) {
  var builder = SpreadsheetApp.newDataValidation().setAllowInvalid(false);
  if (column.enumValues.length) {
    return builder.requireValueInList(column.enumValues, true).build();
  }
  if (column.referenceSheet) {
    var targetSheet = sheetsByName[column.referenceSheet];
    var targetDefinition = STAGE5_SCHEMA_MANIFEST.sheets.filter(function (sheet) {
      return sheet.name === column.referenceSheet;
    })[0];
    var targetIndex = targetDefinition.columns.map(function (item) { return item.name; })
      .indexOf(column.referenceColumn) + 1;
    var targetRange = targetSheet.getRange(2, targetIndex, Math.max(targetSheet.getMaxRows() - 1, 1), 1);
    return builder.requireValueInRange(targetRange, true).build();
  }
  if (column.dataType === 'boolean') {
    return builder.requireCheckbox().build();
  }
  if (column.dataType === 'integer') {
    var integerMinimum = null;
    if (column.validation.indexOf('integer >= 1') !== -1) {
      integerMinimum = 1;
    } else if (column.validation.indexOf('integer >= 0') !== -1) {
      integerMinimum = 0;
    }
    if (integerMinimum !== null) {
      return builder.requireFormulaSatisfied(
        integerValidationFormula_(column.order, integerMinimum)
      ).build();
    }
  }
  if (column.dataType === 'decimal') {
    if (column.validation.indexOf('number > 0') !== -1) {
      return builder.requireNumberGreaterThan(0).build();
    }
    if (column.validation.indexOf('number >= 0') !== -1) {
      return builder.requireNumberGreaterThanOrEqualTo(0).build();
    }
  }
  if (column.dataType === 'date' || column.dataType === 'datetime') {
    return builder.requireDate().build();
  }
  return null;
}


function numberFormatForType_(dataType) {
  if (dataType === 'integer') return '0';
  if (dataType === 'decimal') return '0.############';
  if (dataType === 'date') return 'yyyy-mm-dd';
  if (dataType === 'datetime') return 'yyyy-mm-dd hh:mm:ss';
  return '@';
}


function columnWidthForType_(dataType) {
  if (dataType === 'json') return 260;
  if (dataType === 'date' || dataType === 'datetime') return 150;
  if (dataType === 'decimal' || dataType === 'integer') return 110;
  return 180;
}


function seedSchemaMeta_(sheet, manifest) {
  var idColumn = columnIndexByName_('Schema_Meta', 'schema_version_id');
  var existing = sheet.getLastRow() > 1
    ? sheet.getRange(2, idColumn, sheet.getLastRow() - 1, 1).getDisplayValues()
    : [];
  var ids = existing.map(function (row) { return row[0]; });
  if (ids.indexOf(manifest.schemaVersionId) !== -1) {
    var rowIndex = ids.indexOf(manifest.schemaVersionId) + 2;
    assertSeedFields_(sheet, 'Schema_Meta', rowIndex, {
      schema_version_id: manifest.schemaVersionId,
      schema_name: manifest.schemaName,
      version: manifest.schemaVersion,
      status: 'ACTIVE',
      compatible_runtime_version: manifest.compatibleRuntimeVersion
    });
    return;
  }
  if (ids.length) {
    throw new Error('Schema_Meta contains an unknown schema record; refusing to overwrite it.');
  }

  var now = new Date();
  appendObjectRow_(sheet, 'Schema_Meta', {
    schema_version_id: manifest.schemaVersionId,
    schema_name: manifest.schemaName,
    version: manifest.schemaVersion,
    status: 'ACTIVE',
    effective_from: now,
    effective_to: '',
    compatible_runtime_version: manifest.compatibleRuntimeVersion,
    provenance: JSON.stringify(manifest.sourceArtifacts.concat(['setupSystem@' + now.toISOString()])),
    notes: 'Stage 5 deterministic bootstrap'
  });
}


function appendCalculationRuleSeeds_(sheet, seeds) {
  var today = new Date();
  seeds.forEach(function (seed) {
    var row = {};
    Object.keys(seed).forEach(function (key) { row[key] = seed[key]; });
    row.effective_from = today;
    appendMissingSeedRows_(sheet, [row], 'rule_version_id');
  });
}


function appendMissingSeedRows_(sheet, rows, idColumnName) {
  if (!rows.length) return;
  var sheetName = sheet.getName();
  var idColumn = columnIndexByName_(sheetName, idColumnName);
  var existingValues = sheet.getLastRow() > 1
    ? sheet.getRange(2, idColumn, sheet.getLastRow() - 1, 1).getDisplayValues()
    : [];
  var existing = {};
  existingValues.forEach(function (row, index) {
    if (row[0]) existing[row[0]] = index + 2;
  });
  var missing = [];
  rows.forEach(function (row) {
    if (existing[row[idColumnName]]) {
      assertSeedFields_(sheet, sheetName, existing[row[idColumnName]], row);
    } else {
      missing.push(row);
    }
  });
  if (!missing.length) return;
  var definition = sheetDefinition_(sheetName);
  var values = missing.map(function (row) {
    return definition.columns.map(function (column) {
      return Object.prototype.hasOwnProperty.call(row, column.name) ? row[column.name] : '';
    });
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, definition.columns.length)
    .setValues(values);
}


function appendObjectRow_(sheet, sheetName, valuesByName) {
  var definition = sheetDefinition_(sheetName);
  var values = definition.columns.map(function (column) {
    return Object.prototype.hasOwnProperty.call(valuesByName, column.name)
      ? valuesByName[column.name]
      : '';
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, values.length).setValues([values]);
}


function columnIndexByName_(sheetName, columnName) {
  var definition = sheetDefinition_(sheetName);
  var index = definition.columns.map(function (column) { return column.name; }).indexOf(columnName);
  if (index < 0) throw new Error('Unknown canonical field: ' + sheetName + '.' + columnName);
  return index + 1;
}


function assertSeedFields_(sheet, sheetName, rowIndex, expected) {
  var definition = sheetDefinition_(sheetName);
  var actual = sheet.getRange(rowIndex, 1, 1, definition.columns.length).getDisplayValues()[0];
  definition.columns.forEach(function (column, index) {
    if (!Object.prototype.hasOwnProperty.call(expected, column.name)) return;
    if (column.dataType === 'date' || column.dataType === 'datetime') return;
    if (String(actual[index]) !== String(expected[column.name])) {
      throw new Error(
        'Seed conflict in ' + sheetName + ' row ' + rowIndex + ', field ' + column.name + '.'
      );
    }
  });
}


function sheetDefinition_(sheetName) {
  var matches = STAGE5_SCHEMA_MANIFEST.sheets.filter(function (item) {
    return item.name === sheetName;
  });
  if (matches.length !== 1) throw new Error('Unknown canonical sheet: ' + sheetName);
  return matches[0];
}


function columnLetter_(columnNumber) {
  var result = '';
  var value = columnNumber;
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}


function integerValidationFormula_(columnNumber, minimum) {
  var cell = columnLetter_(columnNumber) + '2';
  return '=ISNUMBER(' + cell + ')*(' + cell + '=INT(' + cell + '))*(' +
    cell + '>=' + minimum + ')=1';
}


function orderCanonicalSheets_(spreadsheet, order) {
  order.forEach(function (name, index) {
    spreadsheet.setActiveSheet(spreadsheet.getSheetByName(name));
    spreadsheet.moveActiveSheet(index + 1);
  });
}


function isSheetEmpty_(sheet) {
  return sheet.getDataRange().isBlank();
}
