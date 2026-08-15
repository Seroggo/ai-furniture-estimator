import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import Ajv2020 from 'ajv/dist/2020.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appsRoot = resolve(root, 'apps-script');
const stage7Files = [
  'generated/project_input_schema.gs',
  'prompts/project_parser_prompt.gs',
  'openrouter_client.gs',
  'project_parser.gs',
];

function createRuntime({ apiKey = 'test-openrouter-key', model = 'vendor/test-vision-model' } = {}) {
  const config = { apiKey, model };
  const sleeps = [];
  const requiredScopes = [];
  const context = vm.createContext({
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty(name) {
            if (name === 'OPENROUTER_API_KEY') return config.apiKey;
            if (name === 'OPENROUTER_MODEL') return config.model;
            return null;
          },
        };
      },
    },
    Utilities: {
      getUuid: () => '00000000-0000-4000-8000-000000000007',
      sleep: (delay) => sleeps.push(delay),
    },
    UrlFetchApp: {
      fetch() {
        throw new Error('Unexpected real HTTP call');
      },
    },
    ScriptApp: {
      AuthMode: { FULL: 'FULL' },
      requireScopes(authMode, scopes) {
        requiredScopes.push({ authMode, scopes });
      },
    },
  });
  for (const file of stage7Files) {
    vm.runInContext(readFileSync(resolve(appsRoot, file), 'utf8'), context, { filename: file });
  }
  return { context, config, sleeps, requiredScopes };
}

function evidence(sourceType = 'TEXT', sourceRef = 'text:1', note = 'Explicitly stated by the user.') {
  return { source_type: sourceType, source_ref: sourceRef, evidence_note: note };
}

function known(value, sourceType, sourceRef, note) {
  return { value, fact_state: 'KNOWN', evidence: evidence(sourceType, sourceRef, note) };
}

function unknown(value) {
  return { value, fact_state: 'UNKNOWN' };
}

function completeModelOutput() {
  return {
    schema_version: 'project-input-v2',
    project_type: 'KITCHEN',
    project: { name: known('Кухня — тест'), notes: known('Прямая кухня') },
    layout: {
      run_shape: known('straight'),
      run_length_mm: known(3000),
      zone: known('base'),
      wall_height_mm: known(2600),
    },
    modules: {
      required_modules: [
        {
          name: known('Посудомоечная машина'),
          entity_type: known('APPLIANCE_SLOT'),
          role_code: known('dishwasher_slot'),
          module_class: known('base'),
          width_mm: known(600),
          quantity: known(1),
        },
        {
          name: known('Духовой шкаф'),
          entity_type: known('MODULE'),
          role_code: known('oven'),
          module_class: known('base'),
          width_mm: known(600),
          quantity: known(1),
        },
      ],
    },
    materials: {
      facade_material: unknown(''),
      facade_color: unknown(''),
    },
    missing_questions: [],
    evidence: [{ source_type: 'TEXT', source_ref: 'text:1', observation: 'Kitchen requirements.' }],
  };
}

