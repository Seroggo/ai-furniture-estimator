# AI Мебельщик — Stage 7
## OpenRouter parser

## 1. Режим

```text
Управление: NORMAL
Рекомендуемый Codex: GPT-5.6 Sol
Reasoning: Medium
```

Постоянные правила:

```text
AI_FURNITURE_EXECUTION.md
```

Stage 7 добавляет внешний LLM API и probabilistic component. Поэтому schema,
validation, provenance и negative tests важнее «красивого prompt engineering».

---

## 2. Цель

Реализовать минимальный production-oriented parser входных данных кухни:

```text
free text
+ optional images / sketches / renders
        ↓
OpenRouter
        ↓
structured output
        ↓
deterministic validation
        ↓
Project Input JSON
```

Результат Stage 7 должен быть пригоден как вход Stage 8.

Stage 7 НЕ выполняет calculation/layout/BOM/cost.

---

## 3. Accepted baseline

Сначала изучить:

```text
AI_FURNITURE_EXECUTION.md
PROJECT_CONTEXT.md

docs/stage-3-calculation-model/stage-3.3-report.md
docs/stage-3-calculation-model/stage-3.4-report.md

docs/stage-4-google-sheets/google-sheets-schema.md
docs/stage-4-google-sheets/stage-4-price-patch-report.md

docs/stage-5-setup-system/stage-5-report.md
docs/stage-5-setup-system/stage-5-google-verification.md

docs/stage-6-apps-script-baseline/stage-6-report.md
docs/stage-6-apps-script-baseline/apps-script-development.md

docs/human-ux-patch/human-ux-contract.md
docs/human-ux-patch/human-ux-patch-report.md

calculation_model/layout_configurator.py
calculation_model/calculation_engine.py

apps-script/appsscript.json
apps-script/setup_system.gs
apps-script/custom_price.gs

tests/
```

Найти фактические актуальные filenames вместо создания duplicate files по примерам.

Git baseline по PROJECT_CONTEXT:

```text
branch: main
HEAD: fb9b9e0
working tree: clean
Git push: NO
```

Проверить фактический state перед изменениями.

---

## 4. Актуальные технические ограничения OpenRouter

Использовать текущую официальную OpenRouter API semantics, а не память о старых SDK.

Принятый transport:

```text
POST /api/v1/chat/completions
Authorization: Bearer <OPENROUTER_API_KEY>
Content-Type: application/json
```

Для structured output использовать:

```text
response_format.type = json_schema
strict = true
```

и route only to endpoints, которые реально поддерживают необходимые request
parameters.

Provider routing должен требовать поддержку параметров structured output, а не
молча падать на endpoint без этой capability.

Image input:

```text
multi-part message content
text first
image_url after
```

Поддержать минимум:

```text
image/png
image/jpeg
image/webp
```

GIF не обязателен MVP.

Private/local image можно отправлять как base64 data URL.

Не включать streaming на Stage 7.

---

## 5. OpenRouter client boundary

Создать минимальный Apps Script client.

Ожидаемый смысл:

```text
OpenRouterClient / callOpenRouter()
parseProjectInput()
validateProjectInput()
```

Точные filenames/functions Codex выбирает по существующей структуре.

Использовать native:

```text
UrlFetchApp
```

Не добавлять тяжёлую JS SDK dependency ради одного HTTP endpoint.

### Security

API key:

```text
OPENROUTER_API_KEY
```

хранить только через Apps Script `PropertiesService` / secure script property.

Запрещено:

- hardcode key;
- хранить key в Google Sheets;
- коммитить key;
- включать key в fixture;
- печатать key в logs/errors.

Model config — не secret.

---

## 6. Model selection policy

Не кодировать конкретный vendor/model как архитектурную константу навсегда.

Stage 7 должен иметь explicit runtime config:

```text
OPENROUTER_MODEL
```

или эквивалентный non-secret config.

Для live verification выбрать конкретный model slug, который на момент проверки:

1. доступен в OpenRouter;
2. поддерживает text input;
3. поддерживает image input для multimodal smoke;
4. поддерживает `response_format: json_schema`;
5. имеет приемлемую стоимость для MVP;
6. проходит parser fixtures.

Не использовать `openrouter/free` или случайный router как canonical production model,
потому что воспроизводимость parser behavior важнее нулевой цены.

Не использовать `openrouter/auto` как canonical accepted model без отдельного
обоснования.

