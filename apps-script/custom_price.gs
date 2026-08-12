/** Human-facing working price UX and deterministic adapter to technical sheets. */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('AI Furniture')
    .addItem('Обновить актуальный прайс', 'syncCustomPrice')
    .addToUi();
}


function syncCustomPrice() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('syncCustomPrice requires an active Google Spreadsheet.');
  var ux = HUMAN_UX_MANIFEST;
  var customSheet = spreadsheet.getSheetByName(ux.sheetName);
  if (!customSheet) throw new Error('Сначала выполните setupSystem(): лист Custom_Price отсутствует.');
  var catalogSheet = spreadsheet.getSheetByName('Catalog_Items');
  var workingSheet = spreadsheet.getSheetByName('spr_price');
  if (!catalogSheet || !workingSheet) throw new Error('Technical price sheets are missing.');

  var lastRow = Math.max(customSheet.getLastRow(), ux.dataStartRow - 1);
  var width = ux.columns.length;
  var values = lastRow >= ux.dataStartRow
    ? customSheet.getRange(ux.dataStartRow, 1, lastRow - ux.dataStartRow + 1, width).getValues()
    : [];
  var fxRates = readFxRates_(customSheet, ux);
  var seenIds = {};
  var normalized = [];
  var errors = [];
  values.forEach(function (row, offset) {
    var rowNumber = ux.dataStartRow + offset;
    if (isCustomPriceRowBlank_(row)) return;
    try {
      var item = normalizeCustomPriceRow_(
        row,
        rowNumber,
        new Date(),
        function () { return 'CP_' + Utilities.getUuid().replace(/-/g, '').toUpperCase(); },
        fxRates
      );
      if (seenIds[item.customPriceId]) {
        throw new Error('duplicate system identity; contact the administrator');
      }
      seenIds[item.customPriceId] = true;
      normalized.push(item);
    } catch (error) {
      errors.push('Строка ' + rowNumber + ': ' + error.message);
    }
  });
  if (errors.length) {
    throw new Error('Актуальный прайс содержит ошибки:\n' + errors.join('\n'));
  }

  normalized.forEach(function (item) {
    writeCustomPriceSystemFields_(customSheet, item);
    upsertObjectRow_(catalogSheet, 'Catalog_Items', 'catalog_item_code', item.catalog);
    upsertObjectRow_(workingSheet, 'spr_price', 'working_price_id', item.workingPrice);
  });
  deactivateMissingCustomPriceRows_(catalogSheet, workingSheet, seenIds);
  SpreadsheetApp.flush();
  return {
    status: 'PASS',
    rows: normalized.length,
    activeRows: normalized.filter(function (item) { return item.active; }).length,
    publishedRowsChanged: 0
  };
}


