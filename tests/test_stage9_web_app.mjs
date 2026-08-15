import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const serverSource = readFileSync(resolve(root, 'apps-script/stage9_server.gs'), 'utf8');
const htmlSource = readFileSync(resolve(root, 'apps-script/web_app.html'), 'utf8');

function createRuntime() {
  const logs = [];
  const output = {
    title: '',
    meta: [],
    setTitle(value) { this.title = value; return this; },
    addMetaTag(name, value) { this.meta.push([name, value]); return this; },
  };
  const context = vm.createContext({
    console: {log: (value) => logs.push(String(value))},
    Utilities: {getUuid: () => '11111111-2222-3333-4444-555555555555'},
    HtmlService: {createHtmlOutputFromFile: (name) => { output.file = name; return output; }},
  });
  vm.runInContext(serverSource, context, {filename: 'stage9_server.gs'});
  return {context, logs, output};
}

function fact(value, factState = 'KNOWN') {
  return {value, fact_state: factState};
}

function projectInput(overrides = {}) {
  return {
    schema_version: 'project-input-v1',
    project_type: 'KITCHEN',
    layout: {
      run_shape: fact('<script>alert(1)</script>'),
      run_length_mm: fact(3000),
      zone: fact('base'),
      wall_height_mm: fact(2500, 'INFERRED'),
    },
    modules: {required_modules: [], forbidden_roles: [], preferred_module_order: []},
    materials: {facade_color: fact('Белый')},
    constraints: {},
    missing_questions: [],
    parser_metadata: {request_id: 'REQ_TEST'},
    ...overrides,
  };
}

function calculation(status = 'REQUIRES_EXPERT', overrides = {}) {
  const blocked = status === 'SUCCESS' ? [] : [{
    code: status === 'REQUIRES_EXPERT' ? 'APPROVED_RECIPE_REQUIRED' : status,
    stage: 'RECIPE', field_path: null, message: 'Безопасное описание ограничения', provenance: [],
  }];
  return {
    result_schema_version: 'calculation-result-v1',
    calculation_model_version: 'stage8-kernel-v1',
    status,
    blockers: blocked,
    warnings: [],
    layout: status === 'INPUT_NOT_READY' ? null : {
      status: 'VALID', run_length_mm: 3000, occupied_length_mm: 3000, remainder_mm: 0,
      items: [{position: 1, role: 'generic_storage', module_class: 'base', width_mm: 600, required: false}],
    },
    cost_results: [],
    pricebook_version_id: null,
    total: null,
    currency: null,
    ...overrides,
  };
}

function request(overrides = {}) {
  return {request_version: 'stage9-request-v1', text: 'Прямая кухня 3000 мм', images: [], ...overrides};
}

function installSuccessPipeline(context, input = projectInput(), result = calculation()) {
  const calls = {parser: 0, calculation: 0, parserInput: null};
  context.parseProjectInput = (value) => {
    calls.parser += 1;
    calls.parserInput = value;
    return {status: 'SUCCESS', data: input};
  };
  context.calculateProject = (value) => {
    calls.calculation += 1;
    assert.equal(value, input);
    return result;
  };
  return calls;
}

test('doGet serves the single Russian HtmlService page', () => {
  const {context, output} = createRuntime();
  const result = context.doGet();
  assert.equal(result, output);
  assert.equal(output.file, 'web_app');
  assert.match(output.title, /AI Мебельщик/);
  assert.deepEqual(output.meta, [['viewport', 'width=device-width, initial-scale=1']]);
});

test('valid text-only request calls Stage 7 then Stage 8 exactly once', () => {
  const {context} = createRuntime();
  const calls = installSuccessPipeline(context);
  const response = context.submitStage9Project(request());
  assert.equal(calls.parser, 1);
  assert.equal(calls.calculation, 1);
  assert.equal(calls.parserInput.text, 'Прямая кухня 3000 мм');
  assert.deepEqual(Array.from(calls.parserInput.images), []);
  assert.equal(response.response_kind, 'RESULT');
  assert.equal(response.display_status, 'BUSINESS_BLOCKER');
  assert.equal(response.calculation_status, 'REQUIRES_EXPERT');
});

