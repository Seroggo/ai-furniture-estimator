# Stage 9 — Report

## Status

```text
PARTIAL — MANUAL GOOGLE CHECKPOINT
```

Локальная реализация, полный regression checkpoint, controlled clasp push и
изолированный round-trip завершены. Канонический source синхронизирован с существующим
bound DEV Apps Script project. Stage 9 ещё не `COMPLETE`, потому что `/dev` Web App
нужно открыть и проверить в обычной signed-in Google editor session. Публичный или
anonymous deployment не создавался.

## Corrective live patch — optional images

Manual `/dev` acceptance обнаружил реальную browser regression: text-only submit с
нулём выбранных изображений показывал сообщение об ошибке FileReader и не достигал
`submitStage9Project()`.

Root cause находился только в `web_app.html`: нулевая коллекция изображений всё равно
проходила через общий async `Promise.all(selectedFiles.map(...))`, а создание request
и вызов `google.script.run` находились в том же `try/catch`, что и FileReader. Поэтому
empty-image path не был самостоятельным контрактным путём, а любое исключение внутри
общей фазы ошибочно классифицировалось как «Не удалось прочитать изображение».

Corrective patch не меняет request/server/Stage 7/Stage 8 contracts:

- `filesToRead` содержит только реальные browser `File` objects;
- zero files сразу создаёт literal `images: []` и не вызывает FileReader;
- encode/FileReader имеет отдельный narrow `try/catch`;
- `google.script.run` dispatch имеет отдельную transport error branch;
- picker отбрасывает null/undefined pseudo-file entries;
- remove-all возвращает normal text-only path.

Добавлены исполняемые browser-runtime regressions для text-only request shape, zero
FileReader calls, select-then-remove-all, actual FileReader failure, valid image flow и
double-submit/loading guard. Corrective live recheck остаётся manual checkpoint.

## Web App architecture

```text
Apps Script HtmlService / doGet
→ web_app.html (vanilla Russian HTML/CSS/JS)
→ google.script.run
→ submitStage9Project(request)
→ accepted parseProjectInput()
→ accepted calculateProject()
→ web-app-view-v1
→ textContent / DOM node rendering
```

Browser вызывает только один explicit Stage 9 boundary. Parser, master-data,
readiness, layout, recipe, quantity, decimal, pricebook и result-validation logic в
UI не дублируются. Source разделён на `stage9_server.gs` и `web_app.html`, потому что
Apps Script не допускает одинаковые project file names для `.gs` и `.html`.

## Request contract

Канонический Stage 9 request описан в `web-app-contract.md`:

```text
request_version = stage9-request-v1
text
images[] = client_ref / mime_type / base64
```

Contract strict: unknown top-level и image properties блокируются до parser call.

Operational limits:

```text
text:                    12 000 UTF-16 code units
images:                  3
decoded bytes/image:     4 MiB
aggregate decoded bytes: 8 MiB
client_ref:              180 code units
MIME:                    image/png, image/jpeg, image/webp
```

Browser делает раннюю проверку MIME/count/size, показывает имя/type/size и позволяет
удалить файл. Server повторяет authoritative MIME/count/base64/decoded-size checks.
Размер проверяется до полного прохода по содержимому слишком большого base64.

## Stage 7 integration

После Stage 9 validation server преобразует только transport names:

```text
client_ref → source_ref
mime_type  → mime_type
base64     → data
```

и вызывает accepted `parseProjectInput({text, images, request_id})`. Только
`status = SUCCESS` допускает Stage 8. `CONFIG_ERROR`, `AUTH_ERROR`, `RATE_LIMIT`,
`UPSTREAM_ERROR`, `TIMEOUT`, `PARSER_OUTPUT_INVALID` и `INPUT_INVALID` отображаются
фиксированными безопасными русскими сообщениями. Raw message, validation errors,
upstream diagnostic и provider response browser не получает.

## Stage 8 integration

После parser success accepted `calculateProject(projectInput, {})` вызывается ровно
один раз. Parser failure даёт ровно zero Stage 8 calls.

Все accepted statuses отображаются детерминированно:

```text
SUCCESS                 → CALCULATED
INPUT_NOT_READY         → CLARIFICATION_REQUIRED
NOT_SUPPORTED           → BUSINESS_BLOCKER
NO_VALID_LAYOUT         → BUSINESS_BLOCKER
REQUIRES_EXPERT         → BUSINESS_BLOCKER
PRICEBOOK_NOT_AVAILABLE → BUSINESS_BLOCKER
PRICE_NOT_FOUND         → BUSINESS_BLOCKER
UNIT_MISMATCH           → BUSINESS_BLOCKER
MASTER_DATA_INVALID     → BUSINESS_BLOCKER
```

`REQUIRES_EXPERT` остаётся нормальным текущим DEV business result. Stage 8 calculation
semantics не изменялись. Controlled push также доставил две уже accepted локальные
Stage 8 corrections из commit `dd5b5a9`, которые отсутствовали в свежем remote
preflight: canonical DecimalString и SUCCESS/blocker result invariants.

## View model

Browser получает только allowlisted `web-app-view-v1`:

```text
request_id
response_kind / display_status
fixed title / message
bounded understood_summary
bounded missing_questions
calculation_status
bounded blockers / warnings
small layout_summary
small cost_summary
schema/model technical references
```

