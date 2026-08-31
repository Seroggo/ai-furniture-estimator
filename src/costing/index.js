/**
 * Costing and BOM V1 deterministic calculation engine.
 *
 * Pipeline: Construction Core result + Prices -> Price Snapshot -> Costing -> BOM bundle
 * -> BOM_LAST / CALC_LOG / SYSTEM rows.
 *
 * Pure ECMAScript - no external dependencies, no network calls, no input mutations.
 */

var PRICE_CATEGORIES = ['MATERIALS', 'EDGE', 'HARDWARE', 'WORKS', 'OTHER'];

/**
 * Deep clone an object or array.
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(deepClone);
  }
  var copy = {};
  var keys = Object.keys(obj);
  for (var i = 0; i < keys.length; i += 1) {
    copy[keys[i]] = deepClone(obj[keys[i]]);
  }
  return copy;
}

/**
 * Deep freeze an object or array.
 */
function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object' || Object.isFrozen(obj)) {
    return obj;
  }
  Object.freeze(obj);
  var keys = Object.keys(obj);
  for (var i = 0; i < keys.length; i += 1) {
    deepFreeze(obj[keys[i]]);
  }
  return obj;
}

/**
 * Deterministically sort object keys for JSON serialization.
 */
function sortKeys(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortKeys);
  }
  var sorted = {};
  var keys = Object.keys(obj).sort();
  for (var i = 0; i < keys.length; i += 1) {
    sorted[keys[i]] = sortKeys(obj[keys[i]]);
  }
  return sorted;
}

function stableJsonStringify(obj) {
  if (obj === undefined) {
    return null;
  }
  return JSON.stringify(sortKeys(obj));
}

/**
 * Round a number to 6 decimal places for deterministic precision.
 */
function round6(val) {
  if (typeof val !== 'number' || isNaN(val)) return 0;
  return Math.round(val * 1000000) / 1000000;
}

/**
 * Round a currency amount to 2 decimal places.
 */
function round2(val) {
  if (typeof val !== 'number' || isNaN(val)) return 0;
  return Math.round(val * 100) / 100;
}

function isActiveRow(row) {
  return row.active === true || row.active === 'TRUE' || row.active === 'true' || row.active === 1;
}

function fxRateFor(fromCurrency, targetCurrency, fxRates) {
  if (!fromCurrency || !targetCurrency) {
    throw new Error('Currency codes are required for FX conversion.');
  }
  if (fromCurrency === targetCurrency) {
    return 1;
  }
  var pairKey = fromCurrency + '/' + targetCurrency;
  if (fxRates && typeof fxRates[pairKey] === 'number' && fxRates[pairKey] > 0) {
    return fxRates[pairKey];
  }
  throw new Error('Missing FX rate for ' + pairKey + '; no network rate lookup is allowed.');
}

/**
 * Build an immutable price snapshot from Prices sheet rows (PRICES_V1 contract).
 *
 * Only active rows are included. Prices are converted to numbers; currency and
 * unit are preserved; FX conversion to targetCurrency uses only the supplied
 * FxRates map and throws when a required rate is missing.
 *
 * @param {Array<Object>} priceRows - rows matching the PRICES_V1 contract
 * @param {Object} [options] - { created_at, TargetCurrency, FxRates }
 * @returns {Object} Immutable price snapshot
 */