function response(status, modelContent, extra = {}) {
  const body = status === 200
    ? {
        id: 'gen-test-7',
        model: 'vendor/test-vision-model:provider',
        choices: [{ message: { role: 'assistant', content: modelContent }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30, cost: 999 },
        ...extra,
      }
    : { error: { message: 'safe mocked failure' } };
  return {
    getResponseCode: () => status,
    getContentText: () => JSON.stringify(body),
  };
}

function successTransport(output, captures = []) {
  return (url, options) => {
    captures.push({ url, options });
    return response(200, JSON.stringify(output));
  };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertStrictTransportSchema(node, path = '$') {
  if (Array.isArray(node)) {
    node.forEach((item, index) => assertStrictTransportSchema(item, `${path}[${index}]`));
    return;
  }
  if (!node || typeof node !== 'object') return;
  const types = Array.isArray(node.type) ? node.type : [node.type];
  if (types.includes('object')) {
    const properties = Object.keys(node.properties || {});
    assert.deepEqual(Array.from(node.required || []).sort(), properties.sort(), `${path} must require every property`);
    assert.equal(node.additionalProperties, false, `${path} must reject additional properties`);
  }
  assert.equal('format' in node, false, `${path} must not contain format`);
  assert.equal('minimum' in node, false, `${path} must not contain minimum`);
  assert.equal('maximum' in node, false, `${path} must not contain maximum`);
  Object.entries(node).forEach(([key, value]) => assertStrictTransportSchema(value, `${path}.${key}`));
}

function unknownTransportOutput() {
  const unknownText = () => ({ value: '', fact_state: 'UNKNOWN', evidence: null });
  const unknownInteger = () => ({ value: 0, fact_state: 'UNKNOWN', evidence: null });
  return {
    schema_version: 'project-input-v2',
    project_type: 'KITCHEN',
    project: { name: unknownText(), notes: unknownText() },
    client: { name: unknownText(), address: unknownText(), phone: unknownText() },
    layout: {
      run_shape: { value: 'unknown', fact_state: 'UNKNOWN', evidence: null },
      run_length_mm: unknownInteger(),
      zone: { value: 'unknown', fact_state: 'UNKNOWN', evidence: null },
      wall_height_mm: unknownInteger(),
    },
    modules: { required_modules: [], forbidden_roles: [], preferred_module_order: [] },
    materials: {
      countertop_material: unknownText(),
      facade_material: unknownText(),
      facade_color: unknownText(),
      body_material: unknownText(),
      edge_material: unknownText(),
      hardware_preferences: [],
    },
    constraints: {
      budget_rub: unknownInteger(),
      budget_notes: unknownText(),
      deadline: unknownText(),
      special_requirements: [],
    },
    missing_questions: [],
    evidence: [],
  };
}

test('complete text input produces validated facts and deterministic metadata', () => {
  const { context } = createRuntime();
  const result = context.parseProjectInput(
    { text: 'Прямая кухня 3000 мм, ПММ 600 и духовка 600.', request_id: 'REQ_COMPLETE' },
    { transport: successTransport(completeModelOutput()), sleeper: () => {} },
  );
  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.data.layout.run_length_mm.value, 3000);
  assert.equal(result.data.modules.required_modules.length, 2);
  assert.deepEqual(plain(result.data.parser_metadata.input_modalities), ['text']);
  assert.equal(result.data.parser_metadata.request_id, 'REQ_COMPLETE');
  assert.equal(result.data.parser_metadata.model_requested, 'vendor/test-vision-model');
  assert.equal(result.data.parser_metadata.model_returned, 'vendor/test-vision-model:provider');
  assert.deepEqual(plain(result.data.parser_metadata.usage), {
    prompt_tokens: 10,
    completion_tokens: 20,
    total_tokens: 30,
  });
  assert.doesNotMatch(JSON.stringify(result.data), /"(?:price|cost|bom)"\s*:/i);
});

test('incomplete input preserves UNKNOWN and returns a meaningful question', () => {
  const { context } = createRuntime();
  const output = {
    schema_version: 'project-input-v2',
    project_type: 'KITCHEN',
    layout: {
      run_shape: unknown('unknown'),
      run_length_mm: unknown(0),
    },
    materials: { facade_material: unknown(''), facade_color: unknown('') },
    missing_questions: [{
      question_id: 'ASK_RUN_LENGTH',
      field_path: 'layout.run_length_mm',
      question: 'Какова доступная длина кухни в миллиметрах?',
      priority: 'BLOCKING',
      reason: 'Без длины нельзя проверить допустимость будущей конфигурации.',
    }],
    evidence: [],
  };
  const result = context.parseProjectInput(
    { text: 'Нужна кухня, детали пока неизвестны.' },
    { transport: successTransport(output), sleeper: () => {} },
  );
  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.data.layout.run_length_mm.fact_state, 'UNKNOWN');
  assert.equal(result.data.layout.run_length_mm.value, 0);
  assert.equal(result.data.missing_questions[0].priority, 'BLOCKING');
});