Full Project Input, Calculation Result, evidence/provenance arrays, raw input text,
base64, OpenRouter metadata/payload, API key, Authorization data и stack trace не
возвращаются. User/LLM-derived fact text может присутствовать только как bounded view
data и выводится через `textContent`.

## UX / clarification flow

UI русскоязычный, desktop-first и responsive для узкого viewport. Реализованы:

- textarea и visible character counter;
- optional multi-image picker, metadata list и remove-before-submit;
- loading state и disable controls во время active request;
- независимый `submitting` guard от double submit;
- «Что система поняла» с visible fact states, включая `INFERRED`/`UNKNOWN`;
- «Что нужно уточнить» с priority/reason;
- layout, cost, blocker и warning areas;
- edit/focus и full stateless resubmit flow;
- fixed safe transport/parser/system errors.

После завершения request client очищает base64 payload и file references. Chat state,
patch merge, quote/session history и persistence отсутствуют.

## Security / privacy

- нет external JS/CSS/CDN, analytics или telemetry;
- response-driven `innerHTML`, `insertAdjacentHTML`, `document.write` и `eval` нет;
- script-like regression остаётся inert text;
- Stage 9 logs содержат только request ID, high-level statuses, image count, modality и
  elapsed time;
- text/base64/raw image/API key/auth header/provider payload/exception не логируются;
- image upload на Drive отсутствует;
- Spreadsheet/Drive/request/history writes отсутствуют;
- price administration и working-price dependency не добавлены;
- новые sheets (`Calculations`, `Offer`, `Requests`, `Session_Log` и аналоги) не
  создаются.

## Error handling

```text
invalid request         → INPUT_ERROR before Stage 7
typed parser failure    → PARSER_ERROR, Stage 8 zero calls
Stage 8 business status → RESULT, never generic system error
unexpected exception    → SYSTEM_ERROR + correlation ID, no exception details
```

Unknown Stage 8 status рассматривается как internal contract violation и безопасно
возвращается как `SYSTEM_ERROR`; он не маскируется business blocker.

## Tests

Финальный local/preflight checkpoint:

```text
Stage 6 Node:            11 / 11 PASS
Stage 7 Node:            19 / 19 PASS
Stage 8 Node:            10 / 10 PASS
Stage 9 Node:            19 / 19 PASS
Python regressions:      77 / 77 PASS
Stage 5/4/3/Human UX:    PASS in Python suite
generated artifacts:     CURRENT
Apps Script .gs syntax:  PASS
Web App client syntax:   PASS
py_compile/compileall:   PASS
secret scan:             PASS
git diff --check:        PASS
```

Stage 9 tests покрывают valid text, valid image transport conversion, empty request,
unsupported MIME, malformed base64, per-image oversize, aggregate oversize, too many
images, oversized text, strict unknown properties, exact orchestration call counts,
SUCCESS, INPUT_NOT_READY, REQUIRES_EXPERT, safe parser/system errors, safe log,
script-like content, required UI controls, loading/double-submit guard, no external
CDN, no low-level browser calls и no persistence/diagnostic exposure.

## Clasp verification

Fresh preflight существующего target suffix `...HvYv52`:

```text
remote files before push: 19
SAME:                     17
accepted Stage 8 drift:    2 local corrections from dd5b5a9
Stage 9 LOCAL_ONLY:        2
unknown remote:            0
exact allowlist:          21
preflight:                PASS
```

Первая normal push попытка безопасно остановилась до remote write, потому что
`web_app.gs` и `web_app.html` имеют одинаковый Apps Script project name. Server file
переименован в `stage9_server.gs`; Stage 9/6 tests и fresh preflight повторены.

Вторая controlled push:

```text
mode:       normal / non-force
files:      21 exact allowlisted files
result:     PUSHED
new project: NO
```

Fresh isolated round-trip:

```text
SAME:          21 / 21
REMOTE_ONLY:    0
LOCAL_ONLY:     0
DIFFERENT:      0
unknown remote: 0
```

## Live DEV Web App verification

```text
/dev page load:             PASS in initial manual check
Russian UI:                 PASS in initial manual check
text-only Stage 7→8→UI:     FAILED before corrective patch; recheck PENDING
image browser→7→8→UI:       PENDING
clarification rendering:    deterministic test PASS; live PENDING
REQUIRES_EXPERT rendering:  deterministic test PASS; live PENDING
browser privacy inspection: deterministic/static PASS; live PENDING
```

## Deployment / access

`clasp deployments` видит один существующий deployment `@HEAD`. Новый deployment не
создавался. Clasp не показывает его Web App access policy и не может подтвердить
signed-in `/dev` UX. Anonymous/public access не создавался и не запрашивался. Проверка
restricted editor-only `/dev` должна выполняться вручную в обычной Google session;
account/consent/deployment UI не автоматизировался.

## Deferred scope

Не реализованы Stage 10, recipe authoring, fake BOM, pricebook publication,
CURRENT_REPRICE, price administration, Calculations/Offer/Requests/history sheets,
Drive image storage, PDF/XLSX, CRM, chat/session persistence и public deployment.

## Git

```text
branch: main
implementation: c3765de feat: add stage 9 manager web app
Apps Script filename fix: b663093 fix: use distinct Apps Script file names
report checkpoint: this report's final local commit
Git push: NO
working tree: clean after report commit
Stage 10: not started
```
