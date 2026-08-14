/** Exact, effective-period recipe resolution. No synthetic BOM fallback. */

function stage8ParseJsonArray_(value, label) {
  var parsed;
  try { parsed = JSON.parse(value); }
  catch (error) { throw new Error(label + ' must be valid JSON.'); }
  if (!Array.isArray(parsed) || !parsed.length || parsed.some(function (item) { return typeof item !== 'string' || !item; })) {
    throw new Error(label + ' must be a non-empty JSON string array.');
  }
  return parsed;
}


function stage8DateApplies_(row, instant, dateOnly) {
  var point = dateOnly ? instant.slice(0, 10) : instant;
  var start = row.effective_from;
  var end = row.effective_to;
  return !!start && start <= point && (!end || point < end);
}


function stage8RuleSnapshot_(row) {
  return {
    rule_id: row.rule_id,
    rule_version_id: row.rule_version_id,
    version: Number(row.version),
    rule_status: row.rule_status,
    execution_mode: row.execution_mode,
    implementation_ref: row.implementation_ref || null,
    provenance: stage8ParseJsonArray_(row.provenance, 'Calculation_Rules.provenance')
  };
}


function resolveStage8Recipes(layoutItems, masterData, calculationAt) {
  var recipes = masterData.moduleRecipes || [];
  var recipeItems = masterData.moduleRecipeItems || [];
  var rules = masterData.calculationRules || [];
  var resolved = [];
  var snapshots = [];
  var recipeSnapshots = {};
  for (var i = 0; i < layoutItems.length; i++) {
    var layoutItem = layoutItems[i];
    var applicable = recipes.filter(function (recipe) {
      return recipe.module_class === layoutItem.module_class && recipe.module_role === layoutItem.role &&
        recipe.lifecycle_status === 'ACTIVE' && ['CONFIRMED', 'DERIVED'].indexOf(recipe.rule_status) !== -1 &&
        stage8DateApplies_(recipe, calculationAt, true);
    });
    if (applicable.length > 1) {
      return {status: 'MASTER_DATA_INVALID', blocker: stage8Diagnostic_('AMBIGUOUS_RECIPE', 'RECIPE', null,
        'More than one approved recipe applies to layout module ' + layoutItem.module_id + '.',
        applicable.map(function (recipe) { return 'Module_Recipes#' + recipe.recipe_id; })),
        resolved: [], ruleSnapshots: [], recipeSnapshots: []};
    }
    if (!applicable.length) {
      var blockingRules = rules.filter(function (rule) {
        return rule.rule_id === 'MODULE_TO_PARTS_V1' && rule.rule_status === 'REQUIRES_EXPERT' &&
          rule.execution_mode === 'BLOCKING_STATUS' && ['DRAFT', 'ACTIVE'].indexOf(rule.lifecycle_status) !== -1 &&
          stage8DateApplies_(rule, calculationAt, false);
      });
      if (blockingRules.length !== 1) {
        return {status: 'MASTER_DATA_INVALID', blocker: stage8Diagnostic_('MODULE_TO_PARTS_RULE_INVALID', 'MASTER_DATA', null,
          'Exactly one applicable accepted blocking MODULE_TO_PARTS_V1 rule is required when no approved recipe exists.',
          blockingRules.map(function (rule) { return 'Calculation_Rules#' + rule.rule_version_id; })),
          resolved: [], ruleSnapshots: [], recipeSnapshots: []};
      }
      snapshots.push(stage8RuleSnapshot_(blockingRules[0]));
      return {status: 'REQUIRES_EXPERT', blocker: stage8Diagnostic_('APPROVED_RECIPE_REQUIRED', 'RECIPE', null,
        'No applicable expert-approved recipe exists for ' + layoutItem.module_class + '/' + layoutItem.role + '.',
        ['Calculation_Rules#' + blockingRules[0].rule_version_id, 'LayoutItem#' + layoutItem.module_id]),
        resolved: [], ruleSnapshots: snapshots, recipeSnapshots: []};
    }
    var recipe = applicable[0];
    var items = recipeItems.filter(function (item) { return item.recipe_id === recipe.recipe_id; });
    if (!items.length) {
      return {status: 'MASTER_DATA_INVALID', blocker: stage8Diagnostic_('RECIPE_ITEMS_MISSING', 'RECIPE', null,
        'Approved recipe has no recipe items: ' + recipe.recipe_id + '.', ['Module_Recipes#' + recipe.recipe_id]),
        resolved: [], ruleSnapshots: [], recipeSnapshots: []};
    }
    items.sort(function (a, b) { return Number(a.position) - Number(b.position); });
    var positions = {};
    for (var r = 0; r < items.length; r++) {
      if (!Number.isInteger(Number(items[r].position)) || Number(items[r].position) < 0 || positions[items[r].position]) {
        return {status: 'MASTER_DATA_INVALID', blocker: stage8Diagnostic_('RECIPE_ITEM_ORDER_INVALID', 'RECIPE', null,
          'Recipe item positions must be unique non-negative integers.', ['Module_Recipes#' + recipe.recipe_id]),
          resolved: [], ruleSnapshots: [], recipeSnapshots: []};
      }
      positions[items[r].position] = true;
    }
    resolved.push({layoutItem: layoutItem, recipe: recipe, items: items});
    recipeSnapshots[recipe.recipe_id] = {
      recipe_id: recipe.recipe_id,
      version: Number(recipe.version),
      variant_code: recipe.variant_code,
      rule_status: recipe.rule_status,
      provenance: stage8ParseJsonArray_(recipe.provenance, 'Module_Recipes.provenance')
    };
  }
  return {status: 'RESOLVED', resolved: resolved, ruleSnapshots: snapshots,
    recipeSnapshots: Object.keys(recipeSnapshots).sort().map(function (id) { return recipeSnapshots[id]; })};
}