test('conflicting input remains CONFLICT and does not select a value', () => {
  const { context } = createRuntime();
  const output = {
    schema_version: 'project-input-v2',
    project_type: 'KITCHEN',
    layout: {
      run_length_mm: {
        value: 0,
        fact_state: 'CONFLICT',
        evidence: evidence('MULTI_SOURCE', 'text:1,text:2', 'Two stated lengths conflict: 3000 mm and 3200 mm.'),
      },
    },
    missing_questions: [{
      question_id: 'RESOLVE_RUN_LENGTH',
      field_path: 'layout.run_length_mm',
      question: 'Какая длина верна: 3000 или 3200 мм?',
      priority: 'BLOCKING',
      reason: 'Contradictory dimensions must be resolved.',
    }],
    evidence: [],
  };
  const result = context.parseProjectInput(
    { text: 'Длина 3000 мм. Уточнение: длина 3200 мм.' },
    { transport: successTransport(output), sleeper: () => {} },
  );
  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.data.layout.run_length_mm.fact_state, 'CONFLICT');
  assert.equal(result.data.layout.run_length_mm.value, 0);
});

test('hallucinated defaults and promoted inferences are rejected', () => {
  const { context } = createRuntime();
  const defaulted = completeModelOutput();
  defaulted.materials.facade_material = { value: 'МДФ', fact_state: 'UNKNOWN' };
  let result = context.parseProjectInput(
    { text: 'Материал не указан.' },
    { transport: successTransport(defaulted), sleeper: () => {} },
  );
  assert.equal(result.category, 'PARSER_OUTPUT_INVALID');
  assert.match(result.errors.join('\n'), /empty\/zero\/unknown sentinel/);

  const inferred = completeModelOutput();
  inferred.layout.run_length_mm = { value: 3000, fact_state: 'INFERRED' };
  result = context.parseProjectInput(
    { text: 'Размер можно только предположить.' },
    { transport: successTransport(inferred), sleeper: () => {} },
  );
  assert.equal(result.category, 'PARSER_OUTPUT_INVALID');
  assert.match(result.errors.join('\n'), /INFERRED but has incomplete evidence/);
});

test('multimodal request is text-first, uses data URLs, and requires response_format capability', () => {
  const { context } = createRuntime();
  const captures = [];
  const result = context.parseProjectInput(
    {
      text: 'На эскизе указана длина.',
      images: [{ mime_type: 'image/png', data: 'aGVsbG8=', source_ref: 'synthetic-plan' }],
    },
    { transport: successTransport(completeModelOutput(), captures), sleeper: () => {} },
  );
  assert.equal(result.status, 'SUCCESS');
  const options = captures[0].options;
  const payload = JSON.parse(options.payload);
  assert.equal(payload.messages[1].content[0].type, 'text');
  assert.equal(payload.messages[1].content[1].type, 'image_url');
  assert.equal(payload.messages[1].content[1].image_url.url, 'data:image/png;base64,aGVsbG8=');
  assert.equal(payload.provider.require_parameters, true);
  assert.equal(payload.response_format.type, 'json_schema');
  assert.equal(payload.response_format.json_schema.strict, true);
  assert.equal('parser_metadata' in payload.response_format.json_schema.schema.properties, false);
  assert.deepEqual(payload.response_format.json_schema.schema, plain(context.PROJECT_INPUT_OPENROUTER_SCHEMA));
  assert.equal(payload.stream, false);
  assert.equal(options.timeoutSeconds, 60);
  assert.deepEqual(plain(result.data.parser_metadata.input_modalities), ['text', 'image']);
});

