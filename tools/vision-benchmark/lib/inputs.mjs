import {createHash} from 'node:crypto';
import {mkdir, readFile} from 'node:fs/promises';
import {dirname, isAbsolute, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateRawResult} from '../validate.mjs';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
export const REPOSITORY_ROOT = resolve(MODULE_DIR, '..', '..', '..');

export const BENCHMARK_ROOT = 'benchmarks/vision';
export const IMAGE_NAMES = Object.freeze(['IMG_01.png', 'IMG_02.png', 'IMG_03.png', 'IMG_04.png']);
export const USER_MESSAGE = Object.freeze(
  'Analyze the four supplied images as one kitchen project.\n' +
  'The images are identified as IMG_01, IMG_02, IMG_03, IMG_04 in the supplied order.\n' +
  'Return only JSON according to the system prompt.',
);
export const DEFAULT_GENERATION_PARAMETERS = Object.freeze({
  temperature: 0,
  max_tokens: 12000,
});

export class BenchmarkInputError extends Error {
  constructor(message, {code = 'INPUT_ERROR', path = null} = {}) {
    super(message);
    this.name = 'BenchmarkInputError';
    this.code = code;
    this.path = path;
  }
}

export function benchmarkPaths(rootDir = REPOSITORY_ROOT) {
  const benchmarkDir = resolve(rootDir, BENCHMARK_ROOT);
  return Object.freeze({
    benchmarkDir,
    prompt: join(benchmarkDir, 'prompt', 'FURNITURE_VISION_RUNTIME_PROMPT_V1_5_FINAL.md'),
    gold: join(benchmarkDir, 'gold', 'GOLD_VISION_KITCHEN_2025-04-01_V1_5.json'),
    images: IMAGE_NAMES.map((name) => join(benchmarkDir, 'images', name)),
    config: join(benchmarkDir, 'config', 'models.json'),
    results: join(benchmarkDir, 'results'),
    reports: join(benchmarkDir, 'reports'),
  });
}

async function readRequired(filePath, kind) {
  try {
    return await readFile(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new BenchmarkInputError(`Missing ${kind}: ${filePath}`, {
        code: 'MISSING_INPUT',
        path: filePath,
      });
    }
    throw new BenchmarkInputError(`Cannot read ${kind} at ${filePath}: ${error.message}`, {
      code: 'INPUT_READ_ERROR',
      path: filePath,
    });
  }
}

function parseJson(text, filePath, kind) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new BenchmarkInputError(`Invalid JSON in ${kind} ${filePath}: ${error.message}`, {
      code: 'INVALID_JSON',
      path: filePath,
    });
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function validateModelConfig(config, configPath = 'benchmarks/vision/config/models.json') {
  const errors = [];
  if (!isPlainObject(config)) {
    throw new BenchmarkInputError(`Model config must be a JSON object: ${configPath}`, {
      code: 'INVALID_MODEL_CONFIG',
      path: configPath,
    });
  }
  if (!Array.isArray(config.models)) {
    throw new BenchmarkInputError(`Model config must contain a models array: ${configPath}`, {
      code: 'INVALID_MODEL_CONFIG',
      path: configPath,
    });
  }

  const ids = new Set();
  const slugs = new Set();
  const models = config.models.map((model, index) => {
    const itemPath = `${configPath}:models[${index}]`;
    if (!isPlainObject(model)) {
      errors.push(`${itemPath} must be an object`);
      return null;
    }
    if (typeof model.id !== 'string' || model.id.trim() === '' || model.id !== model.id.trim()) {
      errors.push(`${itemPath}.id must be a non-empty exact OpenRouter model ID without surrounding whitespace`);
    } else if (ids.has(model.id)) {
      errors.push(`duplicate model id "${model.id}" at ${itemPath}.id`);
    } else {
      ids.add(model.id);
    }
    if (typeof model.slug !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(model.slug)) {
      errors.push(`${itemPath}.slug must be a unique filesystem-safe identifier`);
    } else if (slugs.has(model.slug)) {
      errors.push(`duplicate model slug "${model.slug}" at ${itemPath}.slug`);
    } else {
      slugs.add(model.slug);
    }
    if (typeof model.enabled !== 'boolean') {
      errors.push(`${itemPath}.enabled must be boolean`);
    }
    return {
      id: model.id,
      slug: model.slug,
      enabled: model.enabled,
    };
  });

  if (errors.length > 0) {
    throw new BenchmarkInputError(`Invalid model config ${configPath}:\n- ${errors.join('\n- ')}`, {
      code: 'INVALID_MODEL_CONFIG',
      path: configPath,
    });
  }
  return models;
}