function normalizeCustomPriceRow_(row, rowNumber, now, idFactory, fxRates) {
  var ux = HUMAN_UX_MANIFEST;
  var index = humanUxColumnIndexes_();
  var text = function (key) { return String(row[index[key]] || '').trim(); };
  var category = text('category');
  var displayName = text('display_name');
  var displayUnit = text('unit');
  var currency = text('currency').toUpperCase();
  var displayMode = text('pricing_mode');
  var sourcePrice = numberOrNull_(row[index.source_price]);
  var manualRate = numberOrNull_(row[index.manual_fx_rate]);
  var activeValue = row[index.active];
  if (!Object.prototype.hasOwnProperty.call(ux.categories, category)) throw new Error('выберите Категорию из списка');
  if (!displayName) throw new Error('заполните Наименование');
  if (!Object.prototype.hasOwnProperty.call(ux.units, displayUnit)) throw new Error('выберите Ед. изм. из списка');
  if (sourcePrice === null || sourcePrice < 0) throw new Error('Цена должна быть числом не меньше 0');
  if (ux.currencies.indexOf(currency) === -1) throw new Error('выберите Валюту из списка');
  if (!Object.prototype.hasOwnProperty.call(ux.pricingModes, displayMode)) throw new Error('выберите Режим цены из списка');
  if (activeValue !== true && activeValue !== false) throw new Error('поле Активна должно быть checkbox');

  var machineMode = ux.pricingModes[displayMode];
  var currentRate = null;
  var usedRate = null;
  var currentPriceRub = null;
  var fxRateSource = '';
  if (machineMode === 'MANUAL_RUB') {
    if (currency !== 'RUB') throw new Error('для режима Рубли валюта должна быть RUB');
    currentPriceRub = sourcePrice;
  } else {
    if (currency === 'RUB') throw new Error('для валютного режима выберите USD, EUR или CNY');
    currentRate = numberOrNull_(fxRates[currency]);
    if (machineMode === 'FX_AUTO') {
      if (currentRate === null || currentRate <= 0) throw new Error('текущий курс ' + currency + ' ещё не получен');
      usedRate = currentRate;
      fxRateSource = 'GOOGLEFINANCE';
    } else {
      if (manualRate === null || manualRate <= 0) throw new Error('Курс ручной должен быть больше 0');
      usedRate = manualRate;
      fxRateSource = 'MANUAL';
    }
    currentPriceRub = sourcePrice * usedRate;
  }

  var customPriceId = text('custom_price_id') || idFactory();
  if (!/^CP_[A-Z0-9]{16,64}$/.test(customPriceId)) throw new Error('повреждён system identity; contact the administrator');
  var identityToken = customPriceId.slice(3);
  var catalogItemCode = 'CAT_CP_' + identityToken;
  var priceCode = 'PRICE_CP_' + identityToken;
  var workingPriceId = 'WP_CP_' + identityToken;
  assertSystemField_(text('catalog_item_code'), catalogItemCode);
  assertSystemField_(text('price_code'), priceCode);
  assertSystemField_(text('working_price_id'), workingPriceId);
  var sourceRef = 'Custom_Price:' + customPriceId;
  var comment = text('comment');
  var active = activeValue === true;
  return {
    rowNumber: rowNumber,
    customPriceId: customPriceId,
    catalogItemCode: catalogItemCode,
    priceCode: priceCode,
    workingPriceId: workingPriceId,
    currentRate: currentRate,
    currentPriceRub: currentPriceRub,
    active: active,
    updatedAt: now,
    catalog: {
      catalog_item_code: catalogItemCode,
      catalog_item_type: ux.categories[category],
      display_name: displayName,
      default_unit: ux.units[displayUnit],
      price_code: priceCode,
      lifecycle_status: active ? 'ACTIVE' : 'RETIRED',
      provenance: JSON.stringify([sourceRef]),
      notes: 'Категория: ' + category + (comment ? '; ' + comment : '')
    },
    workingPrice: {
      working_price_id: workingPriceId,
      price_code: priceCode,
      catalog_item_code: catalogItemCode,
      display_name: displayName,
      unit: ux.units[displayUnit],
      pricing_mode: machineMode,
      source_currency: machineMode === 'MANUAL_RUB' ? '' : currency,
      source_price: machineMode === 'MANUAL_RUB' ? '' : sourcePrice,
      fx_rate_source: fxRateSource,
      fx_rate_manual: machineMode === 'FX_MANUAL' ? manualRate : '',
      fx_rate_current: machineMode === 'MANUAL_RUB' ? '' : currentRate,
      fx_rate_used_preview: machineMode === 'MANUAL_RUB' ? '' : usedRate,
      current_price_rub: currentPriceRub,
      status: active ? 'READY' : 'INACTIVE',
      source_ref: sourceRef,
      updated_at: now,
      notes: comment
    }
  };
}