function buildPriceSnapshot(priceRows, options) {
  if (!Array.isArray(priceRows)) {
    throw new Error('buildPriceSnapshot: priceRows must be an array');
  }
  var opts = options || {};
  var createdAt = opts.created_at || opts.Created_at || null;
  var targetCurrency = opts.TargetCurrency || opts.targetCurrency || opts.target_currency || null;
  var fxRates = opts.FxRates || opts.fxRates || opts.fx_rates || {};
  var normalizedTarget = targetCurrency ? String(targetCurrency).toUpperCase() : null;

  var activeItems = [];
  for (var i = 0; i < priceRows.length; i += 1) {
    var row = priceRows[i];
    if (!row || typeof row !== 'object') continue;
    if (!isActiveRow(row)) continue;

    var numPrice = Number(row.price);
    if (isNaN(numPrice) || numPrice < 0) {
      throw new Error('buildPriceSnapshot: invalid price for item ' + (row.item_id || row.name));
    }

    var itemCurrency = String(row.currency || '').toUpperCase();
    var fxRateUsed = normalizedTarget ? fxRateFor(itemCurrency, normalizedTarget, fxRates) : 1;

    activeItems.push({
      item_id: String(row.item_id || '').trim(),
      category: String(row.category || '').trim(),
      name: String(row.name || '').trim(),
      unit: String(row.unit || '').trim(),
      price: numPrice,
      currency: itemCurrency,
      vendor: row.vendor ? String(row.vendor).trim() : null,
      article: row.article ? String(row.article).trim() : null,
      active: true,
      notes: row.notes ? String(row.notes).trim() : null,
      updated_at: row.updated_at || null,
      fx_rate_used: fxRateUsed,
      converted_price: round6(numPrice * fxRateUsed)
    });
  }

  var byItemId = {};
  var byArticle = {};
  for (var j = 0; j < activeItems.length; j += 1) {
    var item = activeItems[j];
    if (item.item_id) {
      byItemId[item.item_id] = item;
    }
    if (item.article) {
      if (!byArticle[item.article]) byArticle[item.article] = [];
      byArticle[item.article].push(item);
    }
  }

  var snapshot = {
    created_at: createdAt,
    target_currency: normalizedTarget,
    fx_rates: deepClone(fxRates),
    items: activeItems,
    by_item_id: byItemId,
    by_article: byArticle
  };

  return deepFreeze(snapshot);
}

/**
 * Resolve a price item deterministically.
 *
 * Priority:
 * 1. explicit stable identifier present on both sides (item_id);
 * 2. exact article code if unambiguous (optionally narrowed by category);
 * 3. exact category + code/name composite key if unambiguous.
 *
 * No fuzzy name matching. Ambiguous or missing matches return null.
 *
 * @param {Object} query - { code, category }
 * @param {Object} snapshot - price snapshot
 * @returns {Object|null} matched snapshot item or null
 */
function resolvePriceItem(query, snapshot) {
  if (!snapshot || !Array.isArray(snapshot.items)) return null;
  var code = query.code ? String(query.code).trim() : '';
  var category = query.category ? String(query.category).trim().toUpperCase() : '';
  var name = query.name ? String(query.name).trim() : '';

  // 1. Explicit stable identifier match on item_id.
  if (code && snapshot.by_item_id && snapshot.by_item_id[code]) {
    return snapshot.by_item_id[code];
  }

  // 2. Exact article code match, unambiguous (optionally narrowed by category).
  if (code && snapshot.by_article && snapshot.by_article[code]) {
    var articleMatches = snapshot.by_article[code];
    var narrowed = category
      ? articleMatches.filter(function (m) { return m.category.toUpperCase() === category; })
      : articleMatches;
    if (narrowed.length === 1) {
      return narrowed[0];
    }
    return null;
  }

  // 3. Exact composite key: category + (item_id|article|name equals code or name).
  var candidateMatches = [];
  for (var i = 0; i < snapshot.items.length; i += 1) {
    var item = snapshot.items[i];
    if (category && item.category.toUpperCase() !== category) continue;
    if (code && (item.item_id === code || item.article === code)) {
      candidateMatches.push(item);
    } else if (name && item.name === name) {
      candidateMatches.push(item);
    }
  }
  if (candidateMatches.length === 1) {
    return candidateMatches[0];
  }
  return null;
}

function unresolvedLine(section, itemName, specification, materialCode, quantity, unit, reason) {
  return {
    Section: section,
    Item_name: itemName,
    Specification: specification || null,
    Material_code: materialCode || null,
    Quantity: quantity,
    Unit: unit,
    Reason: reason,
    Status: 'UNRESOLVED_PRICE'
  };
}

