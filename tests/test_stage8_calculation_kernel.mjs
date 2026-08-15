import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const apps = resolve(root, 'apps-script');
const files = [
  'generated/calculation_result_schema.gs',
  'generated/module_size_rules.gs',
  'decimal_math.gs',
  'project_input_adapter.gs',
  'master_data_loader.gs',
  'layout_runtime.gs',
  'recipe_resolver.gs',
  'quantity_engine.gs',
  'pricebook_resolver.gs',
  'calculation_orchestrator.gs',
];
const context = vm.createContext({console, Date, JSON, Math, Number, String, Array, Object, RegExp, Set, Error});
for (const file of files) vm.runInContext(readFileSync(resolve(apps, file), 'utf8'), context, {filename: file});

const call = (name, ...args) => context[name](...args);
const plain = (value) => JSON.parse(JSON.stringify(value));
const moduleSizeRules = plain(context.STAGE8_MODULE_SIZE_RULES);
const calculationAt = '2026-08-14T10:00:00.000Z';
const createdAt = '2026-08-14T10:00:01.000Z';
const provenance = JSON.stringify(['test-only:stage8-approved-fixture']);

function known(value, note = 'Explicit test fact.') {
  return {value, fact_state: 'KNOWN', evidence: {source_type: 'TEXT', source_ref: 'fixture', evidence_note: note}};
}

function fact(value, factState) {
  const result = {value, fact_state: factState};
  if (['KNOWN', 'INFERRED', 'CONFLICT'].includes(factState)) {
    result.evidence = {source_type: 'TEXT', source_ref: 'fixture', evidence_note: `${factState} fixture.`};
  }
  return result;
}

function projectInput(overrides = {}) {
  const input = {
    schema_version: 'project-input-v1',
    project_type: 'KITCHEN',
    layout: {run_shape: known('straight'), run_length_mm: known(600), zone: known('base')},
    modules: {required_modules: [], forbidden_roles: [], preferred_module_order: []},
    missing_questions: [],
    evidence: [],
    parser_metadata: {
      request_id: 'stage8-test', parser_schema_version: 'project-input-v1', prompt_version: 'test-prompt',
      provider: 'openrouter', model_requested: 'test-model', parsed_at: '2026-08-14T09:00:00.000Z', input_modalities: ['text'],
    },
  };
  if (overrides.layout) Object.assign(input.layout, overrides.layout);
  if (overrides.modules) Object.assign(input.modules, overrides.modules);
  return input;
}

function rule(ruleId, version, implementationRef, status = 'CONFIRMED', executionMode = 'CODE_BINDING') {
  return {
    rule_version_id: `${ruleId}:${version}`, rule_id: ruleId, display_name: ruleId, version: String(version), scope: 'test-only',
    rule_status: status, execution_mode: executionMode, inputs_json: '["fixture"]', outputs_json: '["fixture"]',
    implementation_ref: implementationRef || '', lifecycle_status: 'ACTIVE', effective_from: '2026-01-01T00:00:00.000Z',
    effective_to: '', provenance, notes: 'Test-only approved fixture.',
  };
}

