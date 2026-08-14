/** Canonical sheet readers and controlled Stage 8 module-size synchronization. */

function readCanonicalSheetRows_(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error('Canonical sheet is missing: ' + sheetName);
  if (sheet.getLastRow() < 2) return [];
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getDisplayValues()
    .filter(function (values) { return values.some(function (value) { return value !== ''; }); })
    .map(function (values) {
      var row = {};
      headers.forEach(function (header, index) { row[header] = values[index]; });
      return row;
    });
}


function loadStage8MasterData_() {
  return {
    moduleSizeRules: readCanonicalSheetRows_('Module_Size_Rules'),
    moduleSizeRulesVersion: STAGE8_MODULE_SIZE_RULES_VERSION,
    moduleRecipes: readCanonicalSheetRows_('Module_Recipes'),
    moduleRecipeItems: readCanonicalSheetRows_('Module_Recipe_Items'),
    catalogItems: readCanonicalSheetRows_('Catalog_Items'),
    calculationRules: readCanonicalSheetRows_('Calculation_Rules'),
    pricebookVersions: readCanonicalSheetRows_('Pricebook_Versions'),
    prices: readCanonicalSheetRows_('Prices')
  };
}


function syncStage8ModuleSizeRules() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName('Module_Size_Rules');
  if (!sheet) throw new Error('Run setupSystem() before module-size synchronization.');
  appendMissingSeedRows_(sheet, STAGE8_MODULE_SIZE_RULES, 'module_rule_id');
  SpreadsheetApp.flush();
  var rows = readCanonicalSheetRows_('Module_Size_Rules');
  var managed = {};
  STAGE8_MODULE_SIZE_RULES.forEach(function (row) { managed[row.module_rule_id] = row; });
  var seen = {};
  rows.forEach(function (row) {
    if (!managed[row.module_rule_id]) return;
    if (seen[row.module_rule_id]) throw new Error('Duplicate managed module rule: ' + row.module_rule_id);
    seen[row.module_rule_id] = true;
    ['module_class', 'dimension', 'size_value_mm', 'size_qualifier', 'rank',
      'rule_status', 'source_layer', 'source_record_id', 'lifecycle_status'].forEach(function (field) {
      if (String(row[field]) !== String(managed[row.module_rule_id][field])) {
        throw new Error('Managed module rule conflict: ' + row.module_rule_id + '.' + field);
      }
    });
  });
  var missing = Object.keys(managed).filter(function (id) { return !seen[id]; });
  if (missing.length) throw new Error('Managed module rules missing after sync: ' + missing.join(', '));
  return {status: 'PASS', version: STAGE8_MODULE_SIZE_RULES_VERSION,
    managedRows: Object.keys(managed).length, unknownRowsPreserved: rows.length - Object.keys(managed).length};
}
