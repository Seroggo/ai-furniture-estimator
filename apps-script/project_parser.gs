/** Stage 7 kitchen project input parser: text + images -> structured Project Input JSON. */

var SUPPORTED_IMAGE_MIMES = Object.freeze({
  'image/png': true,
  'image/jpeg': true,
  'image/webp': true,
});

var FORBIDDEN_FIELD_NAMES = Object.freeze({
  price: true,
  cost: true,
  total: true,
  pricebook: true,
  bom: true,
  unit_price: true,
  current_price: true,
});

var DIMENSION_FIELD_SUFFIXES = ['_mm', '_length_mm', '_width_mm', '_height_mm'];
var DIMENSION_FIELD_NAMES = Object.freeze({
  run_length_mm: true,
  wall_height_mm: true,
});
var PROJECT_INPUT_V2_ROLE_ENTITY_TYPE = Object.freeze({
  generic_storage: 'MODULE',
  drawer: 'MODULE',
  sink: 'MODULE',
  dishwasher_slot: 'APPLIANCE_SLOT',
  oven: 'MODULE',
  hob: 'MODULE',
  narrow_cargo: 'MODULE',
  dish_dryer: 'MODULE',
  hood: 'MODULE',
  pantry: 'MODULE',
  fridge: 'MODULE',
});


function parseProjectInput(input, options) {
  options = options || {};

  var validation = validateParserInput_(input);
  if (!validation.valid) {
    return {
      status: 'ERROR',
      category: 'INPUT_INVALID',
      message: validation.error,
    };
  }

  var requestId = input.request_id || generateRequestId_();
  var payload = {
    text: input.text,
    images: input.images || [],
  };

  var clientResult = callOpenRouter(payload, {
    transport: options.transport,
    timeoutMs: options.timeoutMs,
    maxRetries: options.maxRetries,
    sleeper: options.sleeper,
  });

  if (clientResult.status === 'ERROR') {
    return {
      status: 'ERROR',
      category: clientResult.category,
      message: clientResult.message,
      latencyMs: clientResult.latencyMs,
      httpStatus: clientResult.httpStatus,
      diagnosticCode: clientResult.diagnosticCode,
      upstreamDiagnostic: clientResult.upstreamDiagnostic,
    };
  }

  var structured = decodeOpenRouterTransport_(clientResult.data, PROJECT_INPUT_SCHEMA);
  if (!structured || typeof structured !== 'object' || Array.isArray(structured)) {
    return buildParserOutputError_(clientResult, 'Model output must be a JSON object.');
  }
  if (Object.prototype.hasOwnProperty.call(structured, 'parser_metadata')) {
    return buildParserOutputError_(clientResult, 'Model output included a reserved technical metadata field.');
  }
  structured.parser_metadata = buildParserMetadata_(
    requestId,
    payload,
    clientResult
  );
  var validationResult = validateProjectInput(structured);

  if (!validationResult.valid) {
    return {
      status: 'ERROR',
      category: 'PARSER_OUTPUT_INVALID',
      message: 'Model output failed deterministic validation.',
      errors: validationResult.errors,
      latencyMs: clientResult.latencyMs,
      httpStatus: clientResult.httpStatus,
    };
  }

  return {
    status: 'SUCCESS',
    data: structured,
    modelReturned: clientResult.modelReturned,
    providerRequestId: clientResult.providerRequestId,
    usage: clientResult.usage,
    latencyMs: clientResult.latencyMs,
  };
}


/** Removes only transport nulls that represent properties optional in the canonical schema. */
function decodeOpenRouterTransport_(data, canonicalSchema) {
  if (Array.isArray(data)) {
    var itemSchema = canonicalSchema && canonicalSchema.items;
    return data.map(function (item) {
      return decodeOpenRouterTransport_(item, itemSchema);
    });
  }
  if (!data || typeof data !== 'object' || !canonicalSchema || typeof canonicalSchema !== 'object') {
    return data;
  }

  var decoded = {};
  var required = canonicalSchema.required || [];
  var properties = canonicalSchema.properties || {};
  var keys = Object.keys(data);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (data[key] === null && required.indexOf(key) === -1 && properties[key]) continue;
    decoded[key] = decodeOpenRouterTransport_(data[key], properties[key]);
  }
  return decoded;
}


