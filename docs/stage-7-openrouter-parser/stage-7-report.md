# Stage 7 — Report

## Status

```text
PARTIAL — READY_FOR_OPENROUTER_CHECKPOINT
```

Stage 7 is implemented, locally validated, and synchronized with the bound DEV Apps
Script project. Live OpenRouter smoke is pending because both required Script
Properties are absent. Stage 8 was not started.

## Received from Kilo

The incoming review package contained:

- tracked canonical `project-input.schema.json`, `parser-contract.md`, stage context,
  schema generator, and generated Apps Script artifact in commits `da0ab5a`,
  `e789972`, and `20903b7`;
- untracked `openrouter_client.gs`, `project_parser.gs`, and the versioned parser
  prompt;
- an uncommitted `.claspignore` extension for Stage 7 files.

The dirty working tree was treated as expected incoming work. Nothing was reset or
discarded.

## Project Input schema

Canonical source:

```text
docs/stage-7-openrouter-parser/project-input.schema.json
```

Schema version is `project-input-v1`, JSON Schema Draft 2020-12. The Python generator
resolves internal references and produces only
`apps-script/generated/project_input_schema.gs`; there is no second manually maintained
schema.

Codex fixed enum enforcement so layout shape, zone, and module class are true JSON
Schema enums rather than custom annotations understood only by the generator. Integer
facts reject negative values. Evidence is complete for `KNOWN`, `INFERRED`, and
`CONFLICT`. `missing_questions`, top-level evidence, and trusted parser metadata are
required. Unknown/additional properties are rejected recursively.

## Fact / uncertainty model

The final gate distinguishes:

```text
KNOWN / INFERRED / UNKNOWN / CONFLICT / NOT_APPLICABLE
```

- `KNOWN` and `INFERRED` require complete provenance.
- `INFERRED` remains explicitly unconfirmed.
- `UNKNOWN` and `NOT_APPLICABLE` use empty/zero/`unknown` sentinels and cannot carry
  invented evidence.
- `CONFLICT` cannot select one conflicting value and must explain the conflict.
- Known/inferred quantities and dimensions must be positive integers.

## Prompt contract

Prompt version `project-input-prompt-v2` prohibits price/cost calculation, price
selection, layout design/optimisation, BOM/module recipes, defaults, and fields outside
the schema. It requires explicit fact states, evidence, conflict handling, meaningful
questions, and JSON-only output.

## OpenRouter client

The client uses native Apps Script `UrlFetchApp` with:

```text
POST https://openrouter.ai/api/v1/chat/completions
response_format.type = json_schema
strict = true
provider.require_parameters = true
stream = false
```

Multimodal content is text-first followed by `image_url` data URLs. Supported MIME
types are PNG, JPEG, and WebP. Source references are included in the text part for
provenance. Base64 and MIME are validated before any HTTP call.

Codex corrected the incoming Apps Script options to use `contentType` and
`timeoutSeconds`, added capability-aware provider routing, and separated retryable
transient failures from permanent HTTP/input/auth/schema failures. Retry is capped at
two retries with bounded backoff and no model fallback.

## Security / config

`OPENROUTER_API_KEY` and `OPENROUTER_MODEL` are read from Script Properties. Empty or
missing values produce `CONFIG_ERROR`; there is no hardcoded model fallback. Transport
exceptions are converted to fixed diagnostics so keys, authorization headers, user
text, images, and raw provider responses are not returned or logged.

The repository secret scan covered 76 tracked/untracked non-ignored files and passed.
Scope-term inspection found price/BOM terms only in explicit guardrails and rejection
messages.

## Parser and deterministic validation

Business output is parsed without silent repair. Trusted operational metadata is
attached locally from the actual call (`request_id`, schema/prompt versions, requested
and returned models, timestamp, modalities, provider request ID, and sanitized token
usage), then the complete Project Input is validated.

The validator checks required shape/types/enums, additional properties, non-negative
integers, positive known/inferred values, evidence invariants, unknown/conflict
sentinels, valid/unique question IDs and schema paths, ISO timestamps, parser metadata,
and forbidden price/cost/BOM fields.

## Tests

Mocked Stage 7 suite:

```text
11 / 11 PASS
```

It covers complete text, incomplete input with `UNKNOWN` and questions, conflict,
hallucination/default guard, inference evidence, multimodal construction, invalid model
JSON, additional properties, unsupported/malformed image without HTTP, config errors,
secret-safe diagnostics, canonical schema generation, and transient-only bounded retry.

## Regressions

```text
Stage 6 Node checks:       10 / 10 PASS
Stage 7 mocked checks:     11 / 11 PASS
Python regression suite:  74 / 74 PASS
Human UX regressions:     PASS
Stage 5/4/3 regressions:  PASS
generated artifacts:      CURRENT (3 / 3)
JSON Schema meta-check:   PASS
Apps Script syntax:       PASS
py_compile:               PASS
git diff --check:         PASS
```

## Live OpenRouter verification

A non-sensitive `runStage7LiveSmoke()` checkpoint is included for the bound DEV editor:

- text-only synthetic kitchen input;
- text plus synthetic 1×1 PNG input;
- safe summary only (status/category/model/evidence/metadata), never raw inputs or output.

The authorized Apps Script UI was inspected without reading or exposing any secret
value. Neither `OPENROUTER_API_KEY` nor `OPENROUTER_MODEL` is currently present in
Script Properties, so no external OpenRouter call was made.

```text
live text smoke:        NOT RUN — CONFIG ABSENT
live image+text smoke:  NOT RUN — CONFIG ABSENT
checkpoint status:      READY_FOR_OPENROUTER_CHECKPOINT
```

## Clasp verification

The Stage 6 allowlist, status test, snapshot normalization, generated-artifact gate,
and exact preflight push set were extended to all nine canonical Apps Script files.
The existing bound DEV Script ID was verified in both local clasp config and the
authorized Apps Script project settings. A fresh isolated preflight snapshot contained
the five accepted Stage 6/Human UX files as `SAME`; the four Stage 7 files were the only
expected `LOCAL_ONLY` files. Unknown remote files: 0.

Controlled `clasp push` (without `--force`) pushed exactly nine allowlisted files.
The post-push isolated snapshot reported:

```text
SAME:          9 / 9
REMOTE_ONLY:   0
LOCAL_ONLY:    0
DIFFERENT:     0
unknown files: 0
```

No new Apps Script project, Web App, API Executable, or deployment was created.

## Deferred scope

No Stage 8 orchestration, calculation runtime, price lookup, layout generation, BOM,
Web App, Calculations/Offer physical sheets, `CURRENT_REPRICE`, PDF, deployment, or Git
push was implemented.

## Git

```text
branch: main
implementation commit: 4983c18
report checkpoint: this report's final local commit
working tree: clean after final report commit
Git push: NO
```
