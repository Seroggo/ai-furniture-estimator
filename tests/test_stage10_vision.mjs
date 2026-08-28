import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';

import vision from '../Stage_10_input_understanding/vision.js';
import stage10 from '../Stage_10_input_understanding/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const taskRoot = resolve(root, '_tasks/stage-10-input-understanding');
const fixturesRoot = resolve(root, 'Stage_10_input_understanding/fixtures/vision');

const evidenceSchema = JSON.parse(readFileSync(resolve(taskRoot, 'INPUT_EVIDENCE_V1.schema.json'), 'utf8'));
const kitchenEntities = JSON.parse(readFileSync(resolve(fixturesRoot, 'Kitchen_entities.json'), 'utf8'));
const kitchenWithDimensions = JSON.parse(readFileSync(resolve(fixturesRoot, 'Kitchen_with_visible_dimensions.json'), 'utf8'));

const { recognizeImage, normalizeVisionObservation } = vision;

function makeProvider(observation) {
  return {
    analyze() {
      return observation;
    }
  };
}

test('1. Vision entity -> VISION_ENTITY Evidence', () => {
  const result = normalizeVisionObservation(kitchenEntities, 'IMG_KITCHEN_ENTITIES_01');
  assert.equal(result.ok, true);
  const base = result.evidence.find(e => e.value === 'BASE_CABINET');
  assert.ok(base, 'BASE_CABINET entity evidence present');
  assert.equal(base.source_type, 'VISION_ENTITY');
  assert.equal(base.source_ref, 'IMG_KITCHEN_ENTITIES_01');
  assert.equal(base.state, 'ACTIVE');
  assert.equal(base.confidence, 0.91);
});

test('2. Visible text -> IMAGE_TEXT Evidence', () => {
  const result = normalizeVisionObservation(kitchenEntities, 'IMG_KITCHEN_ENTITIES_01');
  assert.equal(result.ok, true);
  const text = result.evidence.find(e => e.source_type === 'IMAGE_TEXT' && typeof e.value === 'string');
  assert.ok(text, 'IMAGE_TEXT evidence present');
  assert.equal(text.value, '60 cm wide');
  assert.equal(text.source_ref, 'IMG_KITCHEN_ENTITIES_01');
});

test('3. Visible dimension 600 mm -> IMAGE_TEXT + unit=mm + value=600', () => {
  const result = normalizeVisionObservation(kitchenWithDimensions, 'IMG_KITCHEN_DIMENSIONS_01');
  assert.equal(result.ok, true);
  const dim = result.evidence.find(e =>
    e.target_path === 'assemblies[0].modules[0].dimensions.width_mm'
  );
  assert.ok(dim, 'dimension evidence present');
  assert.equal(dim.source_type, 'IMAGE_TEXT');
  assert.equal(dim.value.value, 600);
  assert.equal(dim.value.unit, 'mm');
});

test('4. Entity without dimension does not create numeric width_mm', () => {
  const observation = {
    source_ref: 'IMG_NO_DIM',
    entities: [
      { type: 'DISHWASHER', confidence: 0.8 }
    ]
  };
  const result = normalizeVisionObservation(observation, 'IMG_NO_DIM');
  assert.equal(result.ok, true);
  assert.equal(result.evidence.length, 1);
  assert.equal(result.evidence[0].source_type, 'VISION_ENTITY');
  assert.ok(
    !result.evidence.some(e => e.target_path && e.target_path.indexOf('width_mm') !== -1),
    'no inferred width_mm evidence'
  );
});

test('5. Confidence is preserved without change', () => {
  const result = normalizeVisionObservation(kitchenWithDimensions, 'IMG_KITCHEN_DIMENSIONS_01');
  assert.equal(result.ok, true);
  const dishwasher = result.evidence.find(e => e.value === 'DISHWASHER');
  assert.equal(dishwasher.confidence, 0.85);
  const width = result.evidence.find(e =>
    e.target_path === 'assemblies[0].modules[0].dimensions.width_mm'
  );
  assert.equal(width.confidence, 0.95);
});

test('6. Source_ref is preserved', () => {
  const result = normalizeVisionObservation(kitchenWithDimensions, 'IMG_EXPLICIT_REF');
  assert.equal(result.ok, true);
  for (const e of result.evidence) {
    assert.equal(e.source_ref, 'IMG_EXPLICIT_REF');
  }
});

test('7. Unknown entity_type -> deterministic error', () => {
  const observation = {
    source_ref: 'IMG_BAD_TYPE',
    entities: [
      { type: 'ALIEN_FRIDGE', confidence: 0.9 }
    ]
  };
  const result = normalizeVisionObservation(observation, 'IMG_BAD_TYPE');
  assert.equal(result.ok, false);
  assert.equal(result.evidence.length, 0);
  assert.ok(result.errors.some(e => e.code === 'VISION_ENTITY_TYPE_UNKNOWN'));
});

