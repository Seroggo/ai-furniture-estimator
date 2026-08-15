# AI Мебельщик — Stage 9
## Manager Web App

## 1. Режим

```text
Управление: NORMAL
Рекомендуемый Codex: GPT-5.6 Sol
Reasoning: MEDIUM
```

Raise to CONTROLLED/HIGH only for deployment access/security ambiguity, manifest/OAuth
scope changes, unexpected Stage 7/8 contract changes, remote clasp conflict or public
access decisions.

Stage 9 is integration/UX. Accepted Stage 7 and Stage 8 semantics must not be redesigned.

## 2. Цель

Создать минимальный внутренний manager-facing Apps Script Web App:

```text
manager
→ free Russian text
→ optional images
→ Stage 7 parser
→ validated project-input-v1
→ Stage 8 deterministic kernel
→ human-readable Web App result
```

The Web App must make the accepted pipeline usable without opening the Apps Script IDE.

## 3. Обязательный baseline

Изучи:

```text
AI_FURNITURE_EXECUTION.md
PROJECT_CONTEXT.md

docs/stage-7-openrouter-parser/project-input.schema.json
docs/stage-7-openrouter-parser/parser-contract.md
docs/stage-7-openrouter-parser/stage-7-report.md

docs/stage-8-calculation-kernel/calculation-result.schema.json
docs/stage-8-calculation-kernel/calculation-contract.md
docs/stage-8-calculation-kernel/stage-8-report.md

docs/stage-6-apps-script-baseline/apps-script-development.md
docs/stage-6-apps-script-baseline/stage-6-report.md

docs/human-ux-patch/human-ux-contract.md

apps-script/
tests/
tools/
```

Inspect actual function names/signatures before implementing. Do not duplicate Stage 7/8
logic into UI files.

## 4. Git baseline

Expected before Stage 9 context commit:

```text
branch: main
HEAD: 4038225
working tree: clean
Git push: NO
```

Always verify actual Git state.

## 5. Scope boundary

Stage 9 owns:

```text
doGet / HtmlService rendering
browser request collection
image conversion/validation boundary
safe server call
Stage 7 → Stage 8 orchestration
view-model mapping
human-readable rendering
safe UI errors
DEV Web App verification
```

Stage 9 does NOT own new parsing semantics, calculation formulas, BOM authoring,
price publication, quote persistence/history, PDF or CURRENT_REPRICE.

## 6. Web App architecture

Preferred minimal architecture:

```text
Apps Script HtmlService
→ vanilla HTML/CSS/JS
→ google.script.run
→ one server orchestration boundary
→ Stage 7 parser
→ Stage 8 calculation orchestrator
→ small browser-safe view model
→ render
```

No React/Vue/build pipeline/CDN unless an existing accepted dependency makes that simpler.

## 7. Server boundary

Create one explicit Stage 9 server entry point, equivalent to:

```text
submitStage9Project(request)
```

Responsibilities:

```text
validate request shape
validate text length
validate image count/type/size
call accepted Stage 7 parser
only after canonical parser success:
    call accepted Stage 8 kernel
build safe browser view model
return typed response
```

The browser must not call low-level parser/calculation internals independently.

## 8. Request contract

Minimum request:

```text
request_version
text
images[]
```

Image fields should reuse the accepted Stage 7 contract, e.g.:

```text
client_ref
mime_type
base64
```

Supported MIME:

```text
image/png
image/jpeg
image/webp
```

Define/test conservative operational limits:

```text
maximum text length
maximum image count
maximum decoded bytes per image
maximum aggregate image payload
```

Do not log input text or base64.

## 9. Browser image handling

Browser may use `FileReader`.

Requirements:

- validate MIME before submit;
- show filename/type/size;
- allow removing an image before submit;
- never log base64;
- clear large references after request where practical;
- no automatic Drive upload.

Preview is optional; metadata display is sufficient.

## 10. Stage 7 integration

Stage 9 MUST call the accepted Stage 7 parser.

Do not change parser schema/model, add fallback model, parse in browser, or trust model
output without canonical validation.

Typed Stage 7 failures remain:

```text
CONFIG_ERROR
AUTH_ERROR
RATE_LIMIT
UPSTREAM_ERROR
TIMEOUT
PARSER_OUTPUT_INVALID
INPUT_INVALID
```

Map them to safe manager messages. No raw upstream response.

## 11. Clarification UX

`project-input-v1` may contain:

```text
missing_questions
UNKNOWN
INFERRED
CONFLICT
```

Minimum UI:

```text
Что система поняла
Что нужно уточнить
Статус расчёта
```

Simplest accepted clarification flow:

```text
manager edits/adds to the same free-text input
→ submits again
→ full Stage 7 parse runs again
```