test('valid image is converted to the accepted Stage 7 image shape', () => {
  const {context} = createRuntime();
  const calls = installSuccessPipeline(context);
  const response = context.submitStage9Project(request({images: [{
    client_ref: 'кухня.png', mime_type: 'image/png', base64: 'QUJDRA==',
  }]}));
  assert.equal(calls.parser, 1);
  assert.equal(calls.calculation, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(calls.parserInput.images)), [{
    source_ref: 'кухня.png', mime_type: 'image/png', data: 'QUJDRA==',
  }]);
  assert.doesNotMatch(JSON.stringify(response), /QUJDRA==/);
});

test('request boundary rejects empty, oversized, unsupported and non-strict input before Stage 7', () => {
  const cases = [
    request({text: '   '}),
    request({text: 'x'.repeat(12001)}),
    request({unexpected: true}),
    request({images: [{client_ref: 'x.gif', mime_type: 'image/gif', base64: 'QUJDRA=='}]}),
    request({images: [{client_ref: 'x.png', mime_type: 'image/png', base64: 'QUJDRA==', extra: true}]}),
    request({images: Array.from({length: 4}, (_, index) => ({client_ref: `${index}.png`, mime_type: 'image/png', base64: 'QUJDRA=='}))}),
    request({images: [{client_ref: 'large.png', mime_type: 'image/png', base64: 'A'.repeat(5592408)}]}),
  ];
  for (const [caseIndex, value] of cases.entries()) {
    const {context} = createRuntime();
    let parserCalls = 0;
    context.parseProjectInput = () => { parserCalls += 1; return {status: 'SUCCESS', data: projectInput()}; };
    context.calculateProject = () => { throw new Error('must not run'); };
    const response = context.submitStage9Project(value);
    assert.equal(response.response_kind, 'INPUT_ERROR', `boundary case ${caseIndex}`);
    assert.equal(response.display_status, 'ERROR');
    assert.equal(parserCalls, 0);
  }
});

test('aggregate image limit is enforced before parser call', () => {
  const {context} = createRuntime();
  let parserCalls = 0;
  context.parseProjectInput = () => { parserCalls += 1; };
  const threeMiB = 'A'.repeat(4194304);
  const response = context.submitStage9Project(request({images: [1, 2, 3].map((number) => ({
    client_ref: `${number}.png`, mime_type: 'image/png', base64: threeMiB,
  }))}));
  assert.equal(response.technical_reference.input_code, 'IMAGES_TOO_LARGE');
  assert.equal(parserCalls, 0);
});

test('Stage 7 failure prevents Stage 8 and exposes only fixed safe diagnostics', () => {
  const {context} = createRuntime();
  let calculationCalls = 0;
  context.parseProjectInput = () => ({
    status: 'ERROR', category: 'AUTH_ERROR', message: 'API_KEY_SENTINEL',
    upstreamDiagnostic: {raw_provider_payload: 'RAW_PROVIDER_SENTINEL'}, errors: ['STACK_SENTINEL'],
  });
  context.calculateProject = () => { calculationCalls += 1; };
  const response = context.submitStage9Project(request());
  const serialized = JSON.stringify(response);
  assert.equal(calculationCalls, 0);
  assert.equal(response.response_kind, 'PARSER_ERROR');
  assert.equal(response.technical_reference.parser_category, 'AUTH_ERROR');
  assert.doesNotMatch(serialized, /API_KEY_SENTINEL|RAW_PROVIDER_SENTINEL|STACK_SENTINEL/);
});

test('SUCCESS maps layout and cost into a small browser-safe projection', () => {
  const {context} = createRuntime();
  const success = calculation('SUCCESS', {
    cost_results: [{item_id: 'ITEM_1', quantity: '2', unit: 'pcs', unit_price: '10', cost: '20', currency: 'RUB'}],
    pricebook_version_id: 'PB:1', total: '20', currency: 'RUB',
  });
  const calls = installSuccessPipeline(context, projectInput(), success);
  const response = context.submitStage9Project(request());
  assert.equal(calls.calculation, 1);
  assert.equal(response.display_status, 'CALCULATED');
  assert.equal(response.cost_summary.total, '20');
  assert.equal(response.cost_summary.items[0].cost, '20');
  assert.equal(response.layout_summary.items[0].width_mm, 600);
  assert.equal('project_input_ref' in response, false);
  assert.equal('evidence' in response, false);
});

