# AI Мебельщик — PROJECT_CONTEXT

## 1. Назначение

AI Мебельщик — MVP-система предварительного расчёта кухонной мебели.

Единственная категория MVP:

```text
KITCHEN / Кухни
```

Базовый принцип:

```text
LLM понимает и структурирует вход.
Детерминированный код проверяет, конфигурирует и рассчитывает.
Google Sheets хранит master data, рабочие цены и опубликованные расчётные данные.
Apps Script Web App даёт менеджеру human-first интерфейс к этому контуру.
```

LLM не является источником цен, не рассчитывает итоговую стоимость, не выполняет layout,
не создаёт BOM/module recipes и не заменяет deterministic validation/calculation.

## 2. Канонический план

```text
0. Репозиторий и Wiki
1. Аудит исходных файлов
2. Нормализация эталонов
3. Расчётная модель
4. Схема Google Sheets
5. setupSystem()
6. Apps Script baseline + clasp
Human UX Patch
7. OpenRouter parser
8. Расчётное ядро
9. Web App
10. База КП и персональный дашборд
11. PDF
12. Технический E2E
13. Backtest ±10%
14. Ограниченный пилот
```

## 3. Статус

```text
Stage 0 — ACCEPTED
Stage 1 — ACCEPTED
Stage 2 — ACCEPTED WITH DEBT
Stage 3 — ACCEPTED / CLOSED
Stage 4 — ACCEPTED / CLOSED
Stage 4 Price Patch — ACCEPTED / CLOSED
Stage 5 — ACCEPTED / CLOSED
Stage 6 — ACCEPTED / CLOSED
Human UX Patch — ACCEPTED / CLOSED
Stage 7 — ACCEPTED / CLOSED
Stage 8 — ACCEPTED / CLOSED

Текущий этап — Stage 9
```

Expected Git baseline перед Stage 9 context commit:

```text
branch: main
HEAD: 4038225
working tree: clean
Git push: NO
```

Перед любой работой проверить фактический Git state.

## 4. Accepted Stage 7 parser baseline

```text
free Russian text + optional images
→ OpenRouter
→ generated strict transport schema
→ canonical deterministic validation
→ project-input-v1
```

Canonical files:

```text
docs/stage-7-openrouter-parser/project-input.schema.json
docs/stage-7-openrouter-parser/parser-contract.md
docs/stage-7-openrouter-parser/stage-7-report.md
```

Accepted runtime:

```text
OPENROUTER_MODEL = openai/gpt-5.6-luna
text live smoke = HTTP 200 / PASS
image+text live smoke = HTTP 200 / PASS
```

Fact states:

```text
KNOWN
INFERRED
UNKNOWN
CONFLICT
NOT_APPLICABLE
```

Secrets remain server-side in Script Properties.

## 5. Accepted Stage 8 calculation baseline

Stage 8 is ACCEPTED / CLOSED.

```text
validated project-input-v1
→ readiness / confirmation gate
→ exact ProjectInput → LayoutRequest adapter
→ Module_Size_Rules-backed deterministic layout
→ approved recipe resolver
→ exact quantity engine
→ published Pricebook_Versions + Prices
→ exact cost engine
→ calculation-result-v1
```

Canonical files:

```text
docs/stage-8-calculation-kernel/calculation-result.schema.json
docs/stage-8-calculation-kernel/calculation-contract.md
docs/stage-8-calculation-kernel/stage-8-report.md
```

Accepted status model:

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

Final result-contract rules:

```text
DecimalString = canonical exact decimal
SUCCESS = no blockers + completed result fields
non-SUCCESS business status = at least one blocker
```

No implicit currency rounding. No IEEE-754 accumulation for business decimals.

## 6. Accepted Stage 8 master-data reality

Accepted live DEV state:

```text
managed Module_Size_Rules: 59
sync idempotent: true
layout: works
production Module_Recipes: absent
production price rows created by Stage 8: 0
synthetic BOM: 0
OpenRouter calls from Stage 8: 0
real DEV calculation result: REQUIRES_EXPERT
```

