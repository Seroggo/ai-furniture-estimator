'use strict';

var VISION_ENTITY_TYPES = [
  'BASE_CABINET',
  'WALL_CABINET',
  'TALL_CABINET',
  'SINK',
  'DISHWASHER',
  'HOB',
  'OVEN',
  'HOOD',
  'REFRIGERATOR',
  'ISLAND',
  'COUNTERTOP'
];

var VISION_SOURCE_TYPES = ['VISION_ENTITY', 'IMAGE_TEXT'];
var DIMENSION_UNITS = ['mm', 'cm', 'm'];

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPositiveNumber(value) {
  return isNumber(value) && value > 0;
}

function isNonNegativeNumber(value) {
  return isNumber(value) && value >= 0;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function inEnum(value, allowed) {
  return allowed.indexOf(value) !== -1;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function visionIssue(code, message, path) {
  return {
    code: code,
    status: 'VALIDATION_ERROR',
    message: message,
    path: path || null
  };
}

function resolveSourceRef(imageInput) {
  if (isNonEmptyString(imageInput)) {
    return imageInput;
  }
  if (isPlainObject(imageInput)) {
    if (isNonEmptyString(imageInput.source_ref)) {
      return imageInput.source_ref;
    }
    if (isNonEmptyString(imageInput.image_id)) {
      return imageInput.image_id;
    }
    if (isNonEmptyString(imageInput.id)) {
      return imageInput.id;
    }
  }
  return null;
}

function isValidConfidence(value) {
  return isNonNegativeNumber(value) && value <= 1;
}

function buildEntityTargetPath(entity, index) {
  if (isNonEmptyString(entity.target_path)) {
    return entity.target_path;
  }
  return 'vision.entities[' + index + ']';
}

function buildVisibleTextTargetPath(item, index) {
  if (isNonEmptyString(item.target_path)) {
    return item.target_path;
  }
  return 'vision.visible_text[' + index + ']';
}

function compareEvidence(a, b) {
  if (a.target_path < b.target_path) {
    return -1;
  }
  if (a.target_path > b.target_path) {
    return 1;
  }
  if (a.source_type < b.source_type) {
    return -1;
  }
  if (a.source_type > b.source_type) {
    return 1;
  }
  if (a.source_ref < b.source_ref) {
    return -1;
  }
  if (a.source_ref > b.source_ref) {
    return 1;
  }
  return 0;
}

function normalizeVisionObservation(rawObservation, sourceRef) {
  if (!isPlainObject(rawObservation)) {
    return {
      ok: false,
      evidence: [],
      errors: [visionIssue('VISION_OBSERVATION_INVALID', 'Raw vision observation must be an object.', '$')]
    };
  }

  var resolvedRef = null;
  if (isNonEmptyString(sourceRef)) {
    resolvedRef = sourceRef;
  } else if (isNonEmptyString(rawObservation.source_ref)) {
    resolvedRef = rawObservation.source_ref;
  } else if (isNonEmptyString(rawObservation.image_id)) {
    resolvedRef = rawObservation.image_id;
  }

  if (!isNonEmptyString(resolvedRef)) {
    return {
      ok: false,
      evidence: [],
      errors: [visionIssue('VISION_SOURCE_REF_MISSING', 'A non-empty source_ref is required to attribute vision evidence.', '$.source_ref')]
    };
  }

  var errors = [];
  var evidence = [];

  var entities = Array.isArray(rawObservation.entities) ? rawObservation.entities : [];
  for (var i = 0; i < entities.length; i += 1) {
    var entity = entities[i];
    var entPath = '$.entities[' + i + ']';
    if (!isPlainObject(entity)) {
      errors.push(visionIssue('VISION_ENTITY_INVALID', 'Vision entity must be an object.', entPath));
      continue;
    }
    if (!isNonEmptyString(entity.type) || !inEnum(entity.type, VISION_ENTITY_TYPES)) {
      errors.push(visionIssue('VISION_ENTITY_TYPE_UNKNOWN', 'Vision entity has an unknown entity_type.', entPath + '.type'));
      continue;
    }
    if (!isValidConfidence(entity.confidence)) {
      errors.push(visionIssue('VISION_CONFIDENCE_INVALID', 'Vision entity confidence must be a number between 0 and 1.', entPath + '.confidence'));
      continue;
    }
    evidence.push({
      target_path: buildEntityTargetPath(entity, i),
      value: entity.type,
      source_type: 'VISION_ENTITY',
      confidence: entity.confidence,
      state: 'ACTIVE',
      source_ref: resolvedRef
    });
  }

  var visibleText = Array.isArray(rawObservation.visible_text) ? rawObservation.visible_text : [];
  for (var t = 0; t < visibleText.length; t += 1) {
    var item = visibleText[t];
    var textPath = '$.visible_text[' + t + ']';
    if (!isPlainObject(item)) {
      errors.push(visionIssue('VISION_TEXT_INVALID', 'Visible text item must be an object.', textPath));
      continue;
    }
    if (!isNonEmptyString(item.text)) {
      errors.push(visionIssue('VISION_TEXT_INVALID', 'Visible text item requires a non-empty text string.', textPath + '.text'));
      continue;
    }
    if (!isValidConfidence(item.confidence)) {
      errors.push(visionIssue('VISION_CONFIDENCE_INVALID', 'Visible text confidence must be a number between 0 and 1.', textPath + '.confidence'));
      continue;
    }
    evidence.push({
      target_path: buildVisibleTextTargetPath(item, t),
      value: item.text,
      source_type: 'IMAGE_TEXT',
      confidence: item.confidence,
      state: 'ACTIVE',
      source_ref: resolvedRef
    });
  }

  var visibleDimensions = Array.isArray(rawObservation.visible_dimensions) ? rawObservation.visible_dimensions : [];
  for (var d = 0; d < visibleDimensions.length; d += 1) {
    var dim = visibleDimensions[d];
    var dimPath = '$.visible_dimensions[' + d + ']';
    if (!isPlainObject(dim)) {
      errors.push(visionIssue('VISION_DIMENSION_MALFORMED', 'Visible dimension must be an object.', dimPath));
      continue;
    }
    if (!isNonEmptyString(dim.target_path)) {
      errors.push(visionIssue('VISION_DIMENSION_MALFORMED', 'Visible dimension requires a target_path.', dimPath + '.target_path'));
      continue;
    }
    if (!isPositiveNumber(dim.value)) {
      errors.push(visionIssue('VISION_DIMENSION_MALFORMED', 'Visible dimension requires a positive numeric value.', dimPath + '.value'));
      continue;
    }
    if (!isNonEmptyString(dim.unit) || !inEnum(dim.unit, DIMENSION_UNITS)) {
      errors.push(visionIssue('VISION_DIMENSION_MALFORMED', 'Visible dimension requires a valid unit (mm, cm, m).', dimPath + '.unit'));
      continue;
    }
    if (!isValidConfidence(dim.confidence)) {
      errors.push(visionIssue('VISION_CONFIDENCE_INVALID', 'Visible dimension confidence must be a number between 0 and 1.', dimPath + '.confidence'));
      continue;
    }
    evidence.push({
      target_path: dim.target_path,
      value: { value: dim.value, unit: dim.unit },
      source_type: 'IMAGE_TEXT',
      confidence: dim.confidence,
      state: 'ACTIVE',
      source_ref: resolvedRef
    });
  }

  if (errors.length) {
    return { ok: false, evidence: [], errors: errors };
  }

  evidence.sort(compareEvidence);

  return { ok: true, evidence: evidence, errors: [] };
}

function recognizeImage(imageInput, visionProvider) {
  var sourceRef = resolveSourceRef(imageInput);
  if (!isNonEmptyString(sourceRef)) {
    return {
      ok: false,
      evidence: [],
      errors: [visionIssue('VISION_SOURCE_REF_MISSING', 'A non-empty image source_ref could not be resolved from imageInput.', '$.source_ref')]
    };
  }
  if (!isPlainObject(visionProvider) || typeof visionProvider.analyze !== 'function') {
    return {
      ok: false,
      evidence: [],
      errors: [visionIssue('VISION_PROVIDER_INVALID', 'visionProvider must expose an analyze(imageInput) function.', '$.visionProvider')]
    };
  }
  var raw = visionProvider.analyze(imageInput);
  if (raw && typeof raw.then === 'function') {
    return raw.then(function (obs) {
      return normalizeVisionObservation(obs, sourceRef);
    });
  }
  return normalizeVisionObservation(raw, sourceRef);
}

module.exports = {
  VISION_ENTITY_TYPES: VISION_ENTITY_TYPES,
  VISION_SOURCE_TYPES: VISION_SOURCE_TYPES,
  DIMENSION_UNITS: DIMENSION_UNITS,
  recognizeImage: recognizeImage,
  normalizeVisionObservation: normalizeVisionObservation,
  resolveSourceRef: resolveSourceRef
};