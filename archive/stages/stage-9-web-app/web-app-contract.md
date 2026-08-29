# Stage 9 — Web App contract

## Boundary

The browser calls exactly one public server function:

```text
submitStage9Project(request)
```

The server validates and normalizes the request, calls the accepted Stage 7
`parseProjectInput()` entry point, calls the accepted Stage 8 `calculateProject()`
entry point exactly once after parser success, and returns `web-app-view-v1`.
The browser never calls parser, master-data, layout, recipe, price, or calculation
functions directly.

`doGet()` serves the single Russian manager page from `web_app.html` through
Apps Script `HtmlService`.

## Request: `stage9-request-v1`

The request is a strict JSON-compatible object. Unknown properties are rejected at
the top level and inside image entries.

```json
{
  "request_version": "stage9-request-v1",
  "text": "Свободное описание кухни на русском языке",
  "images": [
    {
      "client_ref": "kitchen-photo.jpg",
      "mime_type": "image/jpeg",
      "base64": "..."
    }
  ]
}
```

Rules and operational limits:

| Field | Rule |
|---|---|
| `request_version` | exactly `stage9-request-v1` |
| `text` | string, non-empty after trim, at most 12,000 UTF-16 code units |
| `images` | required array, zero to 3 entries |
| `client_ref` | non-empty string, at most 180 code units |
| `mime_type` | `image/png`, `image/jpeg`, or `image/webp` |
| `base64` | canonical non-empty base64 without a data URL prefix |
| decoded image size | at most 4 MiB per image |
| aggregate decoded image size | at most 8 MiB |

The browser performs early type/count/size checks for usability. The server repeats
all authoritative checks before Stage 7. The server converts each accepted image to
the existing Stage 7 shape without changing the image bytes:

```text
client_ref → source_ref
mime_type  → mime_type
base64     → data
```

Text and base64 are used only for the current in-memory request. Stage 9 does not log
them, persist them, or upload images to Drive.

## Response: `web-app-view-v1`

Every response is a deliberately constructed allowlisted view model, never a raw
Stage 7 or Stage 8 object.

Common fields:

```text
view_version          = web-app-view-v1
request_id            server-generated correlation ID
response_kind         RESULT | INPUT_ERROR | PARSER_ERROR | SYSTEM_ERROR
display_status        CALCULATED | CLARIFICATION_REQUIRED |
                      BUSINESS_BLOCKER | ERROR
title                  short Russian title
message                fixed/sanitized Russian manager message
understood_summary[]   allowlisted facts and module summaries
missing_questions[]    allowlisted question fields
calculation_status     canonical Stage 8 status or null
blockers[]             allowlisted Stage 8 diagnostics
warnings[]             allowlisted Stage 8 diagnostics
layout_summary         small layout projection or null
cost_summary           small cost projection or null
technical_reference    schema/status references only
```

String fields and collection sizes are bounded during mapping. The response never
contains request text, image base64, API keys, authorization headers, raw OpenRouter
payloads/diagnostics, parser validation details, stack traces, full canonical Project
Input, full Calculation Result, evidence arrays, or chain-of-thought.

`understood_summary` may contain bounded user/model-derived fact values. The client
renders every such value only with `textContent` and DOM node creation.

## Stage 7 integration

After Stage 9 validation, the server calls:

```text
parseProjectInput({
  text,
  images: [{source_ref, mime_type, data}],
  request_id
})
```

Only `status = SUCCESS` proceeds. Parser categories are mapped to fixed Russian
messages:

```text
CONFIG_ERROR
AUTH_ERROR
RATE_LIMIT
UPSTREAM_ERROR
TIMEOUT
PARSER_OUTPUT_INVALID
INPUT_INVALID
```

Raw parser messages, validation errors, upstream diagnostics and responses are not
returned. Parser failure causes zero Stage 8 calls.

## Stage 8 integration and display statuses

After parser success, the server calls `calculateProject(parserResult.data, {})`
exactly once. Stage 9 does not reproduce its readiness, layout, recipe, quantity,
decimal, pricebook, or validation logic.

| Stage 8 status | Manager display |
|---|---|
| `SUCCESS` | `CALCULATED` |
| `INPUT_NOT_READY` | `CLARIFICATION_REQUIRED` |
| `NOT_SUPPORTED` | `BUSINESS_BLOCKER` |
| `NO_VALID_LAYOUT` | `BUSINESS_BLOCKER` |
| `REQUIRES_EXPERT` | `BUSINESS_BLOCKER` (normal current DEV result) |
| `PRICEBOOK_NOT_AVAILABLE` | `BUSINESS_BLOCKER` |
| `PRICE_NOT_FOUND` | `BUSINESS_BLOCKER` |
| `UNIT_MISMATCH` | `BUSINESS_BLOCKER` |
| `MASTER_DATA_INVALID` | `BUSINESS_BLOCKER` |

Canonical missing questions are shown independently of the Stage 8 blocker list.
Clarification is stateless: the manager edits or adds to the same textarea and
submits the full request again. There is no patch merge, chat/session memory, quote
history, or request/result persistence.

## Error and privacy model

- Invalid Stage 9 input returns `INPUT_ERROR` and a fixed safe message before Stage 7.
- A typed Stage 7 failure returns `PARSER_ERROR` and a category-specific safe message.
- A Stage 8 business status returns `RESULT`; it is never converted to a system error.
- An unexpected exception returns `SYSTEM_ERROR`, a correlation ID, and a generic
  message. The exception text and stack are neither logged by Stage 9 nor returned.
- Logs contain only correlation ID, response kind/status, image count, modality and
  elapsed time.
- Browser-side rendering uses no response-driven `innerHTML`, external script, CSS
  CDN, analytics, or telemetry.

## Persistence and access

Stage 9 creates no Sheets, Drive files, history records, quotes, offers, sessions,
price administration, or public endpoint. Live acceptance uses only the existing
bound DEV Apps Script project and a restricted `/dev` test deployment accessible to
the owner/editors. Anonymous/public deployment is forbidden.