`REQUIRES_EXPERT` is correct behavior until expert-approved recipes exist.

Do not fabricate production recipes/catalog/prices to make the Web App look successful.

## 7. Accepted pricing architecture

```text
Custom_Price
→ explicit sync
→ Catalog_Items + spr_price
→ explicit future publication
→ Pricebook_Versions + Prices
→ official calculation
```

Stage 9 UI MUST NOT use `Custom_Price`, `spr_price` or `GOOGLEFINANCE` as calculation truth.

Stage 9 does not implement price publication. `CURRENT_REPRICE` remains Stage 10+.

## 8. Stage 9 — manager Web App

Stage 9 adds the first human-facing runtime interface.

```text
manager
→ text + optional images
→ Web App server boundary
→ Stage 7 parser
→ validated Project Input
→ Stage 8 calculation kernel
→ human-readable result / questions / blockers
```

Detailed contract:

```text
docs/stage-9-web-app/stage-9-context.md
```

The Web App is an internal manager tool for MVP, not a public client portal.

## 9. Stage 9 UX principle

The manager should be able to:

```text
1. describe a kitchen in free Russian text;
2. optionally attach supported images;
3. submit;
4. see what the system understood;
5. see missing questions / blockers;
6. see calculation status and human-readable result;
7. correct/expand the original input and resubmit.
```

Do not expose technical complexity by default.

## 10. Stage 9 session/persistence boundary

Stage 9 has no quote database.

```text
browser form state
→ submit
→ server runtime
→ response
```

No automatic persistence of client request, images, Project Input JSON, Calculation Result,
quote or offer. Stage 10 owns durable calculation/quote records.

## 11. Stage 9 security boundary

Secrets remain server-side:

```text
OPENROUTER_API_KEY
OPENROUTER_MODEL
```

Browser code must never receive API key, Authorization headers, raw provider response,
base64 after processing, or internal stack traces.

User/model-derived text must be rendered safely. Do not inject untrusted content through
`innerHTML`.

No third-party frontend framework/CDN is required for MVP.

Deployment must remain restricted for DEV verification; do not publish an anonymous
public Web App during Stage 9 acceptance.

## 12. Stage 9 error model

Human UI must distinguish:

```text
input/parser problem
needs clarification
not supported
no layout
requires expert
price/master-data problem
system/internal error
```

Business blockers must not become generic system errors.

## 13. Stage 9 deployment baseline

Target remains the existing bound DEV Apps Script project:

```text
AI Furniture Calculation Base — DEV
```

Stage 9 may use an Apps Script Web App test deployment (`/dev`) for acceptance.

Do not create a public anonymous production deployment.

## 14. Apps Script / clasp workflow

Use accepted Stage 6 controlled workflow:

```text
local implementation
→ tests
→ generated/static checks
→ fresh remote preflight
→ exact allowlist
→ normal controlled clasp push
→ isolated round-trip
→ manual Web App DEV verification
```

Unknown remote files remain a stop condition.

Git push remains forbidden unless separately authorized.

## 15. Stage 9 output principle

Stage 9 introduces UI/orchestration only.

It MUST reuse Stage 7 parser contract and Stage 8 calculation contract.

The browser-facing response may have a small versioned view-model contract, but canonical
Project Input and Calculation Result remain their existing contracts.

## 16. Deferred scope

Not Stage 9:

```text
physical Calculations sheet
physical Offer sheet
quote registry/database
manager calculation history
CURRENT_REPRICE
PDF
XLSX
CRM
public client portal
custom authentication system
Stage 10+
```

## 17. Context hierarchy

```text
AI_FURNITURE_EXECUTION.md
→ HOW Codex works

PROJECT_CONTEXT.md
→ accepted project baseline

docs/stage-9-web-app/stage-9-context.md
→ current Stage 9 contract

accepted Stage 7/8 contracts/reports/code/tests
→ technical source of truth
```

Stage 10 must not start without HQ acceptance.