function validateProjectInput(result) {
  var errors = [];

  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return { valid: false, errors: ['Result must be a JSON object.'] };
  }

  if (result.schema_version !== PROJECT_INPUT_SCHEMA_VERSION) {
    errors.push('schema_version must be "' + PROJECT_INPUT_SCHEMA_VERSION + '".');
  }

  validateAgainstSchema_(result, PROJECT_INPUT_SCHEMA, '', errors);
  checkSemanticInvariants_(result, errors);

  if (errors.length > 0) {
    return { valid: false, errors: errors };
  }
  return { valid: true, errors: [] };
}


function validateParserInput_(input) {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Input must be a non-null object.' };
  }

  if (typeof input.text !== 'string' || input.text.trim().length === 0) {
    return { valid: false, error: 'Input text is required and must be a non-empty string.' };
  }

  if (input.request_id !== undefined && !isNonEmptyString_(input.request_id)) {
    return { valid: false, error: 'request_id must be a non-empty string when supplied.' };
  }

  if (input.images) {
    if (!Array.isArray(input.images)) {
      return { valid: false, error: 'images must be an array.' };
    }
    for (var i = 0; i < input.images.length; i++) {
      var img = input.images[i];
      if (!img || typeof img !== 'object') {
        return { valid: false, error: 'Each image entry must be an object.' };
      }
      if (!img.mime_type || !SUPPORTED_IMAGE_MIMES[img.mime_type]) {
        return {
          valid: false,
          error: 'Unsupported image MIME type: ' + (img.mime_type || '(missing)') + '. Supported: image/png, image/jpeg, image/webp.',
        };
      }
      if (typeof img.data !== 'string' || img.data.length === 0) {
        return { valid: false, error: 'Image data must be a non-empty base64 string.' };
      }
      if (!isValidBase64_(img.data)) {
        return { valid: false, error: 'Image data must be valid base64 without a data URL prefix.' };
      }
      if (typeof img.source_ref !== 'string' || img.source_ref.length === 0) {
        return { valid: false, error: 'Each image must have a non-empty source_ref.' };
      }
    }
  }

  return { valid: true };
}


