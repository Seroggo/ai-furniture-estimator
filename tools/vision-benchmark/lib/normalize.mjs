import {validateRawResult} from '../validate.mjs';

export function normalizeResponse(rawText) {
  const parsed = validateRawResult(typeof rawText === 'string' ? rawText : '');
  return {
    rawText: typeof rawText === 'string' ? rawText : '',
    parseStatus: parsed.parsed ? (parsed.valid ? 'PASS' : 'SCHEMA_FAIL') : 'FAIL',
    parsed: parsed.parsed,
    schemaValid: parsed.valid,
    json: parsed.parsed ? parsed.value : null,
    errors: parsed.errors,
  };
}
