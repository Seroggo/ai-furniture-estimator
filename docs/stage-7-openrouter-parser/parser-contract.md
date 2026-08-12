# Stage 7 — Parser Contract

## 1. Purpose

The parser transforms free-text (and optional images) into a structured, versioned
Project Input JSON that the deterministic Stage 8 calculation kernel can consume.

The parser is a **probabilistic NLU layer**, not a calculation engine. It does not
compute prices, layouts, BOMs, or module recipes.

## 2. Pipeline

```text
text + optional images
        ↓
OpenRouter (chat/completions, json_schema mode)
        ↓
strict structured output
        ↓
deterministic local validation
        ↓
Project Input JSON
```

## 3. Input API

```text
text: string
images?: [
  {
    mime_type: string    // image/png | image/jpeg | image/webp
    data: string          // base64-encoded image data
    source_ref: string    // caller-provided label
  }
]
request_id?: string
```

## 4. Output contract

The canonical schema is the sole source of truth:

```text
docs/stage-7-openrouter-parser/project-input.schema.json
```

Every parser result MUST pass `validateProjectInput()` against this schema before
being returned to the caller. Invalid model output is reported as
`PARSER_OUTPUT_INVALID` and is never silently repaired.

### 4.1. Schema version

```text
project-input-v1
```

### 4.2. Fact-state model

Every significant extracted field carries a `fact_state`:

| State | Meaning |
|---|---|
| `KNOWN` | Explicitly stated or clearly visible in the input. |
| `INFERRED` | Limited evidence-based deduction (e.g. "likely 600 mm"). |
| `UNKNOWN` | No data available. |
| `CONFLICT` | Multiple sources contradict each other. |
| `NOT_APPLICABLE` | Parameter consciously irrelevant. |

`UNKNOWN` must NEVER be replaced with a market-default or "standard" value.
`INFERRED` must NEVER be treated as a confirmed calculation input without
a separate validation/confirmation policy.

### 4.3. Evidence / provenance

Each significant fact may carry an `evidence` object:

```text
source_type: TEXT | IMAGE | MULTI_SOURCE
source_ref:  text span label / image index / attachment id
evidence_note: brief observation
```

A separate `evidence` array at the top level aggregates input source observations.

### 4.4. Missing questions

The parser returns meaningful questions about data that is insufficient for the
deterministic flow:

```text
question_id:  stable machine-readable id
field_path:   dot-notation path to the relevant schema field
question:     human-readable question text
priority:     BLOCKING | IMPORTANT | OPTIONAL
reason:       why this information is needed
```

`BLOCKING` — the deterministic flow cannot proceed without this.
`IMPORTANT` — strongly recommended to avoid weak inferences.
`OPTIONAL` — nice-to-have.

### 4.5. Parser metadata

Every result includes technical metadata:

```text
request_id
parser_schema_version
prompt_version
provider = openrouter
model_requested
model_returned (if available)
parsed_at
input_modalities
provider_request_id (optional)
usage (optional, non-secret)
```

## 5. Security

### 5.1. API key

`OPENROUTER_API_KEY` is read ONLY from Apps Script `PropertiesService`
(Script Properties). It is NEVER:

- hardcoded in source
- written to Google Sheets
- committed to Git
- included in fixtures
- printed in logs or error messages
- returned in diagnostic output

### 5.2. Model slug

`OPENROUTER_MODEL` (or equivalent non-secret config) makes the model
runtime-configurable. The model slug is NOT a permanent business constant.

## 6. Error / retry model

### 6.1. Error categories

```text
CONFIG_ERROR          — missing or invalid configuration (model, key, etc.)
AUTH_ERROR            — authentication failure (401)
RATE_LIMIT            — rate limit or quota exceeded (429)
UPSTREAM_ERROR        — server error (5xx)
TIMEOUT               — request exceeded timeout
PARSER_OUTPUT_INVALID — model response failed deterministic validation
INPUT_INVALID         — invalid input (bad image, missing text, etc.)
```

### 6.2. Retry policy

- Only transient HTTP/rate-limit/server failures are retried.
- Maximum retry count: 2 (explicit and bounded).
- Semantic-invalid results (`PARSER_OUTPUT_INVALID`) are NEVER retried.
- Request timeout: 60 seconds.
- No automatic unbounded retries.
- No multi-model fallback chain.

## 7. Deterministic validation

After every successful HTTP response, the local validator runs:

1. Parse JSON.
2. Validate required shape, types, enums.
3. Check semantic invariants:
   - `project_type = KITCHEN` (via schema enum constraint).
   - Positive dimensions when present.
   - No negative quantities.
   - Accepted layout shape enum only.
   - `KNOWN` must have evidence (`evidence.source_type`).
   - `CONFLICT` must describe conflicting evidence.
   - Blocking question paths exist in schema.
   - Unknown fields / additional properties rejected.
   - No price/cost fields outside schema.
4. On failure: return `PARSER_OUTPUT_INVALID` with safe diagnostic summary.

## 8. Prompt contract

The system prompt is versioned and stored in the git repository.
It instructs the model to:

- Extract only explicitly supported project facts.
- Distinguish explicit fact from inference.
- Keep unknowns as `UNKNOWN`.
- Report conflicts with descriptions.
- Return only schema-compatible data.
- NEVER calculate cost, price, or select prices.
- NEVER invent dimensions, module recipes, or BOM.
- NEVER replace unknown with market standard.
- Format output strictly according to the JSON Schema.

## 9. Versioning

- Schema version: incremented when the shape or required fields change.
- Prompt version: incremented when the prompt text changes.
- Both are recorded in `parser_metadata` for every parse result.