function configureCustomPriceSheet_(sheet) {
  var ux = HUMAN_UX_MANIFEST;
  var headers = ux.columns.map(function (column) { return column.label; });
  if (isSheetEmpty_(sheet)) {
    sheet.getRange(1, 1).setValue(ux.title + ' — ' + ux.description);
    sheet.getRange(ux.headerRow, 1, 1, headers.length).setValues([headers]);
  } else {
    var actual = sheet.getRange(ux.headerRow, 1, 1, headers.length).getDisplayValues()[0];
    if (JSON.stringify(actual) !== JSON.stringify(headers)) {
      throw new Error('Incompatible headers in non-empty sheet: ' + ux.sheetName);
    }
    sheet.getRange(1, 1).setValue(ux.title + ' — ' + ux.description);
  }
  sheet.setFrozenRows(ux.headerRow);
  sheet.getRange(1, 1, 1, 12).breakApart().mergeAcross().setFontWeight('bold').setFontSize(12)
    .setBackground('#d9ead3').setFontColor('#274e13').setWrap(true);
  sheet.setRowHeight(1, 42);
  sheet.getRange(ux.headerRow, 1, 1, headers.length).setFontWeight('bold')
    .setBackground('#38761d').setFontColor('#ffffff').setWrap(true);
  var bodyRows = Math.max(sheet.getMaxRows() - ux.dataStartRow + 1, 1);
  ux.columns.forEach(function (column, offset) {
    var range = sheet.getRange(ux.dataStartRow, offset + 1, bodyRows, 1);
    sheet.setColumnWidth(offset + 1, column.width);
    range.setNumberFormat(column.format || '@');
    if (column.role === 'editable') range.setBackground('#fff2cc');
    else range.setBackground('#e7eef8');
    range.clearDataValidations();
    var rule = customPriceValidation_(column.validation, ux);
    if (rule) range.setDataValidation(rule);
  });
  resetCustomPriceFilter_(sheet, ux, bodyRows);
  configureFxCache_(sheet, ux);
  protectCustomPriceSystemColumns_(sheet, ux, bodyRows);
}


function verifyCustomPriceSheet_(sheet) {
  var ux = HUMAN_UX_MANIFEST;
  var headers = sheet.getRange(ux.headerRow, 1, 1, ux.columns.length).getDisplayValues()[0];
  var expected = ux.columns.map(function (column) { return column.label; });
  if (JSON.stringify(headers) !== JSON.stringify(expected)) throw new Error('Custom_Price headers differ from UX manifest.');
  if (sheet.getFrozenRows() !== ux.headerRow) throw new Error('Custom_Price title/header rows are not frozen.');
  return true;
}


function customPriceValidation_(kind, ux) {
  var builder = SpreadsheetApp.newDataValidation().setAllowInvalid(false);
  if (kind === 'category') return builder.requireValueInList(Object.keys(ux.categories), true).build();
  if (kind === 'unit') return builder.requireValueInList(Object.keys(ux.units), true).build();
  if (kind === 'currency') return builder.requireValueInList(ux.currencies, true).build();
  if (kind === 'pricingMode') return builder.requireValueInList(Object.keys(ux.pricingModes), true).build();
  if (kind === 'boolean') return builder.requireCheckbox().build();
  return null;
}


function configureFxCache_(sheet, ux) {
  var cacheStartColumn = 18;
  sheet.getRange(2, cacheStartColumn, 1, 2).setValues([['FX currency cache', 'FX rate cache']]);
  var currencies = ux.fxCache.map(function (entry) { return [entry.currency]; });
  var formulas = ux.fxCache.map(function (entry) { return [entry.formula]; });
  sheet.getRange(3, cacheStartColumn, currencies.length, 1).setValues(currencies);
  sheet.getRange(3, cacheStartColumn + 1, formulas.length, 1).setFormulas(formulas).setNumberFormat('0.0000');
  sheet.hideColumns(13, 7);
}


function protectCustomPriceSystemColumns_(sheet, ux, bodyRows) {
  sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(function (protection) {
    if (String(protection.getDescription() || '').indexOf('Human UX managed:') === 0) protection.remove();
  });
  [[8, 2], [11, 1], [13, 7]].forEach(function (span) {
    var protection = sheet.getRange(ux.dataStartRow, span[0], bodyRows, span[1]).protect();
    protection.setDescription('Human UX managed: calculated/technical fields').setWarningOnly(true);
  });
}