Do NOT build conversational state, patch-merging, chat memory or persistence.

## 12. Stage 8 integration

Stage 9 calls the accepted deterministic calculation entry point.

Do not duplicate readiness, role map, layout, recipe resolver, quantity rules, decimal
arithmetic, pricebook resolver or result validation.

Current real DEV may return:

```text
REQUIRES_EXPERT
```

because production recipes are absent. This must render as a normal business blocker.

## 13. Browser-safe view model

Do not send internal objects blindly to the browser.

Define one small Stage 9 view model, versioned if useful, such as:

```text
web-app-view-v1
```

Suggested areas:

```text
request_id
status
understood_summary
missing_questions
calculation_status
blockers
warnings
layout_summary
cost_summary
technical_reference
```

Never include API key, auth headers, raw provider response, base64, stack traces,
unnecessary full evidence or chain-of-thought.

Canonical Stage 7/8 JSON remains server-side source of truth.

## 14. Human-readable status mapping

Create deterministic manager-facing mapping for Stage 8 statuses:

```text
SUCCESS
INPUT_NOT_READY
NOT_SUPPORTED
NO_VALID_LAYOUT
REQUIRES_EXPERT
PRICEBOOK_NOT_AVAILABLE
PRICE_NOT_FOUND
UNIT_MISMATCH
MASTER_DATA_INVALID
```

Show a Russian human message plus secondary technical status code.

## 15. Minimal UI

One page is enough:

```text
1. Заголовок / purpose
2. Free-text textarea
3. Optional image picker
4. Submit button
5. Progress state
6. Что система поняла
7. Вопросы / blockers
8. Результат расчёта
9. Edit and retry
```

No wizard/dashboard shell before Stage 10.

## 16. UI language / behavior

Primary language:

```text
Russian
```

Requirements:

```text
desktop-first
usable on narrow/mobile viewport
keyboard-accessible controls
visible loading state
submit disabled while active
double-submit prevented
errors visible until retry/edit
```

Keep visual design simple and business-like.

## 17. XSS / content safety

User input and LLM-derived text are untrusted.

Do not render them using raw `innerHTML`.

Use:

```text
textContent
DOM node creation
safe attribute assignment
```

Add a regression fixture with HTML/script-like content and prove it remains inert text.

No external script injection/CDN.

## 18. Error handling

Separate:

```text
business status
transport/parser failure
internal exception
```

Business status → normal result with blocker.

Parser/transport failure → safe manager message.

Internal exception → generic safe system error plus correlation/reference ID if available.

Never return stack traces, secrets, raw request bodies or raw provider responses.

## 19. Logging / privacy

Allowed:

```text
request/reference ID
high-level status
timing
image count
input modality
safe diagnostic code
calculation status
```

Forbidden:

```text
full free text
base64
raw images
API key
authorization header
raw OpenRouter response
full canonical Project Input
```

No analytics/telemetry product on Stage 9.

## 20. Persistence

No automatic writes of request/result history.

Do not create:

```text
Calculations
Offer
Quote DB
Session_Log
Requests
WebApp_History
```

No Drive upload for images.

Browser session state only; reload may clear it.

## 21. Price UI

Stage 9 is calculation UI, not price administration.

Do not expose editing/publishing for Custom_Price, spr_price, pricebooks or GOOGLEFINANCE.

If prices are unavailable, show the blocker.

## 22. Test strategy

### A. Server request boundary

At minimum:

1. valid text-only request accepted;
2. valid text+image accepted;
3. empty text + no images rejected;
4. unsupported MIME rejected before parser;
5. oversize image rejected before parser;
6. too many images rejected;
7. oversized text rejected;
8. unknown request property rejected if strict contract is used.

### B. Orchestration

Using mocks/stubs:

1. Stage 7 success → Stage 8 called once;
2. Stage 7 failure → Stage 8 not called;
3. Stage 8 SUCCESS maps correctly;
4. Stage 8 REQUIRES_EXPERT maps as business blocker;
5. INPUT_NOT_READY maps to clarification UX;
6. internal exception produces safe system error.

### C. Security

Prove:

```text
API key never enters browser response
base64 never enters browser response
raw provider payload not returned
stack trace not returned
script-like user/model content is not executable
```

### D. UI/static

At minimum:

```text
doGet returns expected page
required controls exist
loading/double-submit guard exists
status sections exist
no external JS/CSS CDN
safe DOM rendering is enforced
```

### E. Regressions

Run Stage 8, Stage 7, Stage 6, Python Stage 5/4/3/Human UX, generated checks,
Apps Script syntax/static, py_compile where applicable, secret scan and git diff --check.

## 23. Live DEV Web App checkpoint

Stage 9 COMPLETE requires actual browser verification through the existing bound DEV
Apps Script project.