/**
 * Calculate costing from a Construction Core result and a price snapshot.
 *
 * Deterministic: same inputs always produce the same output. Lines without a
 * deterministic price key or without a quantity are reported as UNRESOLVED_PRICE
 * and never silently counted as zero. WORKS lines are only produced when the
 * construction result carries an explicit work quantity.
 *
 * @param {Object} constructionResult - output of calculateConstructionCore
 * @param {Object} priceSnapshot - output of buildPriceSnapshot
 * @param {Object} [options] - { TargetCurrency }
 * @returns {Object} Costing result
 */
function calculateCosting(constructionResult, priceSnapshot, options) {
  if (!constructionResult || typeof constructionResult !== 'object') {
    throw new Error('calculateCosting: constructionResult must be an object');
  }
  if (!priceSnapshot || typeof priceSnapshot !== 'object') {
    throw new Error('calculateCosting: priceSnapshot must be an object');
  }
  var opts = options || {};
  var calculationCurrency = opts.TargetCurrency || opts.targetCurrency || priceSnapshot.target_currency ||
    (Array.isArray(priceSnapshot.items) && priceSnapshot.items.length > 0 ? priceSnapshot.items[0].currency : 'RUB');

  var pricedLines = [];
  var unresolvedLines = [];
  var materialTotal = 0;
  var edgeTotal = 0;
  var hardwareTotal = 0;
  var workTotal = 0;

  function addPricedLine(section, quantity, priceItem, lineDefaults) {
    var unitPrice = priceItem.converted_price;
    var lineTotal = round2(quantity * unitPrice);
    pricedLines.push({
      Section: section,
      Item_name: priceItem.name || lineDefaults.fallbackName,
      Specification: priceItem.article || lineDefaults.specification || null,
      Size: lineDefaults.size || null,
      Quantity: typeof quantity === 'number' && Number.isInteger(quantity) ? quantity : round6(quantity),
      Unit: priceItem.unit || lineDefaults.unit,
      Unit_price: unitPrice,
      Total: lineTotal,
      Source_module: lineDefaults.source_module || null,
      Item_id: priceItem.item_id,
      Module_id: lineDefaults.module_id || null,
      Material_code: lineDefaults.material_code || null,
      Price_currency: priceItem.currency,
      Fx_rate_used: priceItem.fx_rate_used
    });
    return lineTotal;
  }

  // 1. Materials (aggregated panel materials priced per m2 by material_code).
  var materials = Array.isArray(constructionResult.Materials) ? constructionResult.Materials : [];
  for (var m = 0; m < materials.length; m += 1) {
    var mat = materials[m];
    var matCode = mat.material_code || '';
    var matArea = typeof mat.area_m2 === 'number' ? mat.area_m2 : null;
    if (matArea === null || matArea <= 0) {
      unresolvedLines.push(unresolvedLine('MATERIALS', matCode || 'Unknown material', matCode, matCode, matArea, 'm2', 'INVALID_QUANTITY'));
      continue;
    }
    var matPrice = resolvePriceItem({ code: matCode, category: 'MATERIALS' }, priceSnapshot);
    if (!matPrice) {
      unresolvedLines.push(unresolvedLine('MATERIALS', matCode, matCode, matCode, matArea, 'm2', 'PRICE_NOT_FOUND'));
      continue;
    }
    materialTotal += addPricedLine('MATERIALS', matArea, matPrice, {
      fallbackName: matCode,
      specification: matCode,
      unit: 'm2',
      material_code: matCode
    });
  }

  // 2. Edge banding (aggregated edge length priced per m by material_code).
  var edges = Array.isArray(constructionResult.Edge) ? constructionResult.Edge : [];
  for (var e = 0; e < edges.length; e += 1) {
    var edge = edges[e];
    var edgeCode = edge.material_code || '';
    var edgeLen = typeof edge.length_m === 'number' ? edge.length_m : null;
    if (edgeLen === null || edgeLen <= 0) {
      unresolvedLines.push(unresolvedLine('EDGE', edgeCode || 'Unknown edge', edgeCode, edgeCode, edgeLen, 'm', 'INVALID_QUANTITY'));
      continue;
    }
    var edgePrice = resolvePriceItem({ code: edgeCode, category: 'EDGE' }, priceSnapshot);
    if (!edgePrice) {
      unresolvedLines.push(unresolvedLine('EDGE', edgeCode, edgeCode, edgeCode, edgeLen, 'm', 'PRICE_NOT_FOUND'));
      continue;
    }
    edgeTotal += addPricedLine('EDGE', edgeLen, edgePrice, {
      fallbackName: edgeCode,
      specification: edgeCode,
      unit: 'm',
      material_code: edgeCode
    });
  }

  // 3. Hardware (per-item quantities priced by item code).
  var hardwareList = Array.isArray(constructionResult.Hardware) ? constructionResult.Hardware : [];
  for (var h = 0; h < hardwareList.length; h += 1) {
    var hw = hardwareList[h];
    var hwCode = hw.item || '';
    var hwQty = typeof hw.quantity === 'number' ? hw.quantity : null;
    var hwUnit = hw.unit || 'pcs';
    if (hwQty === null || hwQty <= 0) {
      unresolvedLines.push(unresolvedLine('HARDWARE', hwCode || 'Unknown hardware', hwCode, null, hwQty, hwUnit, hwQty === null ? 'QUANTITY_NULL' : 'INVALID_QUANTITY'));
      continue;
    }
    var hwPrice = resolvePriceItem({ code: hwCode, category: 'HARDWARE' }, priceSnapshot);
    if (!hwPrice) {
      unresolvedLines.push(unresolvedLine('HARDWARE', hwCode, hwCode, null, hwQty, hwUnit, 'PRICE_NOT_FOUND'));
      continue;
    }
    hardwareTotal += addPricedLine('HARDWARE', hwQty, hwPrice, {
      fallbackName: hwCode,
      specification: hwCode,
      unit: hwUnit
    });
  }

  // 4. Works: only priced when the construction result provides an explicit
  // works list with quantities; no fabricated WORKS lines are created.
  var worksList = Array.isArray(constructionResult.Works) ? constructionResult.Works : [];
  for (var w = 0; w < worksList.length; w += 1) {
    var work = worksList[w];
    var workCode = work.item || work.work_code || '';
    var workQty = typeof work.quantity === 'number' ? work.quantity : null;
    var workUnit = work.unit || 'pcs';
    if (workQty === null || workQty <= 0) {
      unresolvedLines.push(unresolvedLine('WORKS', workCode || 'Unknown work', workCode, null, workQty, workUnit, workQty === null ? 'QUANTITY_NULL' : 'INVALID_QUANTITY'));
      continue;
    }
    var workPrice = resolvePriceItem({ code: workCode, category: 'WORKS' }, priceSnapshot);
    if (!workPrice) {
      unresolvedLines.push(unresolvedLine('WORKS', workCode, workCode, null, workQty, workUnit, 'PRICE_NOT_FOUND'));
      continue;
    }
    workTotal += addPricedLine('WORKS', workQty, workPrice, {
      fallbackName: workCode,
      specification: workCode,
      unit: workUnit
    });
  }

  var status = unresolvedLines.length === 0 ? 'COMPLETE' : 'PARTIAL';

  return {
    Calculation_currency: calculationCurrency,
    Status: status,
    Priced_lines: pricedLines,
    Unresolved_lines: unresolvedLines,
    Totals: {
      Material_total: round2(materialTotal),
      Edge_total: round2(edgeTotal),
      Hardware_total: round2(hardwareTotal),
      Work_total: round2(workTotal),
      Grand_total: round2(materialTotal + edgeTotal + hardwareTotal + workTotal)
    }
  };
}

