/** Stage 7 OpenRouter HTTP client with bounded retry and privacy-safe diagnostics. */

var OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
var OPENROUTER_MAX_RETRIES = 2;
var OPENROUTER_TIMEOUT_MS = 60000;
var OPENROUTER_RETRY_DELAY_MS = 1000;
var OPENROUTER_MAX_TIMEOUT_SECONDS = 60;

var OPENROUTER_ERROR_CATEGORIES = Object.freeze({
  CONFIG_ERROR: 'CONFIG_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  UPSTREAM_ERROR: 'UPSTREAM_ERROR',
  TIMEOUT: 'TIMEOUT',
  INPUT_INVALID: 'INPUT_INVALID',
});


function callOpenRouter(payload, options) {
  options = options || {};
  var transport = options.transport || UrlFetchApp.fetch.bind(UrlFetchApp);
  var sleeper = options.sleeper || Utilities.sleep;
  var timeoutMs = normalizeTimeoutMs_(options.timeoutMs);
  var maxRetries = normalizeMaxRetries_(options.maxRetries);

  var apiKey = getOpenRouterApiKey_();
  if (!apiKey) {
    return buildErrorResult_('CONFIG_ERROR', 'OPENROUTER_API_KEY is not configured in Script Properties.');
  }

  var model = getOpenRouterModel_();
  if (!model) {
    return buildErrorResult_('CONFIG_ERROR', 'OPENROUTER_MODEL is not configured in Script Properties.');
  }

  var requestPayload = buildRequestPayload_(payload, model);
  var lastError = null;

  for (var attempt = 0; attempt <= maxRetries; attempt++) {
    var result = executeRequest_(transport, requestPayload, apiKey, timeoutMs);
    if (result.status === 'SUCCESS') {
      result.modelRequested = model;
      return result;
    }
    lastError = result;
    if (!result.retryable) {
      return result;
    }
    if (attempt < maxRetries) {
      sleeper(OPENROUTER_RETRY_DELAY_MS * (attempt + 1));
    }
  }

  return lastError;
}


function getOpenRouterApiKey_() {
  try {
    return normalizeRuntimeProperty_(PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY'));
  } catch (e) {
    return null;
  }
}


function getOpenRouterModel_() {
  try {
    return normalizeRuntimeProperty_(PropertiesService.getScriptProperties().getProperty('OPENROUTER_MODEL'));
  } catch (e) {
    return null;
  }
}


function buildRequestPayload_(payload, model) {
  var messages = buildMessages_(payload);
  return {
    model: model,
    messages: messages,
    provider: {
      require_parameters: true,
    },
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'project_input',
        strict: true,
        schema: buildModelOutputSchema_(),
      },
    },
    stream: false,
  };
}


function buildModelOutputSchema_() {
  return JSON.parse(JSON.stringify(PROJECT_INPUT_OPENROUTER_SCHEMA));
}


function buildMessages_(payload) {
  var systemPrompt = PROJECT_INPUT_PROMPT;
  var userContent = [];
  var userText = payload.text || '';

  if (payload.images && payload.images.length > 0) {
    var imageRefs = [];
    for (var r = 0; r < payload.images.length; r++) {
      imageRefs.push('image[' + r + ']=' + payload.images[r].source_ref);
    }
    userText += '\n\nAttached image source references: ' + imageRefs.join(', ');
  }

  userContent.push({ type: 'text', text: userText });

  if (payload.images && payload.images.length > 0) {
    for (var i = 0; i < payload.images.length; i++) {
      var img = payload.images[i];
      userContent.push({
        type: 'image_url',
        image_url: {
          url: 'data:' + img.mime_type + ';base64,' + img.data,
        },
      });
    }
  }

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];
}


function executeRequest_(transport, requestPayload, apiKey, timeoutMs) {
  var requestStart = new Date();

  var options = {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'HTTP-Referer': 'https://github.com/ai-furniture-estimator',
      'X-Title': 'AI Furniture Estimator',
    },
    contentType: 'application/json',
    payload: JSON.stringify(requestPayload),
    muteHttpExceptions: true,
    timeoutSeconds: Math.min(OPENROUTER_MAX_TIMEOUT_SECONDS, Math.ceil(timeoutMs / 1000)),
  };

  try {
    var response = transport('https://openrouter.ai/api/v1/chat/completions', options);
    var latencyMs = new Date().getTime() - requestStart.getTime();
    return processResponse_(response, latencyMs);
  } catch (e) {
    var elapsed = new Date().getTime() - requestStart.getTime();
    var errorMessage = String(e && e.message ? e.message : e);
    var transportDiagnostic = classifyTransportError_(errorMessage);
    if (transportDiagnostic !== 'INVALID_TIMEOUT_OPTION' &&
        (/timed?\s*out|timeout/i.test(errorMessage) || elapsed >= timeoutMs)) {
      return buildErrorResult_('TIMEOUT', 'OpenRouter request timed out.', elapsed, undefined, true);
    }
    return buildErrorResult_(
      'UPSTREAM_ERROR',
      'OpenRouter request failed before an HTTP response.',
      elapsed,
      undefined,
      transportDiagnostic === 'NETWORK_FAILURE',
      transportDiagnostic
    );
  }
}