Preferred acceptance vehicle:

```text
Apps Script Web App test deployment (/dev)
```

Keep access restricted to the user/editors. Do NOT create an anonymous public deployment.

Required live checks:

### A. Page load

```text
page opens
Russian UI visible
no browser-visible exception
no secret/config visible
```

### B. Text-only request

Submit a synthetic/non-sensitive kitchen description.

Expected:

```text
browser
→ server
→ Stage 7 live OpenRouter
→ canonical Project Input
→ Stage 8
→ human-readable result
```

Current DEV may end in `REQUIRES_EXPERT`; that is acceptable if correctly rendered.

### C. Image path

Attach one small supported PNG/JPEG/WebP and submit.

Verify browser image handling, server acceptance, Stage 7 image modality, no base64
display/logging and normal result rendering.

Stage 7 already proved multimodal semantics; Stage 9 proves browser-to-server transport.

### D. Clarification/blocker rendering

At least one live or deterministic fixture must demonstrate missing question or blocker
rendering.

## 24. Deployment workflow

Implementation/push may be handled by Codex via accepted clasp workflow.

Creating/opening a Web App test deployment may require one manual user checkpoint in the
normal Apps Script browser UI.

If manual action is needed, stop and provide exactly one concrete instruction.

Do not automate consent/account UI through embedded browser.

## 25. Expected artifacts

Minimum:

```text
docs/stage-9-web-app/
├── stage-9-context.md
├── web-app-contract.md
└── stage-9-report.md
```

Likely Apps Script areas:

```text
web_app.gs
web_app.html
optional included style/client fragments
```

Avoid excessive file fragmentation.

## 26. Acceptance criteria

Stage 9 = COMPLETE when:

1. Existing bound DEV Apps Script serves a Web App page.
2. UI is Russian and manager-facing.
3. Free-text request works.
4. Optional supported images work through browser boundary.
5. Browser calls one explicit server orchestration boundary.
6. Server reuses accepted Stage 7 parser.
7. Server reuses accepted Stage 8 kernel.
8. No duplicate parser/calculation business logic exists in UI.
9. Stage 7 failure prevents Stage 8 call.
10. Valid parser output reaches Stage 8.
11. REQUIRES_EXPERT renders as business blocker.
12. INPUT_NOT_READY / missing questions are understandable.
13. User can edit text and resubmit without persistent chat/session architecture.
14. No hidden promotion of INFERRED/UNKNOWN.
15. API key never reaches browser.
16. Base64 never returns from server.
17. Raw provider response never reaches browser.
18. Internal stack traces never reach browser.
19. User/model text is XSS-safe.
20. Request size/type/count limits exist.
21. Double-submit is prevented.
22. Loading/error states exist.
23. No unnecessary third-party frontend dependency.
24. No automatic request/result persistence.
25. No physical quote/history sheets created.
26. No Drive image upload.
27. No price administration added to Web App.
28. No direct working-price dependency introduced.
29. Stage 9 server/orchestration tests PASS.
30. UI/static/security tests PASS.
31. Stage 8 tests remain PASS.
32. Stage 7 tests remain PASS.
33. Stage 6 checks remain PASS.
34. Python/Human UX/Stage 5/4/3 regressions remain PASS.
35. generated artifacts CURRENT.
36. Apps Script syntax/static PASS.
37. py_compile/checks PASS where applicable.
38. secret scan PASS.
39. git diff --check PASS.
40. controlled clasp preflight/push/round-trip PASS.
41. live `/dev` page load PASS.
42. live text-only submit PASS.
43. live image submit PASS.
44. live result/blocker rendering PASS.
45. access is not anonymous/public.
46. `web-app-contract.md` exists.
47. `stage-9-report.md` exists.
48. working tree clean after final commit.
49. Git push NO.
50. Stage 10 not started.

## 27. Do not do

Do NOT implement:

- new parser schema without proven Stage 7 defect;
- new calculation formulas;
- recipe authoring;
- fake BOM;
- pricebook publication;
- CURRENT_REPRICE;
- physical Calculations/Offer sheets;
- quote DB/history;
- PDF/XLSX;
- CRM;
- public anonymous deployment;
- custom authentication system;
- React/Vue/build tooling without strong reason;
- analytics/telemetry platform;
- Stage 10;
- Git push.

## 28. Report

Create:

```text
docs/stage-9-web-app/stage-9-report.md
```

Minimum sections:

```text
Status
Web App architecture
Request contract
Stage 7 integration
Stage 8 integration
View model
UX / clarification flow
Security / privacy
Error handling
Tests
Clasp verification
Live DEV Web App verification
Deployment/access
Deferred scope
Git
```

After Stage 9 stop. Stage 10 requires HQ acceptance.