function masterData() {
  return {
    moduleSizeRules,
    moduleSizeRulesVersion: 'module-size-rules-stage3-linear-v1',
    moduleRecipes: [{
      recipe_id: 'TEST_RECIPE_BASE_GENERAL', module_class: 'base_general', module_role: 'generic_storage', variant_code: 'test',
      display_name: 'Test-only approved recipe', rule_status: 'CONFIRMED', version: '1', lifecycle_status: 'ACTIVE',
      effective_from: '2026-01-01', effective_to: '', provenance, notes: 'Never synchronized to DEV.',
    }],
    moduleRecipeItems: [
      {recipe_item_id: 'TEST_AREA', recipe_id: 'TEST_RECIPE_BASE_GENERAL', position: '0', catalog_item_code: 'TEST_MATERIAL',
        quantity_rule_id: 'QTY_AREA_MM_V1', quantity_rule_version_id: 'QTY_AREA_MM_V1:1', quantity_value: '', quantity_unit: 'm2',
        price_code: 'TEST_MATERIAL_PRICE', quantity_params_json: '{"length_mm":"1000","width_mm":"500","quantity":"2"}', provenance, notes: ''},
      {recipe_item_id: 'TEST_EDGE', recipe_id: 'TEST_RECIPE_BASE_GENERAL', position: '1', catalog_item_code: 'TEST_EDGE',
        quantity_rule_id: 'QTY_EDGE_LENGTH_V1', quantity_rule_version_id: 'QTY_EDGE_LENGTH_V1:1', quantity_value: '', quantity_unit: 'm',
        price_code: 'TEST_EDGE_PRICE', quantity_params_json: '{"length_mm":"1000","width_mm":"500","quantity":"2","edge_length_count":"2","edge_width_count":"2"}', provenance, notes: ''},
      {recipe_item_id: 'TEST_HARDWARE', recipe_id: 'TEST_RECIPE_BASE_GENERAL', position: '2', catalog_item_code: 'TEST_HARDWARE',
        quantity_rule_id: 'QTY_EXPLICIT_SOURCE_V1', quantity_rule_version_id: 'QTY_EXPLICIT_SOURCE_V1:1', quantity_value: '3', quantity_unit: 'pcs',
        price_code: 'TEST_HARDWARE_PRICE', quantity_params_json: '{}', provenance, notes: ''},
    ],
    catalogItems: [
      {catalog_item_code: 'TEST_MATERIAL', catalog_item_type: 'MATERIAL', default_unit: 'm2', price_code: 'TEST_MATERIAL_PRICE', lifecycle_status: 'ACTIVE'},
      {catalog_item_code: 'TEST_EDGE', catalog_item_type: 'EDGE', default_unit: 'm', price_code: 'TEST_EDGE_PRICE', lifecycle_status: 'ACTIVE'},
      {catalog_item_code: 'TEST_HARDWARE', catalog_item_type: 'HARDWARE', default_unit: 'pcs', price_code: 'TEST_HARDWARE_PRICE', lifecycle_status: 'ACTIVE'},
    ],
    calculationRules: [
      {...rule('MODULE_TO_PARTS_V1', 1, '', 'REQUIRES_EXPERT', 'BLOCKING_STATUS'), lifecycle_status: 'DRAFT'},
      rule('QTY_AREA_MM_V1', 1, 'stage8QuantityArea_'),
      rule('QTY_EDGE_LENGTH_V1', 1, 'stage8QuantityEdge_'),
      rule('QTY_EXPLICIT_SOURCE_V1', 1, 'stage8QuantityExplicit_'),
      rule('COST_UNIT_PRICE_V1', 1, 'stage8CalculateCost_'),
    ],
    pricebookVersions: [{
      pricebook_version_id: 'TEST_PRICEBOOK:1', pricebook_code: 'TEST_PRICEBOOK', version: '1', currency: 'RUB', status: 'ACTIVE',
      effective_from: '2026-01-01T00:00:00.000Z', effective_to: '', source_context: 'production_pricebook', provenance, published_at: '2026-01-01T00:00:00.000Z', notes: 'Test-only.',
    }],
    prices: [
      {price_entry_id: 'TEST_PRICE_MATERIAL', pricebook_version_id: 'TEST_PRICEBOOK:1', price_code: 'TEST_MATERIAL_PRICE', catalog_item_code: 'TEST_MATERIAL', unit: 'm2', unit_price: '123.45', currency: 'RUB', status: 'ENABLED', provenance},
      {price_entry_id: 'TEST_PRICE_EDGE', pricebook_version_id: 'TEST_PRICEBOOK:1', price_code: 'TEST_EDGE_PRICE', catalog_item_code: 'TEST_EDGE', unit: 'm', unit_price: '0.1', currency: 'RUB', status: 'ENABLED', provenance},
      {price_entry_id: 'TEST_PRICE_HARDWARE', pricebook_version_id: 'TEST_PRICEBOOK:1', price_code: 'TEST_HARDWARE_PRICE', catalog_item_code: 'TEST_HARDWARE', unit: 'pcs', unit_price: '2.5', currency: 'RUB', status: 'ENABLED', provenance},
    ],
  };
}