function validateAgainstSchema_(data, schema, path, errors) {
  if (schema.const && data !== schema.const) {
    errors.push(path + ' must equal ' + JSON.stringify(schema.const));
    return;
  }

  if (schema.enum) {
    if (schema.enum.indexOf(data) === -1) {
      errors.push(path + ' must be one of the allowed enum values.');
    }
    return;
  }

  var schemaType = schema.type;
  if (!schemaType) return;

  if (schemaType === 'object') {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      errors.push(path + ' must be an object.');
      return;
    }

    if (schema.required) {
      for (var r = 0; r < schema.required.length; r++) {
        var reqKey = schema.required[r];
        if (!Object.prototype.hasOwnProperty.call(data, reqKey)) {
          errors.push(path + ' missing required property: ' + reqKey);
        }
      }
    }

    if (schema.properties) {
      var propKeys = Object.keys(schema.properties);
      for (var p = 0; p < propKeys.length; p++) {
        var key = propKeys[p];
        var subPath = path ? path + '.' + key : key;
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          validateAgainstSchema_(data[key], schema.properties[key], subPath, errors);
        }
      }
    }

    if (schema.additionalProperties === false) {
      var allowed = schema.properties ? Object.keys(schema.properties) : [];
      var dataKeys = Object.keys(data);
      for (var d = 0; d < dataKeys.length; d++) {
        if (allowed.indexOf(dataKeys[d]) === -1) {
          errors.push((path || 'result') + ' has an unknown property.');
        }
      }
    }
    return;
  }

  if (schemaType === 'array') {
    if (!Array.isArray(data)) {
      errors.push(path + ' must be an array.');
      return;
    }
    if (schema.items) {
      for (var i = 0; i < data.length; i++) {
        validateAgainstSchema_(data[i], schema.items, path + '[' + i + ']', errors);
      }
    }
    return;
  }

  if (schemaType === 'string') {
    if (typeof data !== 'string') {
      errors.push(path + ' must be a string.');
      return;
    }
    if (schema.format === 'date-time' && data.length > 0) {
      if (!isIso8601Date_(data)) {
        errors.push(path + ' must be a valid ISO 8601 date-time string.');
      }
    }
    return;
  }

  if (schemaType === 'integer') {
    if (typeof data !== 'number' || !Number.isInteger(data)) {
      errors.push(path + ' must be an integer.');
      return;
    }
    if (schema.minimum !== undefined && data < schema.minimum) {
      errors.push(path + ' must be greater than or equal to ' + schema.minimum + '.');
    }
    return;
  }

  if (schemaType === 'number') {
    if (typeof data !== 'number') {
      errors.push(path + ' must be a number.');
      return;
    }
    if (!Number.isFinite(data)) {
      errors.push(path + ' must be a finite number.');
      return;
    }
    if (schema.minimum !== undefined && data < schema.minimum) {
      errors.push(path + ' must be greater than or equal to ' + schema.minimum + '.');
    }
    return;
  }

  if (schemaType === 'boolean') {
    if (typeof data !== 'boolean') {
      errors.push(path + ' must be a boolean.');
    }
    return;
  }
}