test('invalid model JSON and additional properties fail without semantic retry', () => {
  const { context } = createRuntime();
  let calls = 0;
  let result = context.parseProjectInput(
    { text: 'Тест.' },
    {
      transport: () => { calls += 1; return response(200, '{broken'); },
      maxRetries: 2,
      sleeper: () => {},
    },
  );
  assert.equal(result.category, 'PARSER_OUTPUT_INVALID');
  assert.equal(calls, 1);

  const extra = completeModelOutput();
  extra.layout.unexpected = true;
  result = context.parseProjectInput(
    { text: 'Тест.' },
    { transport: successTransport(extra), sleeper: () => {} },
  );
  assert.equal(result.category, 'PARSER_OUTPUT_INVALID');
  assert.match(result.errors.join('\n'), /has an unknown property/);
});

test('unsupported or malformed image is INPUT_INVALID and makes no HTTP call', () => {
  const { context } = createRuntime();
  let calls = 0;
  const transport = () => { calls += 1; return response(200, '{}'); };
  let result = context.parseProjectInput(
    { text: 'Тест.', images: [{ mime_type: 'image/gif', data: 'R0lGODlh', source_ref: 'gif' }] },
    { transport },
  );
  assert.equal(result.category, 'INPUT_INVALID');
  assert.equal(calls, 0);
  result = context.parseProjectInput(
    { text: 'Тест.', images: [{ mime_type: 'image/png', data: 'not base64', source_ref: 'bad' }] },
    { transport },
  );
  assert.equal(result.category, 'INPUT_INVALID');
  assert.equal(calls, 0);
});

test('runtime config is mandatory and has no hardcoded model fallback', () => {
  let runtime = createRuntime({ apiKey: null });
  let calls = 0;
  let result = runtime.context.parseProjectInput({ text: 'Тест.' }, { transport: () => { calls += 1; } });
  assert.equal(result.category, 'CONFIG_ERROR');
  assert.equal(calls, 0);

  runtime = createRuntime({ model: '   ' });
  result = runtime.context.parseProjectInput({ text: 'Тест.' }, { transport: () => { calls += 1; } });
  assert.equal(result.category, 'CONFIG_ERROR');
  assert.equal(calls, 0);
  const source = readFileSync(resolve(appsRoot, 'openrouter_client.gs'), 'utf8');
  assert.doesNotMatch(source, /OPENROUTER_MODEL[^\n]*(?:\|\||\?\?)/);
});

test('diagnostics never serialize key, authorization header, input text, image, or raw response', () => {
  const key = 'sk-or-sensitive-test-value';
  const { context } = createRuntime({ apiKey: key });
  const result = context.parseProjectInput(
    { text: 'PRIVATE CUSTOMER TEXT' },
    {
      transport: () => { throw new Error(`transport leaked Bearer ${key} PRIVATE CUSTOMER TEXT`); },
      maxRetries: 0,
      sleeper: () => {},
    },
  );
  const serialized = JSON.stringify(result);
  assert.equal(result.category, 'UPSTREAM_ERROR');
  assert.doesNotMatch(serialized, /sk-or-sensitive|Bearer|PRIVATE CUSTOMER TEXT/);
});

test('retry is bounded and only transient failures are retried', () => {
  const { context } = createRuntime();
  let calls = 0;
  const delays = [];
  let result = context.parseProjectInput(
    { text: 'Тест transient.' },
    {
      transport: () => {
        calls += 1;
        return calls < 3 ? response(503, '') : response(200, JSON.stringify(completeModelOutput()));
      },
      maxRetries: 99,
      sleeper: (delay) => delays.push(delay),
    },
  );
  assert.equal(result.status, 'SUCCESS');
  assert.equal(calls, 3);
  assert.deepEqual(delays, [1000, 2000]);

  calls = 0;
  result = context.parseProjectInput(
    { text: 'Тест non-transient.' },
    {
      transport: () => { calls += 1; return response(400, ''); },
      maxRetries: 2,
      sleeper: () => assert.fail('400 must not sleep'),
    },
  );
  assert.equal(result.category, 'UPSTREAM_ERROR');
  assert.equal(calls, 1);
});