function run(input = projectInput(), data = masterData()) {
  return plain(call('calculateProject', input, {
    masterData: data, calculationAt, createdAt, pricebook: {pricebookCode: 'TEST_PRICEBOOK', currency: 'RUB'},
  }));
}

function normalizeRequest(request) {
  return {
    run_length_mm: request.run_length_mm,
    zone: request.zone || 'base',
    run_shape: request.run_shape || 'straight',
    required_modules: (request.required_modules || []).map((module) => ({...module, fixed_position: module.fixed_position ?? null})),
    position_constraints: request.position_constraints || [],
    filler_policy: request.filler_policy || {min_width_mm: 0, max_width_mm: 0, location: 'end'},
    forbidden_generic_widths_mm: request.forbidden_generic_widths_mm || [],
    explicit_generic_widths_mm: request.explicit_generic_widths_mm || [],
    min_module_count: request.min_module_count ?? null,
    max_module_count: request.max_module_count ?? null,
  };
}

function layoutProjection(result) {
  return {
    status: result.status,
    widths_mm: result.items.map((item) => item.width_mm),
    module_classes: result.items.map((item) => item.module_class),
    roles: result.items.map((item) => item.role),
    required: result.items.map((item) => item.required),
    market_ranks: result.items.map((item) => item.market_rank),
    entity_types: result.items.map((item) => item.entity_type),
    occupied_length_mm: result.occupied_length_mm,
    remainder_mm: result.remainder_mm,
    filler_width_mm: result.filler ? result.filler.width_mm : null,
  };
}

test('canonical Calculation Result schema is Draft 2020-12 valid', () => {
  const schema = JSON.parse(readFileSync(resolve(root, 'docs/stage-8-calculation-kernel/calculation-result.schema.json'), 'utf8'));
  const ajv = new Ajv2020({strict: false, validateFormats: false});
  assert.doesNotThrow(() => ajv.compile(schema));
});

test('DecimalString accepts only canonical non-negative exact decimal forms', () => {
  const schema = JSON.parse(readFileSync(resolve(root, 'docs/stage-8-calculation-kernel/calculation-result.schema.json'), 'utf8'));
  const validate = new Ajv2020({strict: false}).compile(schema.$defs.DecimalString);
  for (const value of ['0', '1', '10', '0.1', '0.01', '1.01', '100.0001']) {
    assert.equal(validate(value), true, `${value}: ${JSON.stringify(validate.errors)}`);
  }
  for (const value of ['0.0', '1.0', '1.00', '0.10', '00', '01', '.1', '1.', '-1', '1e2']) {
    assert.equal(validate(value), false, `${value} must not be canonical`);
  }
});

test('readiness gate accepts only KNOWN straight hard facts', () => {
  assert.equal(call('adaptProjectInputToLayoutRequest', projectInput()).status, 'READY');
  for (const state of ['UNKNOWN', 'CONFLICT', 'INFERRED']) {
    const value = state === 'UNKNOWN' || state === 'CONFLICT' ? 0 : 600;
    const adapted = plain(call('adaptProjectInputToLayoutRequest', projectInput({layout: {run_length_mm: fact(value, state)}})));
    assert.equal(adapted.status, 'INPUT_NOT_READY');
    assert.ok(adapted.blockers.some((blocker) => ['REQUIRED_FACT_UNKNOWN', 'FACT_CONFLICT', 'NEEDS_CONFIRMATION'].includes(blocker.code)));
  }
});

test('unsupported geometry and unknown exact role aliases remain explicit', () => {
  const unsupported = plain(call('adaptProjectInputToLayoutRequest', projectInput({layout: {run_shape: known('L-shaped')}})));
  assert.equal(unsupported.status, 'NOT_SUPPORTED');
  const module = {name: known('Mystery'), role: known('dish washer approximate'), module_class: known('base'), width_mm: known(600), quantity: known(1)};
  const unknown = plain(call('adaptProjectInputToLayoutRequest', projectInput({modules: {required_modules: [module]}})));
  assert.equal(unknown.status, 'INPUT_NOT_READY');
  assert.equal(unknown.blockers.at(-1).code, 'UNKNOWN_ROLE_ALIAS');
});

