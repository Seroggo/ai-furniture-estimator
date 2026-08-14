/** Stage 8 in-memory calculation orchestration. This module never calls OpenRouter. */

var STAGE8_CALCULATION_MODEL_VERSION = 'stage8-kernel-v1';


function stage8ProjectInputRef_(input) {
  var metadata = input.parser_metadata || {};
  return {
    request_id: metadata.request_id || 'missing-request-id',
    input_schema_version: input.schema_version || 'project-input-v1',
    parser_schema_version: metadata.parser_schema_version || input.schema_version || 'project-input-v1',
    prompt_version: metadata.prompt_version || 'unknown',
    provider: metadata.provider || 'unknown',
    model_returned: metadata.model_returned || null,
    parsed_at: metadata.parsed_at || new Date(0).toISOString()
  };
}


function stage8BaseResult_(input, createdAt) {
  return {
    result_schema_version: CALCULATION_RESULT_SCHEMA_VERSION,
    calculation_model_version: STAGE8_CALCULATION_MODEL_VERSION,
    status: 'INPUT_NOT_READY',
    project_input_ref: stage8ProjectInputRef_(input || {}),
    blockers: [],
    warnings: [],
    layout: null,
    rule_snapshot: [],
    recipe_snapshot: [],
    calculation_items: [],
    cost_results: [],
    pricebook_version_id: null,
    total: null,
    currency: null,
    created_at: createdAt
  };
}


function stage8UniqueRuleSnapshots_(snapshots) {
  var byId = {};
  snapshots.forEach(function (snapshot) { byId[snapshot.rule_version_id] = snapshot; });
  return Object.keys(byId).sort().map(function (id) { return byId[id]; });
}


function stage8FinishResult_(result) {
  var validation = validateCalculationResult(result);
  if (!validation.valid) throw new Error('Calculation Result contract violation: ' + validation.errors.join('; '));
  return result;
}


function calculateProject(projectInput, options) {
  options = options || {};
  var createdAt = options.createdAt || new Date().toISOString();
  var calculationAt = options.calculationAt || createdAt;
  var result = stage8BaseResult_(projectInput, createdAt);
  var adapted = adaptProjectInputToLayoutRequest(projectInput);
  if (adapted.status !== 'READY') {
    result.status = adapted.status;
    result.blockers = adapted.blockers;
    return stage8FinishResult_(result);
  }
  var masterData = options.masterData || loadStage8MasterData_();
  var layout = composeStage8Layout(adapted.layoutRequest, masterData.moduleSizeRules || [],
    masterData.moduleSizeRulesVersion || 'unknown');
  if (layout.status !== 'VALID') {
    result.status = layout.status === 'NOT_SUPPORTED' ? 'NOT_SUPPORTED' :
      layout.status === 'NO_VALID_LAYOUT' ? 'NO_VALID_LAYOUT' :
      layout.status === 'MASTER_DATA_INVALID' ? 'MASTER_DATA_INVALID' : 'INPUT_NOT_READY';
    result.blockers = [stage8Diagnostic_(layout.status === 'MASTER_DATA_INVALID' ? 'MODULE_SIZE_MASTER_DATA_INVALID' : layout.status,
      layout.status === 'MASTER_DATA_INVALID' ? 'MASTER_DATA' : 'LAYOUT', null,
      (layout.reasons || ['Layout failed.'])[0], ['Module_Size_Rules'])];
    return stage8FinishResult_(result);
  }
  delete layout.selection_key;
  result.layout = layout;
  var recipeResolution = resolveStage8Recipes(layout.items, masterData, calculationAt);
  result.rule_snapshot = stage8UniqueRuleSnapshots_(recipeResolution.ruleSnapshots || []);
  result.recipe_snapshot = recipeResolution.recipeSnapshots || [];
  if (recipeResolution.status !== 'RESOLVED') {
    result.status = recipeResolution.status;
    result.blockers = [recipeResolution.blocker];
    return stage8FinishResult_(result);
  }
  var quantities;
  try {
    quantities = calculateStage8Quantities(recipeResolution.resolved, masterData, calculationAt);
  } catch (error) {
    result.status = 'MASTER_DATA_INVALID';
    result.blockers = [stage8Diagnostic_('QUANTITY_MASTER_DATA_INVALID', 'QUANTITY', null, error.message, [])];
    return stage8FinishResult_(result);
  }
  result.calculation_items = quantities.items;
  result.rule_snapshot = stage8UniqueRuleSnapshots_(result.rule_snapshot.concat(quantities.ruleSnapshots));
  var priced = resolveStage8Pricebook(quantities.items, masterData, options.pricebook, calculationAt);
  result.rule_snapshot = stage8UniqueRuleSnapshots_(result.rule_snapshot.concat(priced.ruleSnapshots || []));
  if (priced.status !== 'RESOLVED') {
    result.status = priced.status;
    result.blockers = [priced.blocker];
    return stage8FinishResult_(result);
  }
  result.status = 'SUCCESS';
  result.cost_results = priced.costs;
  result.pricebook_version_id = priced.pricebookVersionId;
  result.total = priced.total;
  result.currency = priced.currency;
  return stage8FinishResult_(result);
}