Model slug, использованный в live verification, зафиксировать в report, но оставить
runtime-configurable.

Если подходящий endpoint не поддерживает structured output — выбрать другой compatible
endpoint/model, а не убирать schema enforcement.

---

## 7. Canonical Project Input JSON

До prompt реализации создать versioned machine-readable contract:

```text
docs/stage-7-openrouter-parser/project-input.schema.json
```

или иной один canonical JSON Schema file.

Не создавать несколько расходящихся schemas.

Schema должна быть **минимальной для кухонного MVP**, а не универсальной мебельной CAD
моделью.

### Минимальные смысловые области

Project Input должен уметь представить минимум:

```text
project
client/object context
layout/request geometry
required modules/appliances
materials/preferences
constraints
source evidence
missing questions
parser metadata
```

Но включать поле только если оно реально нужно будущему deterministic flow или UX.

Codex должен вывести итоговую schema из accepted Stage 3 input needs и не добавлять
поля «на всякий случай».

---

## 8. Fact-state / uncertainty policy

Ключевой бизнес-риск — превращение догадки LLM в deterministic calculation input.

Schema должна позволять отличать минимум:

```text
KNOWN
INFERRED
UNKNOWN
CONFLICT
NOT_APPLICABLE
```

или более компактный эквивалент.

Принципы:

### KNOWN

Явно сказано/видно во входе.

### INFERRED

LLM делает ограниченный вывод по evidence.

Не считать INFERRED эквивалентом confirmed hard input.

### UNKNOWN

Данных нет.

### CONFLICT

Несколько источников противоречат друг другу.

### NOT_APPLICABLE

Параметр осознанно неприменим.

Нельзя заменять UNKNOWN значением «обычно 600», «обычно стандарт» и т. п.

Market baseline Stage 3 используется deterministic engine позже, а не parser для
заполнения отсутствующих пользовательских фактов.

---

## 9. Evidence / provenance

Не требуется хранить chain-of-thought.

Нужно хранить только проверяемый evidence summary.

Для существенных extracted/inferred facts желательно иметь:

```text
source_type:
TEXT
IMAGE
MULTI_SOURCE

source_ref:
text span label / image index / attachment id

evidence_note:
краткое описание наблюдения

confidence:
optional bounded machine score/category
```

Не требовать дословных больших цитат пользовательского текста.

Если confidence используется, он не заменяет `fact_state`.

---

## 10. Missing questions

Parser обязан возвращать список только реально значимых вопросов.

Каждый вопрос должен иметь по смыслу:

```text
question_id
field/path
question
priority
reason
```

Не превращать parser в анкету из десятков необязательных вопросов.

Приоритет:

```text
BLOCKING
IMPORTANT
OPTIONAL
```

или эквивалент.

BLOCKING — без ответа deterministic flow не может корректно продолжить конкретную
операцию.

Не считать экспертный `module → parts` debt вопросом клиенту.

---

## 11. Prompt architecture

Prompt должен быть versioned и храниться локально.

Предпочтительно:

```text
apps-script/prompts/project_parser_prompt.gs
```

или generated prompt artifact из human-readable source.

Не хранить огромный prompt в Google Sheet.

Prompt должен явно требовать:

- не считать стоимость;
- не выбирать цены;
- не придумывать размеры;
- не придумывать module recipes/BOM;
- не заменять unknown market standard;
- отделять facts от inference;
- сообщать conflicts;
- возвращать только schema-compatible data.

Structured output JSON Schema является главным output contract; prompt не должен
дублировать schema полностью текстом.

---

## 12. Deterministic validation

Даже при OpenRouter Structured Outputs ответ LLM не считать доверенным автоматически.

После HTTP response:

```text
parse JSON
→ validate required shape/types/enums
→ semantic invariants
→ normalize only deterministic representation
```

Минимальные semantic checks:

- `project_type = KITCHEN`;
- positive dimensions when present;
- no impossible negative quantities;
- accepted layout shape enum only;
- `KNOWN` must have evidence;
- `CONFLICT` must describe conflicting evidence;
- blocking question paths exist in schema;
- unknown fields/additional properties rejected;
- model response must not contain price/cost fields outside schema.

Invalid model output:

```text
PARSER_OUTPUT_INVALID
```

с безопасной diagnostic summary, а не silent repair into business data.

Не включать Response Healing plugin как замену local validation на Stage 7.

---

## 13. Input API