/**
 * Build the Sheets V1 bundle (BOM_LAST, CALC_LOG, SYSTEM) from a costing result.
 *
 * @param {Object} calculationContext - calculation_id, timestamp, project_name,
 *   manager, vision_model, status, app_version, schema_version,
 *   construction_profile_version, confirmed_configuration, construction_result
 * @param {Object} costingResult - output of calculateCosting
 * @param {Object} priceSnapshot - output of buildPriceSnapshot
 * @returns {Object} { BOM_LAST: Array<Object>, CALC_LOG: Object, SYSTEM: Array<Object> }
 */
function buildSheetsV1Bundle(calculationContext, costingResult, priceSnapshot) {
  if (!calculationContext || typeof calculationContext !== 'object') {
    throw new Error('buildSheetsV1Bundle: calculationContext must be an object');
  }
  if (!costingResult || typeof costingResult !== 'object') {
    throw new Error('buildSheetsV1Bundle: costingResult must be an object');
  }
  if (!priceSnapshot || typeof priceSnapshot !== 'object') {
    throw new Error('buildSheetsV1Bundle: priceSnapshot must be an object');
  }

  var calcId = calculationContext.calculation_id || calculationContext.Calculation_id || null;
  if (!calcId) {
    throw new Error('buildSheetsV1Bundle: calculationContext.calculation_id is required');
  }
  var timestamp = calculationContext.timestamp || calculationContext.Timestamp || null;
  if (!timestamp) {
    throw new Error('buildSheetsV1Bundle: calculationContext.timestamp is required');
  }
  var projectName = calculationContext.project_name || calculationContext.Project_name || 'Unnamed project';
  var manager = calculationContext.manager || null;
  var visionModel = calculationContext.vision_model || calculationContext.Vision_model || null;

  var currency = costingResult.Calculation_currency || 'RUB';
  var totals = costingResult.Totals || {
    Material_total: 0,
    Edge_total: 0,
    Hardware_total: 0,
    Work_total: 0,
    Grand_total: 0
  };
  var costingStatus = costingResult.Status === 'COMPLETE' ? 'COMPLETE' : 'PARTIAL';

  // --- BOM_LAST rows ---
  var bomRows = [];
  var pricedLines = Array.isArray(costingResult.Priced_lines) ? costingResult.Priced_lines : [];
  for (var i = 0; i < pricedLines.length; i += 1) {
    var line = pricedLines[i];
    bomRows.push({
      section: line.Section,
      item_name: line.Item_name,
      specification: line.Specification || '',
      size: line.Size || '',
      quantity: line.Quantity,
      unit: line.Unit,
      unit_price: line.Unit_price,
      total: line.Total,
      comment: '',
      source_module: line.Source_module || '',
      item_id: line.Item_id,
      module_id: line.Module_id || '',
      material_code: line.Material_code || '',
      calculation_id: calcId
    });
  }

  // TOTALS rows (contract BOM_LAST_V1 section enum includes TOTALS).
  var totalsRows = [
    { item_id: 'TOTAL_MATERIALS', item_name: 'Materials Total', value: totals.Material_total },
    { item_id: 'TOTAL_EDGE', item_name: 'Edge Total', value: totals.Edge_total },
    { item_id: 'TOTAL_HARDWARE', item_name: 'Hardware Total', value: totals.Hardware_total },
    { item_id: 'TOTAL_WORKS', item_name: 'Works Total', value: totals.Work_total },
    { item_id: 'TOTAL_GRAND', item_name: 'Grand Total', value: totals.Grand_total }
  ];
  for (var t = 0; t < totalsRows.length; t += 1) {
    var totalsRow = totalsRows[t];
    bomRows.push({
      section: 'TOTALS',
      item_name: totalsRow.item_name,
      specification: '',
      size: '',
      quantity: 1,
      unit: 'sum',
      unit_price: totalsRow.value,
      total: totalsRow.value,
      comment: '',
      source_module: '',
      item_id: totalsRow.item_id,
      module_id: '',
      material_code: '',
      calculation_id: calcId
    });
  }

  // --- CALC_LOG row ---
  // Contract status enum: DRAFT, CONFIRMED, COMPLETED, FAILED, ARCHIVED.
  var calcStatus = costingStatus === 'COMPLETE' ? 'COMPLETED' : 'CONFIRMED';
  if (calculationContext.status && ['DRAFT', 'CONFIRMED', 'COMPLETED', 'FAILED', 'ARCHIVED'].indexOf(calculationContext.status) !== -1) {
    calcStatus = calculationContext.status;
  }

  var fxRateUsed = 1;
  var items = Array.isArray(priceSnapshot.items) ? priceSnapshot.items : [];
  for (var k = 0; k < items.length; k += 1) {
    if (items[k].fx_rate_used !== 1) {
      fxRateUsed = items[k].fx_rate_used;
      break;
    }
  }

  var calcLogRow = {
    timestamp: timestamp,
    project_name: projectName,
    manager: manager,
    status: calcStatus,
    currency: currency,
    material_total: totals.Material_total,
    hardware_total: totals.Hardware_total,
    work_total: totals.Work_total,
    grand_total: totals.Grand_total,
    vision_model: visionModel,
    calculation_id: calcId,
    fx_rate_used: fxRateUsed
  };

  // --- SYSTEM rows ---
  var systemRows = [
    { Key: 'Calculation_id', Value: calcId, Value_type: 'string', Updated_at: timestamp },
    { Key: 'Timestamp', Value: timestamp, Value_type: 'string', Updated_at: timestamp },
    { Key: 'Status', Value: calcStatus, Value_type: 'string', Updated_at: timestamp },
    { Key: 'Vision_model', Value: visionModel, Value_type: 'string', Updated_at: timestamp },
    { Key: 'Currency', Value: currency, Value_type: 'string', Updated_at: timestamp },
    { Key: 'Fx_rate_used', Value: fxRateUsed, Value_type: 'number', Updated_at: timestamp },
    { Key: 'Price_snapshot_created_at', Value: priceSnapshot.created_at || timestamp, Value_type: 'string', Updated_at: timestamp },
    { Key: 'Price_snapshot_json', Value: stableJsonStringify(snapshotForJson(priceSnapshot)), Value_type: 'json', Updated_at: timestamp }
  ];

  var appVersion = calculationContext.app_version || calculationContext.App_version;
  if (appVersion !== undefined && appVersion !== null) {
    systemRows.push({ Key: 'App_version', Value: String(appVersion), Value_type: 'string', Updated_at: timestamp });
  }
  var schemaVersion = calculationContext.schema_version || calculationContext.Schema_version;
  if (schemaVersion !== undefined && schemaVersion !== null) {
    systemRows.push({ Key: 'Schema_version', Value: String(schemaVersion), Value_type: 'string', Updated_at: timestamp });
  }
  var profileVersion = calculationContext.construction_profile_version || calculationContext.Construction_profile_version;
  if (profileVersion !== undefined && profileVersion !== null) {
    systemRows.push({ Key: 'Construction_profile_version', Value: String(profileVersion), Value_type: 'string', Updated_at: timestamp });
  }
  var confirmedConfig = calculationContext.confirmed_configuration || calculationContext.Confirmed_configuration;
  if (confirmedConfig !== undefined && confirmedConfig !== null) {
    systemRows.push({
      Key: 'Confirmed_configuration_json',
      Value: typeof confirmedConfig === 'string' ? confirmedConfig : stableJsonStringify(confirmedConfig),
      Value_type: 'json',
      Updated_at: timestamp
    });
  }
  var constructionRes = calculationContext.construction_result || calculationContext.Construction_result;
  if (constructionRes !== undefined && constructionRes !== null) {
    systemRows.push({
      Key: 'Construction_result_json',
      Value: typeof constructionRes === 'string' ? constructionRes : stableJsonStringify(constructionRes),
      Value_type: 'json',
      Updated_at: timestamp
    });
  }

  return {
    BOM_LAST: bomRows,
    CALC_LOG: calcLogRow,
    SYSTEM: systemRows
  };
}

/**
 * Extract a JSON-safe snapshot view (drops the lookup index maps).
 */
function snapshotForJson(snapshot) {
  return {
    created_at: snapshot.created_at,
    target_currency: snapshot.target_currency,
    fx_rates: snapshot.fx_rates,
    items: snapshot.items
  };
}

var CostingV1 = {
  buildPriceSnapshot: buildPriceSnapshot,
  calculateCosting: calculateCosting,
  buildSheetsV1Bundle: buildSheetsV1Bundle,
  resolvePriceItem: resolvePriceItem,
  stableJsonStringify: stableJsonStringify
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CostingV1;
}