function checkSemanticInvariants_(data, errors) {
  var schemaPaths = collectSchemaPaths_(PROJECT_INPUT_SCHEMA);

  walkFacts_(data, '', function (factValue, factState, factPath) {
    if (factState === 'KNOWN' || factState === 'INFERRED' || factState === 'CONFLICT') {
      if (!hasCompleteEvidence_(factValue.evidence)) {
        errors.push(factPath + ' is ' + factState + ' but has incomplete evidence.');
      }
    }

    if (factState === 'CONFLICT') {
      if (!factValue.evidence || !factValue.evidence.evidence_note) {
        errors.push(factPath + ' is CONFLICT but has no evidence.evidence_note describing the conflict.');
      }
    }

    if (factState === 'KNOWN' || factState === 'INFERRED') {
      if (isEmptyFactValue_(factValue.value)) {
        errors.push(factPath + '.value must be substantive when fact_state is ' + factState + '.');
      }
      if (typeof factValue.value === 'number' && factValue.value <= 0) {
        errors.push(factPath + '.value must be positive when fact_state is ' + factState + '.');
      }
    }

    if (factState === 'UNKNOWN' || factState === 'NOT_APPLICABLE') {
      if (!isUnknownSentinel_(factValue.value)) {
        errors.push(factPath + '.value must use an empty/zero/unknown sentinel when fact_state is ' + factState + '.');
      }
      if (factValue.evidence) {
        errors.push(factPath + ' must not attach evidence to ' + factState + '.');
      }
    }

    if (factState === 'CONFLICT' && !isUnknownSentinel_(factValue.value)) {
      errors.push(factPath + '.value must not select one conflicting value.');
    }

    if (factPath.indexOf('.quantity') !== -1 &&
        (factState === 'KNOWN' || factState === 'INFERRED') &&
        (!Number.isInteger(factValue.value) || factValue.value <= 0)) {
      errors.push(factPath + '.value must be a positive integer quantity.');
    }

    if (isDimensionFact_(factPath) &&
        (factState === 'KNOWN' || factState === 'INFERRED') &&
        (!Number.isInteger(factValue.value) || factValue.value <= 0)) {
      errors.push(factPath + '.value must be a positive integer dimension.');
    }
  });

  checkProjectInputV2LayoutEntities_(data, errors);

  if (data.missing_questions && Array.isArray(data.missing_questions)) {
    var questionIds = {};
    for (var q = 0; q < data.missing_questions.length; q++) {
      var question = data.missing_questions[q];
      if (!isNonEmptyString_(question.question_id) || !isNonEmptyString_(question.field_path) ||
          !isNonEmptyString_(question.question) || !isNonEmptyString_(question.reason)) {
        errors.push('missing_questions[' + q + '] must contain non-empty text fields.');
      }
      if (questionIds[question.question_id]) {
        errors.push('missing_questions contains a duplicate question_id.');
      }
      questionIds[question.question_id] = true;
      var normalizedPath = normalizeQuestionPath_(question.field_path);
      if (schemaPaths.indexOf(normalizedPath) === -1) {
        errors.push('missing_questions[' + q + '] references an unknown field_path.');
      }
      if (data.schema_version === 'project-input-v2' && normalizedPath === 'layout.wall_height_mm') {
        errors.push('missing_questions[' + q + '] asks for wall_height_mm, which is not required by preliminary linear layout.');
      }
    }
  }

  checkForbiddenFields_(data, errors);

  if (!data.parser_metadata) {
    errors.push('parser_metadata is required.');
  } else {
    if (!data.parser_metadata.request_id) errors.push('parser_metadata.request_id is required.');
    if (data.parser_metadata.parser_schema_version !== PROJECT_INPUT_SCHEMA_VERSION) errors.push('parser_metadata.parser_schema_version is invalid.');
    if (data.parser_metadata.prompt_version !== PROJECT_INPUT_PROMPT_VERSION) errors.push('parser_metadata.prompt_version is invalid.');
    if (data.parser_metadata.provider !== 'openrouter') errors.push('parser_metadata.provider must be "openrouter".');
    if (!data.parser_metadata.model_requested) errors.push('parser_metadata.model_requested is required.');
    if (!data.parser_metadata.parsed_at) errors.push('parser_metadata.parsed_at is required.');
    if (!data.parser_metadata.input_modalities || !Array.isArray(data.parser_metadata.input_modalities) ||
        data.parser_metadata.input_modalities.length === 0 ||
        data.parser_metadata.input_modalities.indexOf('text') === -1) {
      errors.push('parser_metadata.input_modalities must be a non-empty array.');
    }
  }
}


function checkProjectInputV2LayoutEntities_(data, errors) {
  if (!data || data.schema_version !== 'project-input-v2') return;
  var modules = data.modules && Array.isArray(data.modules.required_modules)
    ? data.modules.required_modules : [];
  modules.forEach(function (module, index) {
    var role = module && module.role_code;
    var entityType = module && module.entity_type;
    if (!role || role.fact_state !== 'KNOWN' || !entityType || entityType.fact_state !== 'KNOWN') return;
    var expected = PROJECT_INPUT_V2_ROLE_ENTITY_TYPE[role.value];
    if (expected && entityType.value !== expected) {
      errors.push('modules.required_modules[' + index + '].entity_type must be ' + expected +
        ' for canonical role_code ' + role.value + '.');
    }
  });
}


function walkFacts_(data, path, callback) {
  if (!data || typeof data !== 'object') return;

  if (Object.prototype.hasOwnProperty.call(data, 'fact_state')) {
    callback(data, data.fact_state, path);
    return;
  }

  var keys = Object.keys(data);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var subPath = path ? path + '.' + key : key;
    var value = data[key];
    if (Array.isArray(value)) {
      for (var j = 0; j < value.length; j++) {
        walkFacts_(value[j], subPath + '[' + j + ']', callback);
      }
    } else if (value && typeof value === 'object') {
      walkFacts_(value, subPath, callback);
    }
  }
}


