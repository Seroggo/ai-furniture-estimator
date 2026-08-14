/** Accepted Stage 3 quantity rules executed with exact decimal strings. */

var STAGE8_QUANTITY_BINDINGS = {
  QTY_AREA_MM_V1: 'stage8QuantityArea_',
  QTY_EDGE_LENGTH_V1: 'stage8QuantityEdge_',
  QTY_BASIS_ORDER_V1: 'stage8QuantityExplicit_',
  QTY_EXPLICIT_SOURCE_V1: 'stage8QuantityExplicit_'
};


function stage8QuantityRule_(recipeItem, rules, calculationAt) {
  var matches = rules.filter(function (rule) {
    return rule.rule_version_id === recipeItem.quantity_rule_version_id &&
      rule.rule_id === recipeItem.quantity_rule_id && rule.lifecycle_status === 'ACTIVE' &&
      ['CONFIRMED', 'DERIVED'].indexOf(rule.rule_status) !== -1 && rule.execution_mode === 'CODE_BINDING' &&
      stage8DateApplies_(rule, calculationAt, false);
  });
  if (matches.length !== 1 || STAGE8_QUANTITY_BINDINGS[recipeItem.quantity_rule_id] !== (matches[0] || {}).implementation_ref) {
    throw new Error('No exact applicable code binding for ' + recipeItem.quantity_rule_version_id + '.');
  }
  return matches[0];
}


function stage8QuantityParams_(recipeItem) {
  var value;
  try { value = JSON.parse(recipeItem.quantity_params_json || '{}'); }
  catch (error) { throw new Error('Invalid quantity_params_json for ' + recipeItem.recipe_item_id + '.'); }
  if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('Quantity params must be an object.');
  return value;
}


function stage8ExactParam_(params, name) {
  if (!Object.prototype.hasOwnProperty.call(params, name)) throw new Error('Quantity parameter is missing: ' + name + '.');
  return decimalNormalize_(params[name]);
}


function stage8QuantityArea_(recipeItem, params) {
  var area = decimalMultiply_(stage8ExactParam_(params, 'length_mm'), stage8ExactParam_(params, 'width_mm'));
  return decimalScalePower10_(decimalMultiply_(area, stage8ExactParam_(params, 'quantity')), -6);
}


function stage8QuantityEdge_(recipeItem, params) {
  var lengthPart = decimalMultiply_(decimalMultiply_(stage8ExactParam_(params, 'length_mm'),
    stage8ExactParam_(params, 'quantity')), stage8ExactParam_(params, 'edge_length_count'));
  var widthPart = decimalMultiply_(decimalMultiply_(stage8ExactParam_(params, 'width_mm'),
    stage8ExactParam_(params, 'quantity')), stage8ExactParam_(params, 'edge_width_count'));
  return decimalScalePower10_(decimalAdd_(lengthPart, widthPart), -3);
}


function stage8QuantityExplicit_(recipeItem) {
  if (recipeItem.quantity_value === '') throw new Error('Explicit quantity_value is required.');
  return decimalNormalize_(recipeItem.quantity_value);
}


function calculateStage8Quantities(resolutions, masterData, calculationAt) {
  var catalog = {};
  (masterData.catalogItems || []).forEach(function (item) {
    if (catalog[item.catalog_item_code]) throw new Error('Duplicate catalog item: ' + item.catalog_item_code);
    catalog[item.catalog_item_code] = item;
  });
  var calculationItems = [];
  var snapshots = {};
  resolutions.forEach(function (resolution) {
    resolution.items.forEach(function (recipeItem) {
      var catalogItem = catalog[recipeItem.catalog_item_code];
      if (!catalogItem || catalogItem.lifecycle_status !== 'ACTIVE' ||
          catalogItem.price_code !== recipeItem.price_code || catalogItem.default_unit !== recipeItem.quantity_unit) {
        throw new Error('Recipe item has no exact active compatible catalog item: ' + recipeItem.recipe_item_id + '.');
      }
      var rule = stage8QuantityRule_(recipeItem, masterData.calculationRules || [], calculationAt);
      var params = stage8QuantityParams_(recipeItem);
      var binding = STAGE8_QUANTITY_BINDINGS[recipeItem.quantity_rule_id];
      var quantity;
      if (binding === 'stage8QuantityArea_') quantity = stage8QuantityArea_(recipeItem, params);
      else if (binding === 'stage8QuantityEdge_') quantity = stage8QuantityEdge_(recipeItem, params);
      else if (binding === 'stage8QuantityExplicit_') quantity = stage8QuantityExplicit_(recipeItem, params);
      else throw new Error('Unsupported quantity binding: ' + binding + '.');
      var provenance = stage8ParseJsonArray_(recipeItem.provenance, 'Module_Recipe_Items.provenance');
      calculationItems.push({
        item_id: resolution.layoutItem.module_id + ':' + recipeItem.recipe_item_id,
        layout_module_id: resolution.layoutItem.module_id,
        recipe_id: resolution.recipe.recipe_id,
        recipe_item_id: recipeItem.recipe_item_id,
        catalog_item_code: recipeItem.catalog_item_code,
        item_type: catalogItem.catalog_item_type,
        quantity: quantity,
        unit: recipeItem.quantity_unit,
        price_code: recipeItem.price_code,
        quantity_rule_id: recipeItem.quantity_rule_id,
        quantity_rule_version_id: recipeItem.quantity_rule_version_id,
        provenance: provenance
      });
      snapshots[rule.rule_version_id] = stage8RuleSnapshot_(rule);
    });
  });
  return {items: calculationItems, ruleSnapshots: Object.keys(snapshots).sort().map(function (id) { return snapshots[id]; })};
}
