# AI Мебельщик — PROJECT_CONTEXT

## Статус

```text
Stage 0 — ACCEPTED
Stage 1 — ACCEPTED
Stage 2 — ACCEPTED WITH DEBT
Stage 3 — ACCEPTED / CLOSED
Stage 4 — ACCEPTED / CLOSED
Stage 4 Price Patch — ACCEPTED / CLOSED
Stage 5 — ACCEPTED / CLOSED
Stage 6 — ACCEPTED / CLOSED

Stage 7 — NOT STARTED
```

Git baseline после Stage 6:

```text
branch: main
HEAD: final Stage 6 commit (see git log)
working tree: clean
push: NO
```

## Канонический план

```text
0. Репозиторий и Wiki
1. Аудит исходных файлов
2. Нормализация эталонов
3. Расчётная модель
4. Схема Google Sheets
5. setupSystem()
6. Apps Script baseline + clasp
7. OpenRouter parser
8. Расчётное ядро
9. Web App
10. База КП и персональный дашборд
11. PDF
12. Технический E2E
13. Backtest ±10%
14. Ограниченный пилот
```

## Accepted calculation baseline

```text
calculation_model/layout_configurator.py
calculation_model/calculation_engine.py
```

Принципы:

```text
hard constraints > optimisation
quantity model × pricebook = cost
historical prices = fixtures/evidence only
MODULE_TO_PARTS_V1 = REQUIRES_EXPERT
synthetic BOM forbidden
```

## Accepted Google Sheets schema

```text
11 sheets
136 columns
9 relations
```

Sheets:

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

Source of truth:

```text
docs/stage-4-google-sheets/sheets-columns.csv
docs/stage-4-google-sheets/sheets-relations.csv
```

## Accepted pricing architecture

```text
spr_price
(mutable working source)
        ↓
validation / publication
        ↓
Pricebook_Versions
        ↓
Prices
(immutable published truth)
```

Pricing modes:

```text
MANUAL_RUB
FX_AUTO
FX_MANUAL
```

`GOOGLEFINANCE` — только future working FX preview source.
Официальный расчёт/КП не зависит напрямую от volatile `spr_price`/FX preview.

Future quote modes:

```text
ORIGINAL
CURRENT_REPRICE
```

`CURRENT_REPRICE` использует тот же quantity/calculation snapshot и новую ACTIVE pricebook version; новый layout/BOM/quantity calculation не выполняется.

## Stage 5 — accepted physical DEV workbook

Dedicated workbook:

```text
AI Furniture Calculation Base — DEV
locale: ru_RU
time zone: Asia/Yekaterinburg
```

Pipeline:

```text
sheets-columns.csv + sheets-relations.csv
        ↓
tools/generate_setup_schema.py
        ↓
apps-script/generated/schema_manifest.gs
        ↓
apps-script/setup_system.gs :: setupSystem()
```

Final verification:

```text
11 canonical sheets — PASS
136 exact headers — PASS
canonical order — PASS
11/11 frozen headers — PASS
66 strict validations — PASS
expected formats — PASS
Schema_Meta — PASS
79 unique Reference_Values seeds — PASS
MODULE_TO_PARTS_V1 = REQUIRES_EXPERT — PASS
production data absent — PASS
first setup run — PASS
second/idempotency run — PASS
60 / 60 tests — PASS
```

Locale regression исправлен: integer validations используют separator-free custom formulas и работают на `ru_RU`.

Accepted reports:

```text
docs/stage-5-setup-system/stage-5-report.md
docs/stage-5-setup-system/stage-5-google-verification.md
```

## Stage 6 — accepted Apps Script baseline

```text
Apps Script baseline + clasp
```

Accepted flow:

```text
локальный Git repository
        ↕
controlled clasp sync
        ↕
существующий bound Apps Script DEV project
```

Локальный Git repository является canonical source of truth для Apps Script
source code. Remote bound Apps Script project является DEV execution/debug
target.

Final verification:

```text
existing bound DEV project — PASS
new project creation — NO
@google/clasp 3.3.0 exact-pinned — PASS
remote-derived appsscript.json — PASS
exact three-file push scope — PASS
pre-push remote snapshot/diff — PASS
first controlled push — PASS
round-trip equivalence — PASS
unknown remote files — 0
post-sync setupSystem() — PASS
11 sheets / 136 headers — PASS
66 strict validations — PASS
79 unique Reference_Values — PASS
Stage 5/4/3 regression tests — PASS
secrets in Git — NONE
```

Подробный контракт:

```text
docs/stage-6-apps-script-baseline/stage-6-context.md
docs/stage-6-apps-script-baseline/stage-6-report.md
docs/stage-6-apps-script-baseline/apps-script-development.md
```

Stage 7 не начат. OpenRouter parser, Web App и business runtime следующих этапов
не реализовывались.

## Контекстная иерархия

```text
AI_FURNITURE_EXECUTION.md
→ HOW Codex works

PROJECT_CONTEXT.md
→ accepted project baseline

stage-X-context.md
→ current stage contract

accepted reports / code / CSV / tests
→ factual technical baseline
```

Режим по умолчанию:

```text
NORMAL
```

Git push не выполнять без отдельного разрешения.