test('project-input-v2 live regression keeps dishwasher and sink distinct and excludes countertop', () => {
  const fixture = JSON.parse(readFileSync(resolve(root, 'tests/fixtures/stage9-live-project-input-v2.json'), 'utf8'));
  const schema = JSON.parse(readFileSync(resolve(root, 'docs/stage-7-openrouter-parser/project-input.schema.json'), 'utf8'));
  assert.deepEqual(schema.$defs.RoleCodeFact.properties.value.enum.filter((value) => value !== 'unknown').sort(),
    Object.keys(plain(context.STAGE8_ROLE_MAP)).sort());
  assert.deepEqual([...new Set(Object.values(plain(context.STAGE8_ROLE_ENTITY_TYPE)))].sort(), ['APPLIANCE_SLOT', 'MODULE']);
  assert.equal(fixture.project_type, 'KITCHEN');
  assert.equal(fixture.schema_version, 'project-input-v2');
  assert.equal(fixture.layout.run_shape.value, 'straight');
  assert.equal(fixture.layout.run_length_mm.value, 2400);
  assert.equal(fixture.layout.run_length_mm.fact_state, 'KNOWN');
  assert.equal(fixture.layout.wall_height_mm.fact_state, 'UNKNOWN');
  assert.equal(fixture.layout.wall_height_mm.value, 0);
  assert.equal(fixture.materials.facade_material.fact_state, 'UNKNOWN');
  assert.equal(fixture.materials.facade_color.fact_state, 'UNKNOWN');
  assert.equal(fixture.constraints.budget_rub.fact_state, 'UNKNOWN');
  assert.equal(fixture.missing_questions.some((question) => question.field_path === 'layout.wall_height_mm'), false);

  const [dishwasher, sink] = fixture.modules.required_modules;
  assert.deepEqual([dishwasher.entity_type.value, dishwasher.role_code.value], ['APPLIANCE_SLOT', 'dishwasher_slot']);
  assert.deepEqual([sink.entity_type.value, sink.role_code.value], ['MODULE', 'sink']);
  assert.equal(fixture.modules.required_modules.some((module) => /столешниц/i.test(module.name.value)), false);

  const blocked = plain(call('adaptProjectInputToLayoutRequest', fixture));
  assert.equal(blocked.status, 'INPUT_NOT_READY');
  assert.equal(blocked.blockers.some((blocker) => blocker.code === 'UNKNOWN_ROLE_ALIAS'), false);
  assert.ok(blocked.blockers.some((blocker) => blocker.field_path === 'modules.required_modules[1].width_mm'));

  const complete = structuredClone(fixture);
  complete.modules.required_modules[1].width_mm = known(600, 'Explicitly confirmed sink width.');
  complete.missing_questions = [];
  const adapted = plain(call('adaptProjectInputToLayoutRequest', complete));
  assert.equal(adapted.status, 'READY', JSON.stringify(adapted));
  assert.equal(adapted.layoutRequest.adapter_version, 'project-input-v2-adapter-v1');
  assert.deepEqual(adapted.layoutRequest.required_modules.map((module) => [module.role, module.module_class]), [
    ['dishwasher_slot', 'base_dishwasher_slot'],
    ['sink', 'base_sink'],
  ]);
  const result = run(complete);
  assert.equal(result.status, 'REQUIRES_EXPERT');
  assert.equal(result.blockers.some((blocker) => blocker.code === 'UNKNOWN_ROLE_ALIAS'), false);
});