test('privacy-safe upstream diagnostics classify schema rejection without raw error text', () => {
  const { context } = createRuntime();
  const sensitiveRaw = 'Invalid response_format JSON schema near PRIVATE CUSTOMER TEXT';
  const result = context.parseProjectInput(
    { text: 'PRIVATE CUSTOMER TEXT' },
    {
      transport: () => ({
        getResponseCode: () => 400,
        getContentText: () => JSON.stringify({ error: { message: sensitiveRaw } }),
      }),
      sleeper: () => {},
    },
  );
  assert.equal(result.category, 'UPSTREAM_ERROR');
  assert.equal(result.httpStatus, 400);
  assert.equal(result.diagnosticCode, 'SCHEMA_REJECTED');
  assert.equal(result.upstreamDiagnostic.error_code, undefined);
  assert.equal(result.upstreamDiagnostic.error_message, 'Invalid response_format JSON schema near [REDACTED]');
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE CUSTOMER TEXT/);
});

test('OpenRouter 400 exposes only allowlisted sanitized error envelope fields', () => {
  const { context } = createRuntime();
  const result = context.parseProjectInput(
    { text: 'PRIVATE CUSTOMER TEXT' },
    {
      transport: () => ({
        getResponseCode: () => 400,
        getContentText: () => JSON.stringify({
          id: 'req-safe-123',
          error: {
            code: 400,
            message: 'No endpoints found matching required provider parameters. Bearer sk-or-v1-PRIVATESECRET',
            metadata: {
              provider_name: 'OpenAI',
              provider_request_id: 'provider-safe-456',
              hidden_payload: 'PRIVATE CUSTOMER TEXT',
            },
          },
          request_messages: ['PRIVATE CUSTOMER TEXT'],
        }),
      }),
      sleeper: () => {},
    },
  );
  assert.equal(result.diagnosticCode, 'MODEL_OR_PROVIDER_UNAVAILABLE');
  assert.deepEqual(JSON.parse(JSON.stringify(result.upstreamDiagnostic)), {
    error_code: '400',
    error_message: 'No endpoints found matching required provider parameters. Bearer [REDACTED]',
    provider_name: 'OpenAI',
    request_id: 'req-safe-123',
    provider_request_id: 'provider-safe-456',
  });
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE CUSTOMER TEXT|PRIVATESECRET|hidden_payload|request_messages/);
});

test('transport configuration errors are classified safely and are not retried', () => {
  const { context } = createRuntime();
  let calls = 0;
  const result = context.parseProjectInput(
    { text: 'PRIVATE CUSTOMER TEXT' },
    {
      transport: () => {
        calls += 1;
        throw new Error('Invalid argument: timeoutSeconds PRIVATE CUSTOMER TEXT');
      },
      maxRetries: 2,
      sleeper: () => assert.fail('local transport configuration errors must not sleep'),
    },
  );
  assert.equal(result.category, 'UPSTREAM_ERROR');
  assert.equal(result.diagnosticCode, 'INVALID_TIMEOUT_OPTION');
  assert.equal(calls, 1);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE CUSTOMER TEXT|timeoutSeconds/);
});