function processResponse_(response, latencyMs) {
  var httpStatus = response.getResponseCode();
  var body = response.getContentText();

  if (httpStatus === 401 || httpStatus === 403) {
    return buildErrorResult_('AUTH_ERROR', 'Authentication failed (HTTP ' + httpStatus + ').', latencyMs, httpStatus);
  }
  if (httpStatus === 429) {
    return buildErrorResult_('RATE_LIMIT', 'Rate limit exceeded (HTTP 429).', latencyMs, httpStatus, true);
  }
  if (httpStatus === 408) {
    return buildErrorResult_('TIMEOUT', 'OpenRouter request timed out (HTTP 408).', latencyMs, httpStatus, true);
  }
  if (httpStatus >= 500) {
    return buildErrorResult_('UPSTREAM_ERROR', 'Upstream server error (HTTP ' + httpStatus + ').', latencyMs, httpStatus, true);
  }
  if (httpStatus !== 200) {
    var safeDiagnostic = extractOpenRouterErrorDiagnostic_(body);
    return buildErrorResult_(
      'UPSTREAM_ERROR',
      'Unexpected HTTP status ' + httpStatus + '.',
      latencyMs,
      httpStatus,
      false,
      classifyOpenRouterError_(body, httpStatus),
      safeDiagnostic
    );
  }

  var parsed = tryParseJson_(body);
  if (!parsed) {
    return buildErrorResult_('PARSER_OUTPUT_INVALID', 'OpenRouter returned unparseable JSON.', latencyMs, httpStatus);
  }

  var choices = parsed.choices;
  if (!Array.isArray(choices) || choices.length === 0 || !choices[0] || typeof choices[0] !== 'object') {
    return buildErrorResult_('PARSER_OUTPUT_INVALID', 'OpenRouter response contains no choices.', latencyMs, httpStatus);
  }

  var firstChoice = choices[0];
  if (firstChoice.finish_reason === 'error' || firstChoice.error) {
    return buildChoiceErrorResult_(firstChoice, latencyMs, httpStatus);
  }

  var messageContent = firstChoice.message && firstChoice.message.content;
  if (!messageContent) {
    return buildErrorResult_('PARSER_OUTPUT_INVALID', 'OpenRouter response choice has no content.', latencyMs, httpStatus);
  }

  var structured = tryParseJson_(messageContent);
  if (!structured) {
    return buildErrorResult_('PARSER_OUTPUT_INVALID', 'Model output is not valid JSON.', latencyMs, httpStatus);
  }

  var modelReturned = parsed.model || '';
  var providerRequestId = parsed.id || '';
  var usage = parsed.usage || null;

  return {
    status: 'SUCCESS',
    data: structured,
    modelReturned: modelReturned,
    providerRequestId: providerRequestId,
    usage: usage,
    latencyMs: latencyMs,
    httpStatus: httpStatus,
  };
}


function buildChoiceErrorResult_(choice, latencyMs, httpStatus) {
  var code = choice.error && Number(choice.error.code);
  if (code === 429) {
    return buildErrorResult_('RATE_LIMIT', 'Provider rate limit interrupted the response.', latencyMs, httpStatus, true);
  }
  if (code === 408) {
    return buildErrorResult_('TIMEOUT', 'Provider timeout interrupted the response.', latencyMs, httpStatus, true);
  }
  return buildErrorResult_(
    'UPSTREAM_ERROR',
    'Provider error interrupted the response.',
    latencyMs,
    httpStatus,
    code >= 500
  );
}


function buildErrorResult_(category, message, latencyMs, httpStatus, retryable, diagnosticCode, upstreamDiagnostic) {
  var result = {
    status: 'ERROR',
    category: category,
    message: message,
  };
  if (latencyMs !== undefined) result.latencyMs = latencyMs;
  if (httpStatus !== undefined) result.httpStatus = httpStatus;
  result.retryable = retryable === true;
  if (diagnosticCode) result.diagnosticCode = diagnosticCode;
  if (upstreamDiagnostic && Object.keys(upstreamDiagnostic).length > 0) {
    result.upstreamDiagnostic = upstreamDiagnostic;
  }
  return result;
}