test('8. Invalid confidence -> deterministic error', () => {
  const observation = {
    source_ref: 'IMG_BAD_CONF',
    entities: [
      { type: 'SINK', confidence: 1.5 }
    ]
  };
  const result = normalizeVisionObservation(observation, 'IMG_BAD_CONF');
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.code === 'VISION_CONFIDENCE_INVALID'));
});

test('Missing source_ref -> deterministic error', () => {
  const observation = {
    entities: [
      { type: 'SINK', confidence: 0.9 }
    ]
  };
  const result = normalizeVisionObservation(observation, '');
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.code === 'VISION_SOURCE_REF_MISSING'));
});

test('Malformed visible_dimension -> deterministic error', () => {
  const observation = {
    source_ref: 'IMG_BAD_DIM',
    visible_dimensions: [
      { target_path: 'x.width_mm', value: -10, unit: 'mm', confidence: 0.9 }
    ]
  };
  const result = normalizeVisionObservation(observation, 'IMG_BAD_DIM');
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.code === 'VISION_DIMENSION_MALFORMED'));
});

test('9. One raw observation twice -> byte-equivalent Evidence[]', () => {
  const r1 = normalizeVisionObservation(kitchenWithDimensions, 'IMG_KITCHEN_DIMENSIONS_01');
  const r2 = normalizeVisionObservation(kitchenWithDimensions, 'IMG_KITCHEN_DIMENSIONS_01');
  assert.strictEqual(JSON.stringify(r1), JSON.stringify(r2), 'byte-equivalent JSON');
});

test('10. Generated Evidence is valid against INPUT_EVIDENCE_V1.schema.json', () => {
  const result = normalizeVisionObservation(kitchenWithDimensions, 'IMG_KITCHEN_DIMENSIONS_01');
  assert.equal(result.ok, true);

  const ajv = new Ajv2020({ strict: false, validateFormats: false });
  const validate = ajv.compile(evidenceSchema);
  const valid = validate(result.evidence);
  if (!valid) {
    console.error('Schema errors:', JSON.stringify(validate.errors, null, 2));
  }
  assert.ok(valid, 'Vision evidence must validate against INPUT_EVIDENCE_V1.schema.json');
});

test('10b. Generated Evidence for entities fixture is valid against schema', () => {
  const result = normalizeVisionObservation(kitchenEntities, 'IMG_KITCHEN_ENTITIES_01');
  assert.equal(result.ok, true);
  const ajv = new Ajv2020({ strict: false, validateFormats: false });
  const validate = ajv.compile(evidenceSchema);
  assert.ok(validate(result.evidence), 'Entities evidence must validate against schema');
});

test('11. Injected stub visionProvider is invoked via recognizeImage()', () => {
  let calledWith = null;
  const provider = {
    analyze(imageInput) {
      calledWith = imageInput;
      return kitchenEntities;
    }
  };
  const result = recognizeImage({ image_id: 'IMG_INJECTED' }, provider);
  assert.equal(calledWith.image_id, 'IMG_INJECTED', 'provider.analyze invoked with imageInput');
  assert.equal(result.ok, true);
  assert.ok(result.evidence.length > 0);
  for (const e of result.evidence) {
    assert.equal(e.source_ref, 'IMG_INJECTED');
  }
});

test('11b. recognizeImage rejects provider without analyze()', () => {
  const result = recognizeImage({ image_id: 'IMG_X' }, {});
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.code === 'VISION_PROVIDER_INVALID'));
});

test('11c. recognizeImage rejects imageInput without resolvable source_ref', () => {
  const result = recognizeImage({}, makeProvider(kitchenEntities));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.code === 'VISION_SOURCE_REF_MISSING'));
});

test('11d. recognizeImage supports async provider via promise result', async () => {
  const provider = {
    analyze() {
      return Promise.resolve(kitchenEntities);
    }
  };
  const result = await recognizeImage({ image_id: 'IMG_ASYNC' }, provider);
  assert.equal(result.ok, true);
  assert.ok(result.evidence.some(e => e.value === 'BASE_CABINET'));
});

test('Evidence is deterministically sorted by target_path, source_type, source_ref', () => {
  const result = normalizeVisionObservation(kitchenWithDimensions, 'IMG_KITCHEN_DIMENSIONS_01');
  assert.equal(result.ok, true);
  const sorted = result.evidence.slice().sort((a, b) => {
    if (a.target_path < b.target_path) return -1;
    if (a.target_path > b.target_path) return 1;
    if (a.source_type < b.source_type) return -1;
    if (a.source_type > b.source_type) return 1;
    if (a.source_ref < b.source_ref) return -1;
    if (a.source_ref > b.source_ref) return 1;
    return 0;
  });
  assert.deepStrictEqual(result.evidence, sorted);
});

test('Vision evidence validates through Stage 10.1 validateEvidence', () => {
  const result = normalizeVisionObservation(kitchenWithDimensions, 'IMG_KITCHEN_DIMENSIONS_01');
  assert.equal(result.ok, true);
  const errors = stage10.validateEvidence(result.evidence);
  assert.deepEqual(errors, [], 'Stage 10.1 validateEvidence must accept vision evidence');
});