test('canonical schema is the only source and generated artifact is current', () => {
  const schema = JSON.parse(readFileSync(resolve(root, 'docs/stage-7-openrouter-parser/project-input.schema.json'), 'utf8'));
  assert.doesNotThrow(() => new Ajv2020({strict: false, validateFormats: false}).compile(schema));
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.properties.schema_version.enum, ['project-input-v2']);
  assert.deepEqual(schema.properties.project_type.enum, ['KITCHEN']);
  assert.ok(schema.required.includes('project_type'));
  assert.equal(JSON.stringify(schema).includes('enum_values'), false);
  assert.deepEqual(schema.$defs.LayoutShapeFact.properties.value.enum, ['straight', 'L-shaped', 'U-shaped', 'galley', 'unknown']);
  assert.deepEqual(schema.$defs.LayoutEntityTypeFact.properties.value.enum, ['MODULE', 'APPLIANCE_SLOT', 'unknown']);
  assert.deepEqual(schema.$defs.RoleCodeFact.properties.value.enum, [
    'generic_storage', 'drawer', 'sink', 'dishwasher_slot', 'oven', 'hob', 'narrow_cargo',
    'dish_dryer', 'hood', 'pantry', 'fridge', 'unknown',
  ]);
  assert.equal(schema.$defs.IntegerFact.properties.value.minimum, 0);
  assert.equal(schema.$defs.ParserMetadata.properties.parsed_at.format, 'date-time');
  const generated = spawnSync('python', ['tools/generate_project_input_schema.py', '--check'], { cwd: root, encoding: 'utf8' });
  assert.equal(generated.status, 0, generated.stdout + generated.stderr);
  const clientSource = readFileSync(resolve(appsRoot, 'openrouter_client.gs'), 'utf8');
  assert.match(clientSource, /PROJECT_INPUT_OPENROUTER_SCHEMA/);
  assert.doesNotMatch(clientSource, /delete schema\.properties\.parser_metadata/);
});

test('project-input-v2 rejects free-text machine roles and entity-role mismatches', () => {
  const { context } = createRuntime();
  const freeTextRole = completeModelOutput();
  freeTextRole.modules.required_modules[0].role_code.value = 'посудомоечная машина';
  let result = context.parseProjectInput(
    {text: 'ПММ 600 мм.'},
    {transport: successTransport(freeTextRole), sleeper: () => {}},
  );
  assert.equal(result.category, 'PARSER_OUTPUT_INVALID');
  assert.match(result.errors.join('\n'), /role_code\.value must be one of the allowed enum values/);

  const mismatched = completeModelOutput();
  mismatched.modules.required_modules[0].entity_type.value = 'MODULE';
  result = context.parseProjectInput(
    {text: 'Место под встроенную ПММ 600 мм.'},
    {transport: successTransport(mismatched), sleeper: () => {}},
  );
  assert.equal(result.category, 'PARSER_OUTPUT_INVALID');
  assert.match(result.errors.join('\n'), /entity_type must be APPLIANCE_SLOT.*dishwasher_slot/);
});

test('Stage 9 live regression fixture is valid canonical project-input-v2', () => {
  const {context} = createRuntime();
  const fixture = JSON.parse(readFileSync(resolve(root, 'tests/fixtures/stage9-live-project-input-v2.json'), 'utf8'));
  assert.deepEqual(plain(context.validateProjectInput(fixture)), {valid: true, errors: []});
  assert.equal(fixture.modules.required_modules[0].role_code.value, 'dishwasher_slot');
  assert.equal(fixture.modules.required_modules[1].role_code.value, 'sink');
});

test('project-input-v2 preliminary layout rejects unnecessary wall-height questions and defaults', () => {
  const {context} = createRuntime();
  const output = unknownTransportOutput();
  output.layout.run_shape = {value: 'straight', fact_state: 'KNOWN', evidence: evidence()};
  output.layout.run_length_mm = {value: 2400, fact_state: 'KNOWN', evidence: evidence()};
  output.layout.zone = {value: 'base', fact_state: 'KNOWN', evidence: evidence()};
  output.missing_questions = [{
    question_id: 'ASK_WALL_HEIGHT', field_path: 'layout.wall_height_mm',
    question: 'Какова высота стены?', priority: 'BLOCKING', reason: 'Synthetic unnecessary question.',
  }];
  const result = context.parseProjectInput(
    {text: 'Прямая нижняя кухня 2400 мм; высота не задана.'},
    {transport: successTransport(output), sleeper: () => {}},
  );
  assert.equal(result.category, 'PARSER_OUTPUT_INVALID');
  assert.match(result.errors.join('\n'), /wall_height_mm.*not required by preliminary linear layout/);
  assert.equal(output.layout.wall_height_mm.value, 0);
  assert.equal(JSON.stringify(output).includes('2500'), false);
});