function parseDotEnv(text) {
  const values = new Map();
  for (const line of text.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/u);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values.set(match[1], value);
  }
  return values;
}

export async function getOpenRouterApiKey(rootDir = REPOSITORY_ROOT) {
  const fromEnvironment = process.env.OPENROUTER_API_KEY;
  if (typeof fromEnvironment === 'string' && fromEnvironment.length > 0) {
    return fromEnvironment;
  }

  const envPath = resolve(rootDir, '.env');
  try {
    const envText = await readFile(envPath, 'utf8');
    const fromFile = parseDotEnv(envText).get('OPENROUTER_API_KEY');
    return typeof fromFile === 'string' && fromFile.length > 0 ? fromFile : null;
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw new BenchmarkInputError(`Cannot read local .env: ${error.message}`, {
      code: 'ENV_READ_ERROR',
      path: envPath,
    });
  }
}

export function selectModels(models, {all = false, model = null} = {}) {
  if (all && model) {
    throw new BenchmarkInputError('Use either --all or --model, not both.', {code: 'CLI_ARGUMENT_ERROR'});
  }
  if (model) {
    const selected = models.find((item) => item.slug === model || item.id === model);
    if (!selected) {
      const available = models.map((item) => item.slug).join(', ') || '(none)';
      throw new BenchmarkInputError(`Unknown model "${model}". Configured slugs: ${available}`, {
        code: 'UNKNOWN_MODEL',
      });
    }
    return [selected];
  }
  return models.filter((item) => item.enabled);
}

export async function loadBenchmarkInputs({rootDir = REPOSITORY_ROOT} = {}) {
  const paths = benchmarkPaths(rootDir);
  const promptBuffer = await readRequired(paths.prompt, 'runtime prompt');
  const goldBuffer = await readRequired(paths.gold, 'Gold JSON');
  const imageBuffers = [];
  for (const imagePath of paths.images) {
    imageBuffers.push(await readRequired(imagePath, 'PNG image'));
  }
  const configBuffer = await readRequired(paths.config, 'model config');

  const prompt = promptBuffer.toString('utf8');
  const gold = parseJson(goldBuffer.toString('utf8'), paths.gold, 'Gold JSON');
  const goldValidation = validateRawResult(JSON.stringify(gold));
  if (!goldValidation.valid) {
    throw new BenchmarkInputError(`Gold JSON is not a valid V1.5 result ${paths.gold}:\n- ${goldValidation.errors.join('\n- ')}`, {
      code: 'INVALID_GOLD',
      path: paths.gold,
    });
  }
  const config = parseJson(configBuffer.toString('utf8'), paths.config, 'model config');
  const models = validateModelConfig(config, paths.config);
  const images = imageBuffers.map((buffer, index) => ({
    name: IMAGE_NAMES[index],
    imageId: IMAGE_NAMES[index].replace(/\.png$/u, ''),
    path: paths.images[index],
    mimeType: 'image/png',
    buffer,
    dataUrl: `data:image/png;base64,${buffer.toString('base64')}`,
    sha256: sha256(buffer),
  }));

  return Object.freeze({
    rootDir: resolve(rootDir),
    paths,
    prompt,
    gold,
    models,
    images,
    hashes: Object.freeze({
      prompt: sha256(promptBuffer),
      gold: sha256(goldBuffer),
      images: Object.freeze(Object.fromEntries(images.map((image) => [image.imageId, image.sha256]))),
    }),
  });
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function formatInputError(error) {
  if (error instanceof BenchmarkInputError) return error.message;
  return error?.stack || error?.message || String(error);
}

export function resolvePath(rootDir, value) {
  return isAbsolute(value) ? value : resolve(rootDir, value);
}

export async function ensureDirectory(directoryPath) {
  await mkdir(directoryPath, {recursive: true});
}

export function publicModelMetadata(model) {
  return {id: model.id, slug: model.slug, enabled: model.enabled};
}

export function imageRequestParts(images) {
  const parts = [{type: 'text', text: USER_MESSAGE}];
  for (const image of images) {
    parts.push({type: 'text', text: `Source image ${image.imageId}:`});
    parts.push({type: 'image_url', image_url: {url: image.dataUrl}});
  }
  return parts;
}
