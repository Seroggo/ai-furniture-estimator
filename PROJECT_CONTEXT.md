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

Текущий этап — Stage 6
```

Git baseline после Stage 5:

```text
branch: main
HEAD: 894cf92
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

## Stage 6 — текущая цель

```text
Apps Script baseline + clasp
```

Цель:

```text
локальный Git repository
        ↕
controlled clasp sync
        ↕
существующий bound Apps Script DEV project
```

После Stage 6 локальный Git repository должен стать каноническим source of truth для Apps Script source code.

Stage 6 должен:

- подключить существующий bound Apps Script project, не создавая новый;
- безопасно настроить clasp;
- зафиксировать Apps Script manifest;
- ограничить push только Apps Script source;
- доказать controlled push/pull round-trip без потери Stage 5 functionality;
- исключить credentials/environment config из Git;
- документировать безопасный development workflow.

Подробный контракт:

```text
docs/stage-6-apps-script-baseline/stage-6-context.md
```

Stage 6 НЕ реализует OpenRouter parser, Web App или business runtime следующих этапов.

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