Создать внутренний parser request contract, пригодный позже для Web App.

Минимально:

```text
text: string
images?: [
  {
    mime_type
    data_url OR base64/data source
    source_ref
  }
]
request_id?
```

Не создавать Apps Script Web App endpoint на Stage 7.

Parser function callable internally/test manually.

Не привязывать parser API к конкретным HTML form fields Stage 9.

---

## 14. Multimodal scope

Stage 7 MVP:

```text
text → REQUIRED supported
images → REQUIRED supported
```

Image examples:

- фото/скрин эскиза;
- простой чертёж;
- render;
- план с размерами.

Parser может извлекать только то, что реально видно.

Если размер не читается уверенно:

```text
UNKNOWN / INFERRED
+ question
```

PDF/audio/video не обязательны Stage 7.

Не расширять scope только потому, что OpenRouter API их поддерживает.

---

## 15. Parser result metadata

Каждый successful result должен содержать техническую metadata минимум:

```text
request_id
parser_schema_version
prompt_version
provider = openrouter
model_requested
model_returned, если API сообщает
parsed_at
input_modalities
```

Если OpenRouter response сообщает request/generation ID или usage, можно сохранить
минимально полезные non-secret diagnostics:

```text
provider_request_id?
usage?
```

Не делать billing subsystem.

Не сохранять raw API key/auth headers.

---

## 16. Cost / retry policy

Stage 7 должен иметь bounded behavior.

Минимально:

- no automatic unbounded retries;
- retry only transient HTTP/rate-limit/server failures;
- max retry count small and explicit;
- no retry semantic-invalid result through endless LLM loops;
- request timeout explicit;
- concise error categories.

Категории по смыслу:

```text
CONFIG_ERROR
AUTH_ERROR
RATE_LIMIT
UPSTREAM_ERROR
TIMEOUT
PARSER_OUTPUT_INVALID
INPUT_INVALID
```

Не делать multi-model fallback chain на Stage 7.

---

## 17. Logging / privacy

Логи должны быть полезными, но не хранить лишние клиентские данные.

Разрешено логировать:

```text
request_id
model
status
latency
HTTP status
error category
token usage if returned
```

По умолчанию не логировать:

- полный пользовательский текст;
- base64 images;
- API key;
- full raw model response с персональными данными.

Debug raw logging — только явный local/dev opt-in и не accepted production default.

---

## 18. Local test strategy

До live OpenRouter call обеспечить deterministic tests с mocked HTTP layer.

Fixtures минимум:

### T1 — complete text

Пример с явно заданной прямой кухней, длиной и несколькими appliances.

Expected:

```text
facts extracted
no invented price
no invented dimensions
valid Project Input
```

### T2 — incomplete text

Expected:

```text
UNKNOWN
meaningful BLOCKING/IMPORTANT questions
```

### T3 — conflict

Два противоречащих размера.

Expected:

```text
CONFLICT
not silently choosing one
```

### T4 — hallucination guard

Input не содержит материала/цвета.

Expected:

```text
parser contract does not require guessed material/color
```

### T5 — image request construction

Validate:

```text
text first
image_url/data URL after
mime supported
```

### T6 — invalid model JSON

Expected:

```text
PARSER_OUTPUT_INVALID
```

### T7 — unsupported/invalid input image

Expected:

```text
INPUT_INVALID
no OpenRouter call
```

### T8 — secrets/logging

API key does not appear in serialized diagnostics.

Добавить другие high-value tests, не создавать сотни shallow fixtures.

---

## 19. Live OpenRouter checkpoint

Stage 7 `COMPLETE` требует реальный OpenRouter smoke.

До remote write/use:

1. API key exists in OpenRouter;
2. key stored as Script Property, not Git/Sheet;
3. model slug configured;
4. selected model/endpoint supports structured outputs;
5. for multimodal smoke selected model supports images.

### Live smoke A — text

Один deterministic synthetic kitchen request.

Проверить:

```text
HTTP PASS
structured output PASS
local validation PASS
no price/cost hallucination
metadata captured
```

### Live smoke B — image + text

Использовать небольшой synthetic/non-sensitive fixture.

Проверить:

```text
image request accepted
schema-compatible response
local validation PASS
evidence distinguishes image/text
```

Не использовать реальный клиентский материал для первого external API smoke.

Если API key отсутствует:

```text
PARTIAL — READY_FOR_OPENROUTER_CHECKPOINT
```