function validateCalculationResult(result) {
  var errors = [];
  var fields = ['result_schema_version', 'calculation_model_version', 'status', 'project_input_ref',
    'blockers', 'warnings', 'layout', 'rule_snapshot', 'recipe_snapshot', 'calculation_items', 'cost_results',
    'pricebook_version_id', 'total', 'currency', 'created_at'];
  if (!result || typeof result !== 'object' || Array.isArray(result)) return {valid: false, errors: ['result must be an object']};
  Object.keys(result).forEach(function (field) { if (fields.indexOf(field) === -1) errors.push('undocumented field: ' + field); });
  fields.forEach(function (field) { if (!Object.prototype.hasOwnProperty.call(result, field)) errors.push('missing field: ' + field); });
  if (result.result_schema_version !== 'calculation-result-v1') errors.push('invalid result_schema_version');
  if (result.calculation_model_version !== STAGE8_CALCULATION_MODEL_VERSION) errors.push('invalid calculation_model_version');
  var statuses = ['SUCCESS', 'INPUT_NOT_READY', 'NOT_SUPPORTED', 'NO_VALID_LAYOUT', 'REQUIRES_EXPERT',
    'PRICEBOOK_NOT_AVAILABLE', 'PRICE_NOT_FOUND', 'UNIT_MISMATCH', 'MASTER_DATA_INVALID'];
  if (statuses.indexOf(result.status) === -1) errors.push('invalid status');
  if (!Array.isArray(result.blockers) || !Array.isArray(result.warnings) || !Array.isArray(result.rule_snapshot) || !Array.isArray(result.recipe_snapshot) ||
      !Array.isArray(result.calculation_items) || !Array.isArray(result.cost_results)) errors.push('result arrays are invalid');
  if (result.status === 'SUCCESS') {
    if (result.blockers.length || !result.layout || !result.pricebook_version_id || result.total === null || !result.currency) {
      errors.push('SUCCESS result is incomplete');
    }
    if (result.calculation_items.length !== result.cost_results.length) errors.push('SUCCESS item/cost count mismatch');
  } else if (!result.blockers.length) errors.push('blocked result requires a blocker');
  ['total'].forEach(function (field) {
    if (result[field] !== null) {
      try { decimalNormalize_(result[field]); } catch (error) { errors.push(field + ' is not an exact decimal'); }
    }
  });
  (result.calculation_items || []).forEach(function (item) {
    try { if (decimalNormalize_(item.quantity) !== item.quantity) errors.push('non-canonical item quantity'); }
    catch (error) { errors.push('invalid item quantity'); }
  });
  (result.cost_results || []).forEach(function (cost) {
    ['quantity', 'unit_price', 'cost'].forEach(function (field) {
      try { if (decimalNormalize_(cost[field]) !== cost[field]) errors.push('non-canonical cost decimal'); }
      catch (error) { errors.push('invalid cost decimal'); }
    });
  });
  if (isNaN(Date.parse(result.created_at))) errors.push('created_at must be ISO date-time');
  return {valid: errors.length === 0, errors: errors};
}


function runStage8DevSmoke() {
  var setup = setupSystem();
  var firstSync = syncStage8ModuleSizeRules();
  var secondSync = syncStage8ModuleSizeRules();
  var known = function (value, note) {
    return {value: value, fact_state: 'KNOWN', evidence: {source_type: 'TEXT', source_ref: 'stage8-dev-smoke', evidence_note: note}};
  };
  var input = {
    schema_version: 'project-input-v1',
    project_type: 'KITCHEN',
    layout: {run_shape: known('straight', 'Synthetic straight run.'),
      run_length_mm: known(600, 'Synthetic exact 600 mm run.'), zone: known('base', 'Synthetic base zone.')},
    modules: {required_modules: [], forbidden_roles: [], preferred_module_order: []},
    missing_questions: [],
    evidence: [{source_type: 'TEXT', source_ref: 'stage8-dev-smoke', observation: 'Synthetic non-sensitive Stage 8 checkpoint.',
      relevant_fields: ['layout.run_shape', 'layout.run_length_mm', 'layout.zone']}],
    parser_metadata: {request_id: 'stage8-dev-smoke', parser_schema_version: 'project-input-v1',
      prompt_version: 'synthetic-no-openrouter', provider: 'openrouter', model_requested: 'not-called',
      parsed_at: new Date().toISOString(), input_modalities: ['text']}
  };
  var result = calculateProject(input, {});
  if (result.status !== 'REQUIRES_EXPERT' || !result.layout || result.calculation_items.length || result.cost_results.length) {
    throw new Error('Stage 8 DEV smoke expected honest REQUIRES_EXPERT after a valid layout.');
  }
  return {status: 'PASS', resultStatus: result.status, layoutStatus: result.layout.status,
    layoutItems: result.layout.items.length, blockerCode: result.blockers[0].code,
    moduleSizeRulesVersion: firstSync.version, managedRows: firstSync.managedRows,
    syncIdempotent: JSON.stringify(firstSync) === JSON.stringify(secondSync),
    setupStatus: setup.status,
    recipesCreated: 0, pricesCreated: 0, openRouterCalled: false};
}
