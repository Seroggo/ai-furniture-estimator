/** Immutable published pricebook selection and exact cost calculation. */

function resolveStage8Pricebook(items, masterData, selector, calculationAt) {
  if (!selector || !selector.pricebookCode || !selector.currency) {
    return {status: 'PRICEBOOK_NOT_AVAILABLE', blocker: stage8Diagnostic_('PRICEBOOK_SELECTOR_REQUIRED', 'PRICEBOOK', null,
      'Explicit pricebook code and currency are required.', []), costs: [], ruleSnapshots: []};
  }
  var applicable = (masterData.pricebookVersions || []).filter(function (version) {
    return version.pricebook_code === selector.pricebookCode && version.currency === selector.currency &&
      version.status === 'ACTIVE' && version.source_context === 'production_pricebook' &&
      stage8DateApplies_(version, calculationAt, false);
  });
  if (!applicable.length) return {status: 'PRICEBOOK_NOT_AVAILABLE', blocker: stage8Diagnostic_('PRICEBOOK_NOT_AVAILABLE', 'PRICEBOOK', null,
    'No applicable ACTIVE published pricebook version exists.', []), costs: [], ruleSnapshots: []};
  if (applicable.length > 1) return {status: 'MASTER_DATA_INVALID', blocker: stage8Diagnostic_('PRICEBOOK_OVERLAP', 'PRICEBOOK', null,
    'More than one ACTIVE published pricebook version applies.', applicable.map(function (row) { return 'Pricebook_Versions#' + row.pricebook_version_id; })),
    costs: [], ruleSnapshots: []};
  var version = applicable[0];
  var priceRows = (masterData.prices || []).filter(function (price) {
    return price.pricebook_version_id === version.pricebook_version_id && price.status === 'ENABLED';
  });
  var costRuleRows = (masterData.calculationRules || []).filter(function (rule) {
    return rule.rule_id === 'COST_UNIT_PRICE_V1' && rule.lifecycle_status === 'ACTIVE' &&
      ['CONFIRMED', 'DERIVED'].indexOf(rule.rule_status) !== -1 && rule.execution_mode === 'CODE_BINDING' &&
      rule.implementation_ref === 'stage8CalculateCost_' && stage8DateApplies_(rule, calculationAt, false);
  });
  if (costRuleRows.length !== 1) return {status: 'MASTER_DATA_INVALID', blocker: stage8Diagnostic_('COST_RULE_INVALID', 'MASTER_DATA', null,
    'Exactly one applicable COST_UNIT_PRICE_V1 code binding is required.', []), costs: [], ruleSnapshots: []};
  var costs = [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var matches = priceRows.filter(function (price) { return price.price_code === item.price_code; });
    if (!matches.length) return {status: 'PRICE_NOT_FOUND', blocker: stage8Diagnostic_('PRICE_NOT_FOUND', 'PRICEBOOK', null,
      'Published price not found for ' + item.price_code + '.', ['Pricebook_Versions#' + version.pricebook_version_id]), costs: [], ruleSnapshots: []};
    if (matches.length > 1) return {status: 'MASTER_DATA_INVALID', blocker: stage8Diagnostic_('DUPLICATE_PUBLISHED_PRICE', 'PRICEBOOK', null,
      'Published price_code is duplicated inside one version: ' + item.price_code + '.',
      matches.map(function (row) { return 'Prices#' + row.price_entry_id; })), costs: [], ruleSnapshots: []};
    var price = matches[0];
    if (price.catalog_item_code !== item.catalog_item_code) return {status: 'MASTER_DATA_INVALID', blocker: stage8Diagnostic_('PRICE_CATALOG_MISMATCH', 'PRICEBOOK', null,
      'Published price catalog item does not match the recipe item.', ['Prices#' + price.price_entry_id]), costs: [], ruleSnapshots: []};
    if (price.unit !== item.unit) return {status: 'UNIT_MISMATCH', blocker: stage8Diagnostic_('UNIT_MISMATCH', 'PRICEBOOK', null,
      'Quantity unit ' + item.unit + ' differs from published price unit ' + price.unit + '.', ['Prices#' + price.price_entry_id]), costs: [], ruleSnapshots: []};
    if (price.currency !== version.currency) return {status: 'MASTER_DATA_INVALID', blocker: stage8Diagnostic_('PRICE_CURRENCY_MISMATCH', 'PRICEBOOK', null,
      'Published price currency differs from its version.', ['Prices#' + price.price_entry_id]), costs: [], ruleSnapshots: []};
    var unitPrice;
    try { unitPrice = decimalNormalize_(price.unit_price); }
    catch (error) { return {status: 'MASTER_DATA_INVALID', blocker: stage8Diagnostic_('PRICE_DECIMAL_INVALID', 'PRICEBOOK', null,
      error.message, ['Prices#' + price.price_entry_id]), costs: [], ruleSnapshots: []}; }
    costs.push(stage8CalculateCost_(item, price, unitPrice, version.currency));
  }
  return {status: 'RESOLVED', pricebookVersionId: version.pricebook_version_id,
    currency: version.currency, costs: costs, total: decimalSum_(costs.map(function (cost) { return cost.cost; })),
    ruleSnapshots: [stage8RuleSnapshot_(costRuleRows[0])]};
}


function stage8CalculateCost_(item, price, unitPrice, currency) {
  return {
    item_id: item.item_id,
    quantity: item.quantity,
    unit: item.unit,
    price_code: item.price_code,
    unit_price: unitPrice,
    cost: decimalMultiply_(item.quantity, unitPrice),
    currency: currency,
    price_entry_id: price.price_entry_id,
    quantity_rule_id: item.quantity_rule_id,
    pricing_rule_id: 'COST_UNIT_PRICE_V1',
    quantity_provenance: item.provenance,
    price_provenance: stage8ParseJsonArray_(price.provenance, 'Prices.provenance')
  };
}
