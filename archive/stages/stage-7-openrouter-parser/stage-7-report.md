# Stage 7 — Report

## Status

```text
STAGE 7 — COMPLETE
```

Stage 7 is implemented, locally validated, synchronized with the bound DEV Apps
Script project, and accepted through successful manual text-only and multimodal live
verification. The configured and returned model is `openai/gpt-5.6-luna`. Stage 8 was
not started.

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

Schema version is `project-input-v1`, JSON Schema Draft 2020-12. The required top-level
`project_type` is canonically constrained to `KITCHEN`. The pre-live corrective patch
keeps v1 because no live output or accepted consumer existed for the incomplete shape;
bumping the version would preserve an erroneous pre-checkpoint contract. The Python generator
resolves internal references and produces only
`apps-script/generated/project_input_schema.gs`; there is no second manually maintained
schema. That generated artifact now contains two explicitly named representations:
`PROJECT_INPUT_SCHEMA` for canonical local validation and
`PROJECT_INPUT_OPENROUTER_SCHEMA` for strict Structured Outputs transport. The latter
is generated recursively from the former, requires every defined object property,
uses nullable transport fields for canonical-optional values, and removes unsupported
validation-only keywords such as `minimum`, `maximum`, and `format`.

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

Prompt version `project-input-prompt-v3` requires `project_type = KITCHEN` and prohibits price/cost calculation, price
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

`response_format.json_schema.schema` uses only the generated
`PROJECT_INPUT_OPENROUTER_SCHEMA`. The canonical schema is never sent as the transport
contract and remains the sole final validation contract.

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

The repository secret scan covered all tracked/untracked non-ignored files and passed.
Scope-term inspection found price/BOM terms only in explicit guardrails and rejection
messages.

## Parser and deterministic validation

Business output is parsed without semantic repair. A deterministic transport decoder
removes only `null` placeholders for properties that are optional in the canonical
schema; required nulls remain invalid. Trusted operational metadata is
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
19 / 19 PASS
```

It covers complete text, incomplete input with `UNKNOWN` and questions, conflict,
hallucination/default guard, inference evidence, multimodal construction, invalid model
JSON, additional properties, unsupported/malformed image without HTTP, config errors,
secret-safe diagnostics, canonical schema generation, and transient-only bounded retry.
The corrective contract regression proves that `KITCHEN` passes, a missing
`project_type` fails, and any non-`KITCHEN` value fails.

## Regressions

```text
Stage 6 Node checks:       10 / 10 PASS
Stage 7 mocked checks:     19 / 19 PASS
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

Preflight confirmed that `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` exist in Script
Properties without logging either property value or any authorization material. The
configured non-secret model slug is `openai/gpt-5.6-luna`.

After manual Google authorization, the user ran `runStage7LiveSmoke()` in the bound
DEV Apps Script editor. Both synthetic/non-sensitive requests reached OpenRouter and
passed the generated transport schema, canonical deterministic validator, trusted
metadata checks, and evidence checks. Both responses included a provider request ID
and returned the configured model slug.

```text
overall status:                    PASS
live text smoke:                   HTTP 200 / PASS
text schema / metadata / evidence: PASS / PASS / PASS
text provider request ID:          PRESENT
text model returned:               openai/gpt-5.6-luna
live image+text smoke:             HTTP 200 / PASS
image schema / metadata / evidence: PASS / PASS / PASS
image provider request ID:         PRESENT
image model returned:              openai/gpt-5.6-luna
final Stage 7 status:              COMPLETE
```

## Clasp verification

The Stage 6 allowlist, status test, snapshot normalization, generated-artifact gate,
and exact preflight push set were extended to all nine canonical Apps Script files.
The existing bound DEV Script ID was verified in both local clasp config and the
authorized Apps Script project settings. A fresh isolated preflight snapshot contained
the five accepted Stage 6/Human UX files as `SAME`; the four Stage 7 files were the only
expected `LOCAL_ONLY` files. Unknown remote files: 0.

The corrective checkpoint added the explicit `spreadsheets.currentonly` and
`script.external_request` scopes required by the bound runtime. The ordinary push
correctly paused on the manifest change; the accepted controlled workflow then used
the required manifest-authorized force push for exactly nine allowlisted files. The
fresh post-push isolated snapshot reported:

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
contract patch: 4bf0c52
safe live diagnostics: 39ccd70, 233fd1d
external-request scope: eff74a9
strict transport schema: e1dfdfb
report checkpoint: this report's final local commit
working tree: clean after final report commit
Git push: NO
```