после полной локальной реализации.

---

## 20. API key user checkpoint

Если key ещё нет, Codex должен остановиться только после готовой локальной реализации.

Пользовательское действие:

```text
создать OpenRouter API key
→ добавить его в Apps Script Script Properties как OPENROUTER_API_KEY
```

Не просить key в chat.

Не коммитить key.

Если нужно настроить model slug, использовать отдельную non-secret property или accepted
config mechanism.

---

## 21. Apps Script / clasp workflow

Использовать accepted Stage 6 workflow.

Перед first Stage 7 remote push:

```text
tests PASS
Git clean
correct DEV target
remote snapshot
preflight diff
exact push file set
```

Controlled clasp push only.

После push:

```text
round-trip SAME
```

Не создавать новый Apps Script project.

Не создавать Web App deployment.

---

## 22. Expected artifacts

Минимально ожидаются:

```text
docs/stage-7-openrouter-parser/
├── stage-7-context.md
├── project-input.schema.json
├── parser-contract.md
├── stage-7-report.md
└── [live verification artifact if needed]

apps-script/
├── openrouter_client.gs
├── project_parser.gs
├── prompts/
│   └── project_parser_prompt.gs
└── existing files
```

Имена могут быть минимально скорректированы под фактическую структуру.

Дополнительный generated schema artifact допустим только если он machine-generated из
`project-input.schema.json`.

Не создавать duplicate manual schema in JS.

---

## 23. Acceptance criteria

Stage 7 = COMPLETE, если:

1. Canonical versioned Project Input JSON Schema создан.
2. Schema минимальна и основана на accepted Stage 3 input needs.
3. Text parser реализован.
4. Image input parser реализован.
5. OpenRouter HTTP client реализован через Apps Script.
6. API key хранится только в Script Properties/secure runtime config.
7. Model slug runtime-configurable.
8. Structured Outputs используется через `json_schema`.
9. Routing требует endpoint support нужных parameters.
10. Parser различает fact/inference/unknown/conflict.
11. UNKNOWN не заменяется market defaults.
12. Significant facts имеют evidence/provenance.
13. Meaningful missing questions возвращаются.
14. Local deterministic validator является final gate.
15. Price/cost fields parser не создаёт.
16. Layout/BOM/calculation не выполняются.
17. Retry/error behavior bounded.
18. Sensitive input/key не логируются по умолчанию.
19. Mocked local parser/client tests PASS.
20. Stage 6/5/4/3/Human UX regressions PASS.
21. Apps Script syntax/static checks PASS.
22. `git diff --check` PASS.
23. Secrets absent from Git.
24. Controlled clasp sync PASS.
25. Round-trip remote/local PASS.
26. Live OpenRouter text smoke PASS.
27. Live OpenRouter image+text smoke PASS.
28. Live outputs pass local validator.
29. Stage 7 report created.
30. Working tree clean after final commit.
31. Git push not performed.
32. Stage 8 not started.

Если 24–28 ждут user API key/config:

```text
PARTIAL — READY_FOR_OPENROUTER_CHECKPOINT
```

---

## 24. Не делать

Не выполнять:

- Stage 8 calculation orchestration;
- automatic module layout from parser output;
- module-to-parts inference;
- price lookup;
- pricebook publication;
- CURRENT_REPRICE;
- physical Calculations/Offer;
- Web App;
- PDF/XLSX;
- OpenRouter agent loops/tools;
- RAG/vector DB;
- multi-model fallback chain;
- production deployment;
- Git push;
- Stage 8.

---

## 25. Report

Создать:

```text
docs/stage-7-openrouter-parser/stage-7-report.md
```

Минимально:

```markdown
# Stage 7 — Report

## Status

## Project Input schema

## Fact / uncertainty model

## Prompt contract

## OpenRouter client

## Security / config

## Text parsing

## Image parsing

## Local validation

## Error/retry policy

## Tests

## Live OpenRouter verification

## Clasp verification

## Deferred scope

## Git
- branch
- commits
- working tree
- push
```

Не включать API key, auth headers или client personal data.

---

## 26. Git

Перед работой:

```text
git status --short
git branch --show-current
git log -1 --oneline
```

Не делать Git push.

Перед clasp write использовать accepted Stage 6 preflight.

Сделать осмысленные Stage 7 commits.

После Stage 7 остановиться.

Stage 8 не начинать.