function classifyOpenRouterError_(body, httpStatus) {
  var parsed = tryParseJson_(body);
  var message = parsed && parsed.error && typeof parsed.error.message === 'string'
    ? parsed.error.message.toLowerCase()
    : '';
  if (/schema|response[_ -]?format|structured output/.test(message)) return 'SCHEMA_REJECTED';
  if (/image|vision|multimodal|mime/.test(message)) return 'IMAGE_REJECTED';
  if (/model|provider|endpoint|route/.test(message)) return 'MODEL_OR_PROVIDER_UNAVAILABLE';
  if (/credit|payment|balance|quota/.test(message) || httpStatus === 402) return 'CREDITS_OR_QUOTA';
  return 'REQUEST_REJECTED';
}


/** Extracts only explicitly allowlisted, sanitized fields from an OpenRouter error envelope. */
function extractOpenRouterErrorDiagnostic_(body) {
  var parsed = tryParseJson_(body);
  if (!parsed || !parsed.error || typeof parsed.error !== 'object') return {};

  var error = parsed.error;
  var metadata = error.metadata && typeof error.metadata === 'object' ? error.metadata : {};
  var diagnostic = {};
  var errorCode = sanitizeDiagnosticIdentifier_(error.code, 64);
  var errorMessage = sanitizeOpenRouterErrorMessage_(error.message);
  var providerName = sanitizeDiagnosticIdentifier_(metadata.provider_name || metadata.providerName, 80);
  var requestId = sanitizeDiagnosticIdentifier_(
    metadata.request_id || metadata.requestId || parsed.request_id || parsed.id,
    128
  );
  var providerRequestId = sanitizeDiagnosticIdentifier_(
    metadata.provider_request_id || metadata.providerRequestId,
    128
  );

  if (errorCode) diagnostic.error_code = errorCode;
  if (errorMessage) diagnostic.error_message = errorMessage;
  if (providerName) diagnostic.provider_name = providerName;
  if (requestId) diagnostic.request_id = requestId;
  if (providerRequestId) diagnostic.provider_request_id = providerRequestId;
  return diagnostic;
}


function sanitizeOpenRouterErrorMessage_(value) {
  if (typeof value !== 'string') return '';
  var sanitized = value
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/sk-or-v1-[A-Za-z0-9_-]+/gi, '[REDACTED]')
    .replace(/data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=_-]+/gi, '[IMAGE REDACTED]')
    .replace(/[A-Za-z0-9+/=_-]{48,}/g, '[REDACTED]')
    .replace(/(["']).{1,160}\1/g, '$1[REDACTED]$1')
    .replace(/\b(near|request content|input text|prompt)\b.*$/i, '$1 [REDACTED]')
    .replace(/\s+/g, ' ')
    .trim();
  if (sanitized.length > 240) sanitized = sanitized.slice(0, 237) + '...';
  return sanitized;
}


function sanitizeDiagnosticIdentifier_(value, maxLength) {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  var normalized = String(value).trim();
  if (!normalized || normalized.length > maxLength) return '';
  return /^[A-Za-z0-9._:\/-]+$/.test(normalized) ? normalized : '';
}


function classifyTransportError_(message) {
  var normalized = String(message || '').toLowerCase();
  if (/timeoutseconds|invalid argument.*timeout/.test(normalized)) return 'INVALID_TIMEOUT_OPTION';
  if (/permission|authorization|not authorized|scope/.test(normalized)) return 'PERMISSION_DENIED';
  if (/certificate|ssl|tls/.test(normalized)) return 'TLS_FAILURE';
  if (/network|connection|dns|host|socket|temporar/.test(normalized)) return 'NETWORK_FAILURE';
  return 'TRANSPORT_FAILURE';
}


function tryParseJson_(text) {
  if (!text || typeof text !== 'string') return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}


function normalizeRuntimeProperty_(value) {
  if (typeof value !== 'string') return null;
  var normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}


function normalizeMaxRetries_(value) {
  if (value === undefined) return OPENROUTER_MAX_RETRIES;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return 0;
  return Math.min(value, OPENROUTER_MAX_RETRIES);
}


function normalizeTimeoutMs_(value) {
  if (value === undefined) return OPENROUTER_TIMEOUT_MS;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return OPENROUTER_TIMEOUT_MS;
  return Math.min(value, OPENROUTER_TIMEOUT_MS);
}
