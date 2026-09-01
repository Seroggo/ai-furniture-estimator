import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));

test('generated active V1 runtime executes without Node require', () => {
  const context = vm.createContext({});
  vm.runInContext(read('apps-script/generated/active_v1_runtime.gs'), context);
  vm.runInContext(read('apps-script/generated/active_v1_config.gs'), context);
  const draft = json('fixtures/e2e/scenario_c_draft.json');
  context.input = {Stage10: {Draft: draft, Evidence: [], Profile: context.ACTIVE_V1_PROFILE}};
  context.options = {
    ConstructionDefaults: json('fixtures/e2e/construction_defaults_v1.json'),
    PriceRows: json('fixtures/e2e/prices_v1.json'),
    CalculationContext: {calculation_id: 'GAS_TEST', timestamp: '2026-08-31T12:00:00.000Z'},
    CostingOptions: {TargetCurrency: 'RUB'}
  };
  const result = vm.runInContext('runActiveV1Pipeline(input, options)', context);
  assert.equal(result.Status, 'NEEDS_CLARIFICATION');
  assert.ok(result.Stage10.Brief.Questions.length > 0);
  assert.equal(result.Sheets_bundle, null);
});

test('generated deployment seed is exact and idempotent-ready', () => {
  const context = vm.createContext({});
  vm.runInContext(read('apps-script/generated/deployment_seed.gs'), context);
  assert.equal(context.SHEETS_V1_DEPLOYMENT_SEED.Prices.length, 17);
  assert.equal(context.SHEETS_V1_DEPLOYMENT_SEED.Construction_Defaults.length, 9);
  assert.equal(new Set(context.SHEETS_V1_DEPLOYMENT_SEED.Prices.map((row) => row.item_id)).size, 17);
  assert.equal(new Set(context.SHEETS_V1_DEPLOYMENT_SEED.Construction_Defaults.map((row) => row.rule_id)).size, 9);
});

test('active V1 Web adapter creates a validator-compatible draft', () => {
  const context = vm.createContext({});
  vm.runInContext(read('apps-script/generated/active_v1_config.gs'), context);
  vm.runInContext(read('apps-script/active_v1_server.gs'), context);
  const known = (value) => ({value: value, fact_state: 'KNOWN', evidence: {source_type: 'TEXT', source_ref: 'text:1', evidence_note: 'Explicit.'}});
  context.projectInput = {
    layout: {run_shape: known('straight'), run_length_mm: known(1200), zone: known('base')},
    modules: {required_modules: [{role_code: known('generic_storage'), module_class: known('base'), width_mm: known(600), quantity: known(2)}]}
  };
  const draft = vm.runInContext("activeV1ProjectInputToDraft_(projectInput, 'REQ_1')", context);
  context.input = {Stage10: {Draft: draft, Evidence: [], Profile: context.ACTIVE_V1_PROFILE}};
  vm.runInContext(read('apps-script/generated/active_v1_runtime.gs'), context);
  context.options = {ConstructionDefaults: json('fixtures/e2e/construction_defaults_v1.json'), PriceRows: []};
  const result = vm.runInContext('runActiveV1Pipeline(input, options)', context);
  assert.equal(result.Status, 'NEEDS_CLARIFICATION');
  assert.equal(result.Stage10.Draft.assemblies[0].modules.length, 2);
  assert.ok(result.Stage10.Brief.Questions.length > 0);
});

test('OpenRouter Vision uses the dedicated runtime property and normalizes success', () => {
  const properties = {OPENROUTER_API_KEY: 'SECRET_TEST_KEY'};
  let requestPayload = null;
  const context = vm.createContext({
    PropertiesService: {getScriptProperties: () => ({
      getProperty: (key) => properties[key] || null,
      setProperty: (key, value) => { properties[key] = value; }
    })},
    UrlFetchApp: {fetch: () => { throw new Error('unused'); }},
    Utilities: {sleep() {}}
  });
  vm.runInContext(read('apps-script/openrouter_client.gs'), context);
  context.transport = (url, options) => {
    requestPayload = JSON.parse(options.payload);
    return {
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify({
        id: 'safe-request-id',
        model: requestPayload.model,
        choices: [{message: {content: JSON.stringify({source_ref: 'IMG', entities: [], visible_text: [], visible_dimensions: []})}}]
      })
    };
  };
  context.imageInput = {
    source_ref: 'IMG',
    images: [{source_ref: 'IMG', mime_type: 'image/png', data: 'QUJDRA=='}],
    allowed_target_paths: ['assemblies[0].modules[0].dimensions.width_mm']
  };
  const result = vm.runInContext('callOpenRouterVision(imageInput, {transport: transport, maxRetries: 0})', context);
  assert.equal(result.status, 'SUCCESS');
  assert.equal(properties.OPENROUTER_VISION_MODEL, 'qwen/qwen3-vl-235b-a22b-instruct');
  assert.equal(requestPayload.model, properties.OPENROUTER_VISION_MODEL);
  assert.deepEqual(Object.keys(result.data).sort(), ['entities', 'source_ref', 'visible_dimensions', 'visible_text']);
  assert.doesNotMatch(JSON.stringify(result), /SECRET_TEST_KEY/);
});

