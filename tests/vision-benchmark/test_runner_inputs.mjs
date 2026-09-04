import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir, mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {callOpenRouter, extractCompletion, openRouterEndpoint, OpenRouterApiError} from '../../tools/vision-benchmark/lib/openrouter.mjs';
import {DEFAULT_GENERATION_PARAMETERS, getOpenRouterApiKey, imageRequestParts, selectModels, validateModelConfig} from '../../tools/vision-benchmark/lib/inputs.mjs';
import {normalizeResponse} from '../../tools/vision-benchmark/lib/normalize.mjs';
import {runOne, sessionId, writeRunFiles} from '../../tools/vision-benchmark/run.mjs';
import {loadJson} from './fixture-utils.mjs';

test('model config rejects duplicate IDs and slugs', () => {
  assert.throws(() => validateModelConfig({models: [
    {id: 'provider/model', slug: 'same', enabled: true},
    {id: 'provider/model', slug: 'same', enabled: false},
  ]}), /duplicate model id.*duplicate model slug/su);
});

test('model selection is explicit and does not guess IDs', () => {
  const models = validateModelConfig({models: [
    {id: 'provider/one', slug: 'one', enabled: true},
    {id: 'provider/two', slug: 'two', enabled: false},
  ]});
  assert.deepEqual(selectModels(models, {all: true}).map((model) => model.slug), ['one']);
  assert.deepEqual(selectModels(models, {model: 'two'}).map((model) => model.slug), ['two']);
  assert.throws(() => selectModels(models, {model: 'guessed-model'}), /Unknown model/su);
  assert.throws(() => selectModels(models, {all: true, model: 'one'}), /either --all or --model/su);
});

test('OpenRouter key reads environment first and never requires a network call', async () => {
  const original = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = 'test-secret-value';
  try {
    assert.equal(await getOpenRouterApiKey('C:\\path\\that\\does\\not\\matter'), 'test-secret-value');
  } finally {
    if (original === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = original;
  }
});

test('OpenRouter key reads a quoted local .env when environment is absent', async () => {
  const original = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  const root = await mkdtemp(join(tmpdir(), 'vision-benchmark-env-'));
  try {
    await (await import('node:fs/promises')).writeFile(join(root, '.env'), 'OPENROUTER_API_KEY="local-secret"\n', 'utf8');
    assert.equal(await getOpenRouterApiKey(root), 'local-secret');
  } finally {
    await rm(root, {recursive: true, force: true});
    if (original !== undefined) process.env.OPENROUTER_API_KEY = original;
  }
});

test('multimodal request uses one fixed message and four labeled PNG data URLs', () => {
  const images = [1, 2, 3, 4].map((index) => ({imageId: `IMG_0${index}`, dataUrl: `data:image/png;base64,${index}`}));
  const parts = imageRequestParts(images);
  assert.equal(parts[0].type, 'text');
  assert.match(parts[0].text, /Analyze the four supplied images as one kitchen project/u);
  assert.deepEqual(parts.filter((part) => part.type === 'text').slice(1).map((part) => part.text), ['Source image IMG_01:', 'Source image IMG_02:', 'Source image IMG_03:', 'Source image IMG_04:']);
  assert.deepEqual(parts.filter((part) => part.type === 'image_url').map((part) => part.image_url.url), images.map((image) => image.dataUrl));
});

test('OpenRouter adapter sends fixed endpoint, system prompt, images, and generation parameters', async () => {
  let request;
  const response = await callOpenRouter({
    apiKey: 'secret-that-must-not-be-persisted',
    modelId: 'provider/model',
    systemPrompt: 'frozen prompt',
    content: [{type: 'text', text: 'fixed'}, {type: 'image_url', image_url: {url: 'data:image/png;base64,AA=='}}],
    generationParameters: DEFAULT_GENERATION_PARAMETERS,
    fetchImpl: async (url, init) => {
      request = {url, init};
      return new Response(JSON.stringify({id: 'response-id', model: 'provider/model', choices: [{message: {content: '{"ok":true}'}}], usage: {prompt_tokens: 10, completion_tokens: 4, total_tokens: 14}}), {status: 200, headers: {'content-type': 'application/json'}});
    },
  });
  assert.equal(request.url, openRouterEndpoint());
  assert.equal(request.init.method, 'POST');
  assert.equal(request.init.headers.Authorization, 'Bearer secret-that-must-not-be-persisted');
  const payload = JSON.parse(request.init.body);
  assert.deepEqual(payload.messages, [{role: 'system', content: 'frozen prompt'}, {role: 'user', content: [{type: 'text', text: 'fixed'}, {type: 'image_url', image_url: {url: 'data:image/png;base64,AA=='}}]}]);
  assert.equal(payload.temperature, 0);
  assert.equal(payload.max_tokens, 12000);
  assert.equal(response.text, '{"ok":true}');
  assert.deepEqual(response.usage, {input_tokens: 10, output_tokens: 4, total_tokens: 14});
});

test('OpenRouter adapter classifies HTTP failures without retaining authorization header', async () => {
  await assert.rejects(() => callOpenRouter({
    apiKey: 'secret-value',
    modelId: 'provider/model',
    systemPrompt: 'prompt',
    content: [],
    generationParameters: DEFAULT_GENERATION_PARAMETERS,
    fetchImpl: async () => new Response(JSON.stringify({error: {message: 'bad request'}}), {status: 400}),
  }), (error) => {
    assert.ok(error instanceof OpenRouterApiError);
    assert.equal(error.status, 400);
    assert.doesNotMatch(error.message, /secret-value/u);
    return true;
  });
});

test('completion extraction supports text content arrays', () => {
  const completion = extractCompletion({choices: [{message: {content: [{type: 'text', text: '{'}, {type: 'text', text: '}' }]}}]});
  assert.equal(completion.text, '{}');
});

test('normalizer preserves raw text and does not repair Markdown fences', async () => {
  const gold = await loadJson();
  const raw = `\`\`\`json\n${JSON.stringify(gold)}\n\`\`\``;
  const normalized = normalizeResponse(raw);
  assert.equal(normalized.rawText, raw);
  assert.equal(normalized.parseStatus, 'FAIL');
  assert.equal(normalized.json, null);
});

test('run file writer creates raw/meta and JSON only for valid parsed output', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vision-benchmark-run-'));
  try {
    const valid = await loadJson();
    await writeRunFiles(root, 1, JSON.stringify(valid), valid, {session_id: 's', run_number: 1});
    const raw = await readFile(join(root, 'run-01.raw.txt'));
    assert.notEqual(raw[0], 0xef);
    assert.deepEqual(JSON.parse(await readFile(join(root, 'run-01.json',), 'utf8')), valid);
    assert.deepEqual(JSON.parse(await readFile(join(root, 'run-01.meta.json',), 'utf8')), {session_id: 's', run_number: 1});

    await writeRunFiles(root, 2, '```json\n{}\n```', null, {session_id: 's', run_number: 2});
    assert.rejects(readFile(join(root, 'run-02.json')), /ENOENT/u);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('session IDs are UTC timestamp-safe filesystem names', () => {
  assert.match(sessionId(), /^\d{8}T\d{6}Z$/u);
});
