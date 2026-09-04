const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export class OpenRouterApiError extends Error {
  constructor(message, {status = null, body = null, response = null} = {}) {
    super(message);
    this.name = 'OpenRouterApiError';
    this.status = status;
    this.body = body;
    this.response = response;
  }
}

function safeBodyPreview(body) {
  if (typeof body !== 'string') return null;
  const normalized = body.replace(/Bearer\s+[^\s"']+/giu, 'Bearer [REDACTED]');
  return normalized.length > 1000 ? `${normalized.slice(0, 1000)}…` : normalized;
}

function contentToText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return null;
  return content.map((part) => {
    if (typeof part === 'string') return part;
    if (part && typeof part.text === 'string') return part.text;
    return '';
  }).join('');
}

export function extractCompletion(responseBody) {
  const content = responseBody?.choices?.[0]?.message?.content;
  const text = contentToText(content);
  if (text === null) throw new OpenRouterApiError('OpenRouter response did not contain choices[0].message.content', {response: responseBody});
  return {
    text,
    responseMetadata: {
      id: responseBody?.id ?? null,
      object: responseBody?.object ?? null,
      created: responseBody?.created ?? null,
      model: responseBody?.model ?? null,
      provider: responseBody?.provider ?? null,
      system_fingerprint: responseBody?.system_fingerprint ?? null,
    },
    usage: responseBody?.usage ? {
      input_tokens: responseBody.usage.prompt_tokens ?? responseBody.usage.input_tokens ?? null,
      output_tokens: responseBody.usage.completion_tokens ?? responseBody.usage.output_tokens ?? null,
      total_tokens: responseBody.usage.total_tokens ?? null,
    } : null,
  };
}

export async function callOpenRouter({apiKey, modelId, systemPrompt, content, generationParameters, fetchImpl = fetch}) {
  if (typeof apiKey !== 'string' || apiKey.length === 0) throw new OpenRouterApiError('OPENROUTER_API_KEY is missing');
  const payload = {
    model: modelId,
    messages: [
      {role: 'system', content: systemPrompt},
      {role: 'user', content},
    ],
    temperature: generationParameters.temperature,
    max_tokens: generationParameters.max_tokens,
  };
  let response;
  try {
    response = await fetchImpl(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new OpenRouterApiError(`OpenRouter network request failed: ${error.message}`, {response: null});
  }
  const bodyText = await response.text();
  let body = null;
  try {
    body = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    body = null;
  }
  if (!response.ok) {
    const providerMessage = body?.error?.message || body?.error?.code || `HTTP ${response.status}`;
    throw new OpenRouterApiError(`OpenRouter API request failed (${response.status}): ${providerMessage}; body=${safeBodyPreview(bodyText)}`, {
      status: response.status,
      body,
      response,
    });
  }
  if (!body) throw new OpenRouterApiError('OpenRouter returned a non-JSON success response', {status: response.status, body: bodyText, response});
  return {
    status: response.status,
    body,
    ...extractCompletion(body),
  };
}

export function openRouterEndpoint() {
  return ENDPOINT;
}