test('wall height is operation-dependent with no implicit 2500 default', () => {
  const input = {
    schema_version: 'project-input-v2', project_type: 'KITCHEN',
    layout: {run_shape: known('straight'), run_length_mm: known(2400), zone: known('base'), wall_height_mm: fact(0, 'UNKNOWN')},
    modules: {required_modules: [], forbidden_roles: [], preferred_module_order: []},
    missing_questions: [], evidence: [],
    parser_metadata: {request_id: 'height-policy', parser_schema_version: 'project-input-v2', prompt_version: 'project-input-prompt-v4',
      provider: 'openrouter', model_requested: 'fixture', parsed_at: createdAt, input_modalities: ['text']},
  };
  const preliminary = plain(call('adaptProjectInputToLayoutRequest', input));
  assert.equal(preliminary.status, 'READY');
  assert.equal('wall_height_mm' in preliminary.layoutRequest, false);
  assert.equal(JSON.stringify(preliminary).includes('2500'), false);

  const heightDependent = plain(call('adaptProjectInputToLayoutRequest', input, {operationRequiresWallHeight: true}));
  assert.equal(heightDependent.status, 'INPUT_NOT_READY');
  assert.ok(heightDependent.blockers.some((blocker) => blocker.field_path === 'layout.wall_height_mm'));

  const approved = structuredClone(input);
  approved.layout.wall_height_mm = known(2500, 'User explicitly approved 2500 mm for preliminary calculation.');
  assert.equal(call('adaptProjectInputToLayoutRequest', approved, {operationRequiresWallHeight: true}).status, 'READY');
});

test('project-input-v2 adapter uses canonical codes only and never fuzzy maps unknown roles', () => {
  const input = {
    schema_version: 'project-input-v2', project_type: 'KITCHEN',
    layout: {run_shape: known('straight'), run_length_mm: known(600), zone: known('base'), wall_height_mm: fact(0, 'UNKNOWN')},
    modules: {required_modules: [{name: known('Неясный элемент'), entity_type: fact('unknown', 'UNKNOWN'),
      role_code: fact('unknown', 'UNKNOWN'), module_class: known('base'), width_mm: known(600), quantity: known(1)}],
      forbidden_roles: [], preferred_module_order: []},
    missing_questions: [], evidence: [],
    parser_metadata: {request_id: 'no-fuzzy', parser_schema_version: 'project-input-v2', prompt_version: 'project-input-prompt-v4',
      provider: 'openrouter', model_requested: 'fixture', parsed_at: createdAt, input_modalities: ['text']},
  };
  const adapted = plain(call('adaptProjectInputToLayoutRequest', input));
  assert.equal(adapted.status, 'INPUT_NOT_READY');
  assert.ok(adapted.blockers.some((blocker) => blocker.field_path.endsWith('.role_code') && blocker.code === 'REQUIRED_FACT_UNKNOWN'));
  assert.equal(adapted.blockers.some((blocker) => blocker.code === 'UNKNOWN_ROLE_ALIAS'), false);
});

test('Apps Script layout matches shared Python Stage 3 golden fixtures and is deterministic', () => {
  const fixture = JSON.parse(readFileSync(resolve(root, 'tests/fixtures/stage8-layout-golden.json'), 'utf8'));
  for (const scenario of fixture.scenarios) {
    const request = normalizeRequest(scenario.request);
    const outputs = Array.from({length: 5}, () => plain(call('composeStage8Layout', request, moduleSizeRules, 'module-size-rules-stage3-linear-v1')));
    assert.deepEqual(layoutProjection(outputs[0]), scenario.expected, scenario.name);
    assert.ok(outputs.slice(1).every((value) => JSON.stringify(value) === JSON.stringify(outputs[0])), `${scenario.name} must be deterministic`);
  }
});

test('missing approved recipes preserves MODULE_TO_PARTS_V1 expert debt and creates no BOM', () => {
  const data = masterData();
  data.moduleRecipes = [];
  data.moduleRecipeItems = [];
  const result = run(projectInput(), data);
  assert.equal(result.status, 'REQUIRES_EXPERT');
  assert.equal(result.blockers[0].code, 'APPROVED_RECIPE_REQUIRED');
  assert.deepEqual(result.calculation_items, []);
  assert.deepEqual(result.cost_results, []);
  assert.equal(result.rule_snapshot[0].rule_id, 'MODULE_TO_PARTS_V1');

  data.calculationRules = data.calculationRules.filter((entry) => entry.rule_id !== 'MODULE_TO_PARTS_V1');
  assert.equal(run(projectInput(), data).status, 'MASTER_DATA_INVALID');
});