test('generated transport schema is strict-compatible while canonical constraints remain richer', () => {
  const { context } = createRuntime();
  const transport = plain(context.PROJECT_INPUT_OPENROUTER_SCHEMA);
  const canonical = plain(context.PROJECT_INPUT_SCHEMA);
  assertStrictTransportSchema(transport);
  assert.equal('parser_metadata' in transport.properties, false);
  assert.deepEqual(transport.properties.project_type.enum, ['KITCHEN']);
  assert.deepEqual(transport.properties.missing_questions.type, 'array');
  assert.equal(transport.properties.layout.additionalProperties, false);
  assert.equal(canonical.properties.layout.properties.run_length_mm.properties.value.minimum, 0);
  assert.equal(canonical.properties.parser_metadata.properties.parsed_at.format, 'date-time');
});

test('UNKNOWN transport null sentinels decode without weakening canonical validation', () => {
  const { context } = createRuntime();
  const output = unknownTransportOutput();
  const result = context.parseProjectInput(
    { text: 'No project facts are available.' },
    { transport: successTransport(output), sleeper: () => {} },
  );
  assert.equal(result.status, 'SUCCESS', JSON.stringify(result));
  assert.equal(result.data.layout.run_length_mm.fact_state, 'UNKNOWN');
  assert.equal(result.data.layout.run_length_mm.value, 0);
  assert.equal('evidence' in result.data.layout.run_length_mm, false);
});

test('transport-compatible values still fail canonical minimum and date-time checks', () => {
  const { context } = createRuntime();
  const output = unknownTransportOutput();
  output.layout.run_length_mm = {
    value: -1,
    fact_state: 'KNOWN',
    evidence: evidence('TEXT', 'text:1', 'Explicit negative test value.'),
  };
  let result = context.parseProjectInput(
    { text: 'Synthetic negative dimension.' },
    { transport: successTransport(output), sleeper: () => {} },
  );
  assert.equal(result.category, 'PARSER_OUTPUT_INVALID');
  assert.match(result.errors.join('\n'), /greater than or equal to 0/);

  result = context.parseProjectInput(
    { text: 'Valid synthetic baseline.' },
    { transport: successTransport(unknownTransportOutput()), sleeper: () => {} },
  );
  assert.equal(result.status, 'SUCCESS', JSON.stringify(result));
  result.data.parser_metadata.parsed_at = 'not-a-date';
  const validation = context.validateProjectInput(result.data);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join('\n'), /valid ISO 8601 date-time/);
});

test('project_type canonical constraint accepts only required KITCHEN', () => {
  const { context } = createRuntime();
  let output = completeModelOutput();
  let result = context.parseProjectInput(
    { text: 'Тест кухни.' },
    { transport: successTransport(output), sleeper: () => {} },
  );
  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.data.project_type, 'KITCHEN');

  output = completeModelOutput();
  delete output.project_type;
  result = context.parseProjectInput(
    { text: 'Тест без типа проекта.' },
    { transport: successTransport(output), sleeper: () => {} },
  );
  assert.equal(result.category, 'PARSER_OUTPUT_INVALID');
  assert.match(result.errors.join('\n'), /missing required property: project_type/);

  output = completeModelOutput();
  output.project_type = 'WARDROBE';
  result = context.parseProjectInput(
    { text: 'Тест неверного типа.' },
    { transport: successTransport(output), sleeper: () => {} },
  );
  assert.equal(result.category, 'PARSER_OUTPUT_INVALID');
  assert.match(result.errors.join('\n'), /project_type must be one of the allowed enum values/);
});

test('Stage 7 authorization helper requests only external_request with FULL auth mode', () => {
  const { context, requiredScopes } = createRuntime();
  context.authorizeStage7ExternalRequest();
  assert.equal(requiredScopes.length, 1);
  assert.equal(requiredScopes[0].authMode, 'FULL');
  assert.deepEqual(Array.from(requiredScopes[0].scopes), [
    'https://www.googleapis.com/auth/script.external_request',
  ]);
});