function resetCustomPriceFilter_(sheet, ux, bodyRows) {
  var filter = sheet.getFilter();
  if (filter) filter.remove();
  sheet.getRange(ux.headerRow, 1, bodyRows + 1, 12).createFilter();
}


function readFxRates_(sheet, ux) {
  var values = sheet.getRange(3, 18, ux.fxCache.length, 2).getValues();
  var result = {};
  values.forEach(function (row) { result[String(row[0])] = row[1]; });
  return result;
}


function writeCustomPriceSystemFields_(sheet, item) {
  var row = item.rowNumber;
  sheet.getRange(row, 8).setValue(item.currentRate === null ? '' : item.currentRate);
  sheet.getRange(row, 9).setValue(item.currentPriceRub);
  sheet.getRange(row, 11).setValue(item.updatedAt);
  sheet.getRange(row, 13, 1, 4).setValues([[
    item.customPriceId, item.catalogItemCode, item.priceCode, item.workingPriceId
  ]]);
}


function upsertObjectRow_(sheet, sheetName, idColumnName, object) {
  var definition = sheetDefinition_(sheetName);
  var idIndex = columnIndexByName_(sheetName, idColumnName);
  var rowIndex = null;
  if (sheet.getLastRow() > 1) {
    var ids = sheet.getRange(2, idIndex, sheet.getLastRow() - 1, 1).getDisplayValues();
    ids.some(function (row, offset) {
      if (row[0] === String(object[idColumnName])) { rowIndex = offset + 2; return true; }
      return false;
    });
  }
  var values = definition.columns.map(function (column) {
    return Object.prototype.hasOwnProperty.call(object, column.name) ? object[column.name] : '';
  });
  sheet.getRange(rowIndex || sheet.getLastRow() + 1, 1, 1, values.length).setValues([values]);
}


function deactivateMissingCustomPriceRows_(catalogSheet, workingSheet, seenIds) {
  var workingDefinition = sheetDefinition_('spr_price');
  if (workingSheet.getLastRow() <= 1) return;
  var workingValues = workingSheet.getRange(2, 1, workingSheet.getLastRow() - 1, workingDefinition.columns.length).getValues();
  var indexes = {};
  workingDefinition.columns.forEach(function (column, offset) { indexes[column.name] = offset; });
  workingValues.forEach(function (row, offset) {
    var match = String(row[indexes.source_ref] || '').match(/^Custom_Price:(CP_[A-Z0-9]+)$/);
    if (!match || seenIds[match[1]]) return;
    workingSheet.getRange(offset + 2, indexes.status + 1).setValue('INACTIVE');
    var catalogCode = String(row[indexes.catalog_item_code] || '');
    retireCatalogItem_(catalogSheet, catalogCode);
  });
}


function retireCatalogItem_(sheet, catalogCode) {
  if (!catalogCode || sheet.getLastRow() <= 1) return;
  var idIndex = columnIndexByName_('Catalog_Items', 'catalog_item_code');
  var statusIndex = columnIndexByName_('Catalog_Items', 'lifecycle_status');
  var ids = sheet.getRange(2, idIndex, sheet.getLastRow() - 1, 1).getDisplayValues();
  ids.some(function (row, offset) {
    if (row[0] !== catalogCode) return false;
    sheet.getRange(offset + 2, statusIndex).setValue('RETIRED');
    return true;
  });
}


function humanUxColumnIndexes_() {
  var result = {};
  HUMAN_UX_MANIFEST.columns.forEach(function (column, offset) { result[column.key] = offset; });
  return result;
}


function isCustomPriceRowBlank_(row) {
  return row.slice(0, 12).every(function (value) {
    return value === '' || value === null || value === false;
  });
}


function numberOrNull_(value) {
  if (value === '' || value === null || typeof value === 'boolean') return null;
  var number = Number(value);
  return isFinite(number) ? number : null;
}


function assertSystemField_(actual, expected) {
  if (actual && actual !== expected) throw new Error('повреждены hidden technical fields; contact the administrator');
}