function isDimensionFact_(path) {
  var parts = path.split('.');
  var fieldName = parts[parts.length - 1];
  if (DIMENSION_FIELD_NAMES[fieldName]) return true;
  for (var s = 0; s < DIMENSION_FIELD_SUFFIXES.length; s++) {
    if (fieldName.slice(-DIMENSION_FIELD_SUFFIXES[s].length) === DIMENSION_FIELD_SUFFIXES[s]) return true;
  }
  return false;
}


function checkForbiddenFields_(data, errors, path) {
  if (!data || typeof data !== 'object') return;
  if (Array.isArray(data)) {
    for (var i = 0; i < data.length; i++) {
      checkForbiddenFields_(data[i], errors, path + '[' + i + ']');
    }
    return;
  }
  var keys = Object.keys(data);
  for (var k = 0; k < keys.length; k++) {
    var key = keys[k];
    var subPath = path ? path + '.' + key : key;
    if (FORBIDDEN_FIELD_NAMES[key]) {
      errors.push('Forbidden field found: ' + subPath + ' (parser must not produce price/cost data).');
    }
    if (data[key] && typeof data[key] === 'object') {
      checkForbiddenFields_(data[key], errors, subPath);
    }
  }
}


function collectSchemaPaths_(schema, prefix) {
  var paths = [];
  if (!schema || schema.type !== 'object' || !schema.properties) return paths;

  var propKeys = Object.keys(schema.properties);
  for (var i = 0; i < propKeys.length; i++) {
    var key = propKeys[i];
    var fullPath = prefix ? prefix + '.' + key : key;
    var propSchema = schema.properties[key];
    paths.push(fullPath);

    if (propSchema.type === 'object' && propSchema.properties) {
      var nested = collectSchemaPaths_(propSchema, fullPath);
      for (var n = 0; n < nested.length; n++) {
        paths.push(nested[n]);
      }
    } else if (propSchema.type === 'array' && propSchema.items) {
      if (propSchema.items.type === 'object' && propSchema.items.properties) {
        var itemPaths = collectSchemaPaths_(propSchema.items, fullPath + '[]');
        for (var m = 0; m < itemPaths.length; m++) {
          paths.push(itemPaths[m]);
        }
      }
    }
  }
  return paths;
}


function isIso8601Date_(str) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(str) &&
    !isNaN(Date.parse(str));
}


function generateRequestId_() {
  return 'REQ_' + Utilities.getUuid().replace(/-/g, '').toUpperCase();
}


function buildParserOutputError_(clientResult, message) {
  return {
    status: 'ERROR',
    category: 'PARSER_OUTPUT_INVALID',
    message: message,
    latencyMs: clientResult.latencyMs,
    httpStatus: clientResult.httpStatus,
  };
}


function buildParserMetadata_(requestId, payload, clientResult) {
  var metadata = {
    request_id: requestId,
    parser_schema_version: PROJECT_INPUT_SCHEMA_VERSION,
    prompt_version: PROJECT_INPUT_PROMPT_VERSION,
    provider: 'openrouter',
    model_requested: clientResult.modelRequested,
    parsed_at: new Date().toISOString(),
    input_modalities: payload.images.length > 0 ? ['text', 'image'] : ['text'],
  };
  if (clientResult.modelReturned) metadata.model_returned = clientResult.modelReturned;
  if (clientResult.providerRequestId) metadata.provider_request_id = clientResult.providerRequestId;
  var usage = normalizeUsage_(clientResult.usage);
  if (usage) metadata.usage = usage;
  return metadata;
}


function normalizeUsage_(usage) {
  if (!usage || typeof usage !== 'object') return null;
  var normalized = {};
  var fields = ['prompt_tokens', 'completion_tokens', 'total_tokens'];
  for (var i = 0; i < fields.length; i++) {
    var value = usage[fields[i]];
    if (Number.isInteger(value) && value >= 0) normalized[fields[i]] = value;
  }
  return Object.keys(normalized).length > 0 ? normalized : null;
}