test('quantity and exact decimal cost engine match Stage 3 area, edge, explicit and price separation behavior', () => {
  const result = run();
  assert.equal(result.status, 'SUCCESS');
  assert.deepEqual(result.calculation_items.map((item) => item.quantity), ['1', '6', '3']);
  assert.deepEqual(result.cost_results.map((item) => item.cost), ['123.45', '0.6', '7.5']);
  assert.equal(result.total, '131.55');
  const changed = masterData();
  changed.prices[0].unit_price = '200';
  const changedResult = run(projectInput(), changed);
  assert.deepEqual(changedResult.calculation_items, result.calculation_items);
  assert.equal(changedResult.total, '208.1');
  assert.equal(call('decimalMultiply_', '0.1', '0.2'), '0.02');
  assert.equal(call('decimalAdd_', '0.1', '0.2'), '0.3');
});

test('published pricebook resolver reports none, overlap, missing price and unit mismatch without working-price fallback', () => {
  const none = masterData();
  none.pricebookVersions = [];
  none.sprPrice = [{price_code: 'TEST_MATERIAL_PRICE', unit_price: '1'}];
  assert.equal(run(projectInput(), none).status, 'PRICEBOOK_NOT_AVAILABLE');

  const overlap = masterData();
  overlap.pricebookVersions.push({...overlap.pricebookVersions[0], pricebook_version_id: 'TEST_PRICEBOOK:2', version: '2'});
  assert.equal(run(projectInput(), overlap).status, 'MASTER_DATA_INVALID');

  const missing = masterData();
  missing.prices = missing.prices.filter((price) => price.price_code !== 'TEST_EDGE_PRICE');
  assert.equal(run(projectInput(), missing).status, 'PRICE_NOT_FOUND');

  const mismatch = masterData();
  mismatch.prices.find((price) => price.price_code === 'TEST_EDGE_PRICE').unit = 'pcs';
  assert.equal(run(projectInput(), mismatch).status, 'UNIT_MISMATCH');
});

test('canonical schema enforces SUCCESS completeness and blocker status diagnostics', () => {
  const schema = JSON.parse(readFileSync(resolve(root, 'docs/stage-8-calculation-kernel/calculation-result.schema.json'), 'utf8'));
  const validate = new Ajv2020({strict: false, validateFormats: false}).compile(schema);
  const success = run();
  assert.equal(validate(success), true, JSON.stringify(validate.errors));

  for (const [field, value] of [
    ['blockers', [{code: 'INVALID_SUCCESS', stage: 'COST', field_path: null, message: 'invalid', provenance: []}]],
    ['layout', null],
    ['pricebook_version_id', null],
    ['total', null],
    ['currency', null],
  ]) {
    const invalid = structuredClone(success);
    invalid[field] = value;
    assert.equal(validate(invalid), false, `SUCCESS with invalid ${field} must fail`);
  }

  const blockedData = masterData();
  blockedData.moduleRecipes = [];
  blockedData.moduleRecipeItems = [];
  const blocked = run(projectInput(), blockedData);
  assert.equal(blocked.status, 'REQUIRES_EXPERT');
  assert.equal(validate(blocked), true, JSON.stringify(validate.errors));

  const blockerWithoutDiagnostics = structuredClone(blocked);
  blockerWithoutDiagnostics.blockers = [];
  assert.equal(validate(blockerWithoutDiagnostics), false, 'blocker status without blockers must fail');

  assert.deepEqual(plain(call('validateCalculationResult', success)), {valid: true, errors: []});
  const nonCanonicalTotal = structuredClone(success);
  nonCanonicalTotal.total = '131.550';
  assert.equal(validate(nonCanonicalTotal), false);
  assert.equal(plain(call('validateCalculationResult', nonCanonicalTotal)).valid, false);
});

test('Stage 8 source has no LLM call, fuzzy mapping, working-price read, persistence, or synthetic BOM', () => {
  const source = files.filter((file) => !file.startsWith('generated/')).map((file) => readFileSync(resolve(apps, file), 'utf8')).join('\n');
  assert.doesNotMatch(source, /UrlFetchApp|fetchOpenRouter|parseProjectWithOpenRouter/);
  assert.doesNotMatch(source, /Custom_Price|spr_price|GOOGLEFINANCE/);
  assert.doesNotMatch(source, /Calculations|Offer|Quote/);
  assert.doesNotMatch(source, /levenshtein|fuzzy/i);
});