test('REQUIRES_EXPERT remains a normal business blocker', () => {
  const {context} = createRuntime();
  installSuccessPipeline(context, projectInput(), calculation('REQUIRES_EXPERT'));
  const response = context.submitStage9Project(request());
  assert.equal(response.response_kind, 'RESULT');
  assert.equal(response.display_status, 'BUSINESS_BLOCKER');
  assert.match(response.message, /эксперт/i);
  assert.equal(response.blockers[0].code, 'APPROVED_RECIPE_REQUIRED');
});

test('INPUT_NOT_READY exposes canonical missing questions as clarification UX', () => {
  const {context} = createRuntime();
  const input = projectInput({missing_questions: [{
    question_id: 'RUN_LENGTH', field_path: 'layout.run_length_mm', priority: 'BLOCKING',
    question: 'Какова длина стены?', reason: 'Без длины нельзя подобрать компоновку.',
  }]});
  installSuccessPipeline(context, input, calculation('INPUT_NOT_READY'));
  const response = context.submitStage9Project(request());
  assert.equal(response.display_status, 'CLARIFICATION_REQUIRED');
  assert.equal(response.missing_questions[0].question, 'Какова длина стены?');
  assert.equal(response.calculation_status, 'INPUT_NOT_READY');
});

test('unexpected exception returns a generic correlation-safe system error', () => {
  const {context} = createRuntime();
  context.parseProjectInput = () => { throw new Error('INTERNAL_SECRET STACK_TRACE_SENTINEL'); };
  context.calculateProject = () => { throw new Error('must not run'); };
  const response = context.submitStage9Project(request());
  const serialized = JSON.stringify(response);
  assert.equal(response.response_kind, 'SYSTEM_ERROR');
  assert.match(response.request_id, /^WEB_/);
  assert.doesNotMatch(serialized, /INTERNAL_SECRET|STACK_TRACE_SENTINEL|Error:/);
});

test('safe log contains metadata only, not text or base64', () => {
  const {context, logs} = createRuntime();
  installSuccessPipeline(context);
  context.submitStage9Project(request({text: 'PRIVATE_TEXT_SENTINEL', images: [{
    client_ref: 'x.png', mime_type: 'image/png', base64: 'QUJDRA==',
  }]}));
  const log = logs.join('\n');
  assert.match(log, /request_id=WEB_/);
  assert.match(log, /image_count=1/);
  assert.doesNotMatch(log, /PRIVATE_TEXT_SENTINEL|QUJDRA==/);
});

test('script-like model text is preserved as text data and client has no unsafe rendering path', () => {
  const {context} = createRuntime();
  installSuccessPipeline(context);
  const response = context.submitStage9Project(request());
  assert.equal(response.understood_summary[0].value, '<script>alert(1)</script>');
  assert.doesNotMatch(htmlSource, /\.innerHTML\b|insertAdjacentHTML|document\.write|eval\s*\(/);
  assert.match(htmlSource, /\.textContent\s*=/);
  assert.match(htmlSource, /document\.createElement/);
});

test('UI contains required controls, states and only the Stage 9 browser call', () => {
  for (const id of ['project-text', 'image-picker', 'file-list', 'submit-button', 'loading-state',
    'understood-title', 'questions-title', 'calculation-title', 'edit-button']) {
    assert.match(htmlSource, new RegExp(`id="${id}"`), `missing ${id}`);
  }
  assert.match(htmlSource, /accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(htmlSource, /if \(submitting\) return/);
  assert.match(htmlSource, /submitButton\.disabled = value/);
  assert.match(htmlSource, /\.submitStage9Project\(request\)/);
  assert.doesNotMatch(htmlSource, /parseProjectInput|calculateProject|UrlFetchApp|SpreadsheetApp|DriveApp/);
  assert.doesNotMatch(htmlSource, /https?:\/\//);
});

test('Stage 9 source does not persist, administer prices, or expose forbidden diagnostics', () => {
  const combined = serverSource + '\n' + htmlSource;
  assert.doesNotMatch(combined, /SpreadsheetApp|DriveApp|PropertiesService|Authorization|raw provider|stack trace/i);
  assert.doesNotMatch(combined, /Session_Log|WebApp_History|Requests|Calculations|Offer|Quote/);
  assert.doesNotMatch(serverSource, /parserResult\.(message|errors|upstreamDiagnostic)|error\.(message|stack)/);
});