function hasCompleteEvidence_(evidence) {
  return evidence && evidence.source_type &&
    typeof evidence.source_ref === 'string' && evidence.source_ref.trim().length > 0 &&
    typeof evidence.evidence_note === 'string' && evidence.evidence_note.trim().length > 0;
}


function isEmptyFactValue_(value) {
  return value === 0 || (typeof value === 'string' && (value.trim() === '' || value === 'unknown'));
}


function isUnknownSentinel_(value) {
  return value === 0 || (typeof value === 'string' && (value.trim() === '' || value === 'unknown'));
}


function normalizeQuestionPath_(path) {
  return String(path || '').replace(/\[\d+\]/g, '[]');
}


function isValidBase64_(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length % 4 !== 0) return false;
  return /^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/.test(value);
}


function isNonEmptyString_(value) {
  return typeof value === 'string' && value.trim().length > 0;
}


/** Requests the OAuth scope required by the Stage 7 OpenRouter checkpoint. */
function authorizeStage7ExternalRequest() {
  ScriptApp.requireScopes(ScriptApp.AuthMode.FULL, [
    'https://www.googleapis.com/auth/script.external_request'
  ]);
}


/** Synthetic, non-sensitive checkpoint for manual execution in the bound DEV editor. */
function runStage7LiveSmoke() {
  var configReady = Boolean(getOpenRouterApiKey_() && getOpenRouterModel_());
  if (!configReady) {
    return {
      status: 'READY_FOR_OPENROUTER_CHECKPOINT',
      config_ready: false,
    };
  }

  var textResult = parseProjectInput({
    request_id: 'STAGE7_LIVE_TEXT',
    text: 'Тестовый проект: прямая кухня длиной 3000 мм. Нужны посудомоечная машина 600 мм и духовой шкаф 600 мм. Материал и цвет фасадов не указаны.',
  });
  var imageResult = parseProjectInput({
    request_id: 'STAGE7_LIVE_IMAGE',
    text: 'Синтетический тест: проверь приложенное изображение. Не придумывай невидимые размеры или материалы.',
    images: [{
      mime_type: 'image/png',
      data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      source_ref: 'synthetic-1px-checkpoint',
    }],
  });

  var summary = {
    status: textResult.status === 'SUCCESS' && imageResult.status === 'SUCCESS' ? 'PASS' : 'FAIL',
    config_ready: true,
    text: summarizeLiveSmokeResult_(textResult, false),
    image: summarizeLiveSmokeResult_(imageResult, true),
  };
  console.log(JSON.stringify(summary));
  return summary;
}


function summarizeLiveSmokeResult_(result, requireImageEvidence) {
  var success = result && result.status === 'SUCCESS';
  var evidenceValid = success && (!requireImageEvidence || containsImageEvidence_(result.data));
  return {
    status: success && evidenceValid ? 'PASS' : 'FAIL',
    category: success ? '' : result.category,
    http_status: success ? result.httpStatus || 200 : result.httpStatus || 0,
    diagnostic_code: success ? '' : result.diagnosticCode || '',
    upstream_diagnostic: success ? {} : result.upstreamDiagnostic || {},
    schema_valid: success,
    metadata_valid: success && Boolean(result.data.parser_metadata),
    evidence_valid: evidenceValid,
    provider_request_id_present: success && Boolean(result.data.parser_metadata.provider_request_id),
    model_returned: success ? result.data.parser_metadata.model_returned || '' : '',
  };
}


function containsImageEvidence_(data) {
  var found = false;
  walkFacts_(data, '', function (factValue) {
    if (factValue.evidence &&
        (factValue.evidence.source_type === 'IMAGE' || factValue.evidence.source_type === 'MULTI_SOURCE')) {
      found = true;
    }
  });
  if (found) return true;
  if (!Array.isArray(data.evidence)) return false;
  for (var i = 0; i < data.evidence.length; i++) {
    if (data.evidence[i].source_type === 'IMAGE' || data.evidence[i].source_type === 'MULTI_SOURCE') return true;
  }
  return false;
}
