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
```

LLM не является источником цен, не рассчитывает стоимость, не выполняет layout,
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

Текущий этап — Stage 8
```

Expected Git baseline:

```text
branch: main
HEAD: ff5560a
working tree: clean
Git push: NO
```

Всегда проверить фактический Git state перед работой.

## 4. Accepted calculation baseline

### Layout reference

```text
calculation_model/layout_configurator.py
tests/test_layout_configurator.py
```

Accepted semantics:

```text
hard constraints > optimisation
A/B/C → automatic generic candidates
D → specialized / explicit only
E → not automatic
filler → separate entity
NO_VALID_LAYOUT → explicit
arbitrary custom widths → forbidden
STUDIO_STANDARD → not proven
L/U/corners → NOT_SUPPORTED without system-specific profile
```

### Quantity / cost reference

```text
calculation_model/calculation_engine.py
tests/test_calculation_engine.py
```

Principle:

```text
quantity model × published pricebook = cost
```

Historical prices are fixtures/evidence only.

Open expert debt:

```text
MODULE_TO_PARTS_V1 = REQUIRES_EXPERT
Basis alternative selection = REQUIRES_EXPERT
order coefficients / rounding = REQUIRES_EXPERT
hidden Medvedev logic = REQUIRES_EXPERT / NOT_SUPPORTED
legacy J2/K2 semantics = REQUIRES_EXPERT
```

Synthetic BOM is forbidden.

## 5. Accepted Google Sheets baseline

Technical contract:

```text
11 technical sheets
136 technical columns
9 relations
```

Technical sheets:

```text
Schema_Meta
System_Config
Module_Size_Rules
Module_Recipes
Module_Recipe_Items
Catalog_Items
spr_price
Pricebook_Versions
Prices
Calculation_Rules
Reference_Values
```

Canonical structure:

```text
docs/stage-4-google-sheets/sheets-columns.csv
docs/stage-4-google-sheets/sheets-relations.csv
docs/stage-4-google-sheets/google-sheets-schema.md
```

Physical DEV workbook:

```text
Custom_Price + 11 technical sheets = 12 sheets
```

Accepted real DEV data state before Stage 8:

```text
Module_Size_Rules      → no runtime rules imported yet
Module_Recipes         → empty
Module_Recipe_Items    → empty
Catalog_Items          → no production catalog
Pricebook_Versions     → no automatic publication
Prices                 → no automatic publication
Calculation_Rules      → MODULE_TO_PARTS_V1 blocking seed exists
```

Historical fixtures must not become production master data implicitly.

## 6. Accepted pricing architecture

```text
Custom_Price
→ explicit sync
→ Catalog_Items + spr_price
→ explicit future publication
→ Pricebook_Versions + Prices
→ official calculation
```

Official calculation MUST NOT read `Custom_Price`, `spr_price` or `GOOGLEFINANCE`
directly.

`CURRENT_REPRICE` remains Stage 10+ behavior and is not Stage 8 scope.

## 7. Accepted Stage 7 parser baseline

Stage 7 is COMPLETE.

```text
free text + optional images
→ OpenRouter
→ strict generated transport schema
→ canonical deterministic validator
→ Project Input JSON
```

Canonical files:

```text
docs/stage-7-openrouter-parser/project-input.schema.json
docs/stage-7-openrouter-parser/parser-contract.md
docs/stage-7-openrouter-parser/stage-7-report.md
```

Accepted schema:

```text
project-input-v1
project_type = KITCHEN
```

Fact states:

```text
KNOWN
INFERRED
UNKNOWN
CONFLICT
NOT_APPLICABLE
```

Policy:

```text
UNKNOWN ≠ default
INFERRED ≠ confirmed
CONFLICT ≠ silent choice
```

Live Stage 7 verification:

```text
model: openai/gpt-5.6-luna
text: HTTP 200 / PASS
image+text: HTTP 200 / PASS
schema / metadata / evidence: PASS
```

Stage 8 consumes already validated Project Input JSON and MUST NOT call OpenRouter again.

## 8. Stage 8 — deterministic calculation kernel

Target:

```text
validated Project Input JSON
→ input readiness / confirmation gate
→ ProjectInput → LayoutRequest adapter
→ deterministic layout kernel
→ recipe resolver
→ quantity engine
→ published pricebook resolver
→ cost engine
→ Calculation Result
```

Detailed contract:

```text
docs/stage-8-calculation-kernel/stage-8-context.md
```

Stage 8 returns a result in runtime memory. Stage 10 owns quote persistence/dashboard.

## 9. Stage 8 critical policies

Hard input policy:

```text
KNOWN → usable
INFERRED → not silently confirmed
UNKNOWN → blocker if required
CONFLICT → blocker
NOT_APPLICABLE → only where semantically valid
```

Python Stage 3 is the reference behavior. Apps Script must prove parity.

Money/quantity arithmetic must avoid uncontrolled binary floating-point drift.

Runtime relations use stable IDs/codes, never display names.

Missing approved module recipe remains:

```text
REQUIRES_EXPERT
```

No synthetic BOM.

Official cost uses only immutable published pricebook rows.

## 10. Stage 8 output

Stage 8 creates one versioned Calculation Result contract suitable for future Stage 10
snapshotting. It must preserve versions/provenance, blockers/warnings, layout snapshot,
calculation items, cost results, pricebook version and total/currency when calculable.

No physical `Calculations` or `Offer` sheet is created on Stage 8.

## 11. Apps Script / clasp

Local Git remains source of truth.

Target:

```text
existing bound DEV Apps Script project
AI Furniture Calculation Base — DEV
```

Workflow:

```text
local implementation
→ tests
→ clean Git
→ fresh remote preflight
→ controlled clasp push
→ round-trip verification
→ manual/controlled DEV smoke if needed
```

No new Apps Script project or deployment.

## 12. Context hierarchy

```text
AI_FURNITURE_EXECUTION.md
→ HOW Codex works

PROJECT_CONTEXT.md
→ accepted project baseline

docs/stage-8-calculation-kernel/stage-8-context.md
→ current Stage 8 contract

accepted reports/schema/code/tests
→ factual technical source
```

Git push remains forbidden unless separately authorized.
