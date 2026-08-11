# AI Мебельщик — PROJECT_CONTEXT

## 1. Назначение

AI Мебельщик — внутренняя MVP-система предварительного расчёта кухонной мебели.

Первая и единственная категория MVP:

```text
Кухни
```

Базовый принцип:

```text
LLM понимает и структурирует.
Детерминированный код проверяет, конфигурирует и рассчитывает.
Google Sheets хранит расчётные данные и результаты.
```

LLM не является источником цен и не рассчитывает итоговую стоимость.

---

## 2. Каноническая архитектура MVP

```text
Google Drive
├── исходные эталонные файлы
├── файлы клиентских заявок
└── итоговые PDF

Google Sheets №1 — Расчётная база
├── schema / system config
├── module size rules
├── module recipes
├── module recipe items
├── catalog
├── working prices
├── published pricebook versions
├── published prices
├── calculation rules
└── reference values

Apps Script Web App
├── интерфейс менеджера
├── вызов OpenRouter API
├── мультимодальное распознавание
├── валидация конфигурации
├── детерминированный расчёт
└── запись результата

Google Sheets №2 — База КП
├── заявки
├── реестр КП
├── параметры КП
├── позиции КП
├── статусы
└── журнал ошибок

Персональные Google Sheets менеджеров
└── IMPORTRANGE
    → выбор quote_id
    → дашборд КП
    → экспорт PDF
```

Для MVP не используются:

- Supabase;
- Vercel;
- отдельная SQL-база;
- отдельный облачный backend;
- RAG / embeddings / vector DB;
- сложный каскад агентов;
- дополнительные категории мебели.

LLM API:

```text
OpenRouter
```

---

## 3. Канонический план проекта

```text
Этап 0. Репозиторий и Wiki
Этап 1. Аудит исходных файлов
Этап 2. Нормализация эталонов
Этап 3. Расчётная модель
Этап 4. Схема Google Sheets
Этап 5. setupSystem()
Этап 6. Apps Script baseline + clasp
Этап 7. OpenRouter parser
Этап 8. Расчётное ядро
Этап 9. Web App
Этап 10. База КП и персональный дашборд
Этап 11. PDF
Этап 12. Технический E2E
Этап 13. Backtest ±10%
Этап 14. Ограниченный пилот
```

Любой старый сокращённый план считать неканоническим.

---

## 4. Текущее состояние

```text
Этап 0 — ACCEPTED
Этап 1 — ACCEPTED
Этап 2 — ACCEPTED WITH DEBT
Этап 3.1 — ACCEPTED / CLOSED
Этап 3.2 — ACCEPTED / CLOSED
Этап 3.3 — ACCEPTED / CLOSED
Этап 3.4 — ACCEPTED / CLOSED
Этап 3 — CLOSED
Этап 4 — ACCEPTED / CLOSED
Stage 4 Price Patch — ACCEPTED / CLOSED

Следующий этап — 5
```

Git baseline после окончательного Stage 4:

```text
branch: main
HEAD: f075d66
working tree: clean
push: NO
```

---

## 5. Этап 2 — нормализация

Репрезентативные проекты:

```text
P-2024-08-01 — legacy
P-2025-04-01 — basis
P-2026-01-16 — medvedev
```

Нормализованный набор:

```text
3 проекта
25 компонентов
655 позиций
23 исключения
17 364 проверки — PASS
```

Резервные/holdout:

```text
P-2021-08-01
P-2023-07-01
P-2026-05-22
```

---

## 6. Этап 3 — принятый расчётный baseline

### 6.1. Market baseline

Канонический внешний справочник:

```text
source-materials/kitchen-module-reference-comparison.csv
```

Не является собственной размерной сеткой студии.

### 6.2. Studio evidence

Доказаны визуальные ширины:

```text
450
600
900
```

Доказанный функциональный market standard:

```text
600-мм слот ПММ
```

```text
STUDIO_STANDARD = NOT PROVEN
```

### 6.3. Layout configurator

Принятый код:

```text
calculation_model/layout_configurator.py
tests/test_layout_configurator.py
```

Свойства:

```text
hard constraints > optimisation
market baseline читается из canonical CSV
A/B/C → automatic generic candidates
D → специализированная роль или явное разрешение
E → автоматически не используется
filler → отдельная сущность
NO_VALID_LAYOUT → явный результат
произвольные ширины не создаются
```

Угловые / L / U layouts:

```text
NOT_SUPPORTED
```

до появления system-specific профиля.

Принятый отчёт:

```text
docs/stage-3-calculation-model/stage-3.3-report.md
```

### 6.4. Calculation layer

Принятый код:

```text
calculation_model/calculation_engine.py
tests/test_calculation_engine.py
```

Архитектурный принцип:

```text
quantity model × pricebook = cost
```

Количество и цена разделены.

Формализованы подтверждённые quantities/formulas:

```text
area_m2
edge_length_m
explicit source/order quantity
quantity × unit_price
legacy detail aggregation с явно переданными J2/K2
Basis order_qty × price
```

Historical prices используются только как fixtures/evidence и не являются current pricebook.

Принятый отчёт:

```text
docs/stage-3-calculation-model/stage-3.4-report.md
```

Тесты после 3.4:

```text
calculation: 11 / 11 PASS
layout regression: 18 / 18 PASS
total: 29 / 29 PASS
```

---

## 7. Экспертный долг

Не блокирует переход к Этапу 5.

```text
module → parts = REQUIRES_EXPERT
Basis alternative selection = REQUIRES_EXPERT
order coefficients / rounding = REQUIRES_EXPERT
hidden Medvedev logic = REQUIRES_EXPERT / NOT_SUPPORTED
legacy J2/K2 semantics = REQUIRES_EXPERT
```

Будущие production module recipes должны содержать:

- part IDs;
- dimensions/formulas;
- quantities;
- materials;
- edge;
- hardware;
- works.

Synthetic BOM запрещён.

---

## 8. Этап 4 — каноническая схема Google Sheets №1

Stage 4 завершён как локальный data contract.

Реальный Google Sheet ещё не создан.

Принятые schema artifacts:

```text
docs/stage-4-google-sheets/google-sheets-schema.md
docs/stage-4-google-sheets/sheets-columns.csv
docs/stage-4-google-sheets/sheets-relations.csv
docs/stage-4-google-sheets/stage-4-report.md
docs/stage-4-google-sheets/stage-4-price-patch-report.md
```

Итоговая схема после price patch:

```text
11 sheets
136 columns
9 relations
```

Итоговые sheets:

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

---

## 9. Stable IDs

Runtime не должен связывать сущности по display name.

Используются стабильные ASCII-safe IDs/codes, включая:

```text
schema_version_id
config_entry_id
module_rule_id
recipe_id
recipe_item_id
catalog_item_code
working_price_id
pricebook_version_id
price_entry_id
rule_version_id
reference_value_id
```

Логические stable codes:

```text
config_key
price_code
rule_id
reference_code
```

Published IDs immutable.

Display names хранятся отдельно.

---

## 10. Module recipes

Схема поддерживает:

```text
module class / role / variant
→ Module_Recipes
→ Module_Recipe_Items
```

Но production recipes пока не заполнены.

Принятый статус:

```text
MODULE_TO_PARTS_V1 = REQUIRES_EXPERT
```

Fake recipe / placeholder BOM не создаются.

---

## 11. Rule registry

`Calculation_Rules` хранит metadata-контракт правил.

Статусы:

```text
CONFIRMED
DERIVED
PROVISIONAL
REQUIRES_EXPERT
NOT_SUPPORTED
```

Исполняемые formulas остаются в детерминированном коде.

Принятые execution modes:

```text
CODE_BINDING
METADATA_ONLY
BLOCKING_STATUS
```

Произвольный Python / JavaScript / formula code в master-data cells запрещён.

---

## 12. Каноническая ценовая архитектура

После Stage 4 Price Patch принята схема:

```text
spr_price
(mutable working price source)
        ↓
validation / publication
        ↓
Pricebook_Versions
        ↓
Prices
(immutable published calculation truth)
```

### 12.1. `spr_price`

Рабочий лист текущих цен.

Поддерживает режимы:

```text
MANUAL_RUB
FX_AUTO
FX_MANUAL
```

Он используется для:

- ручного ввода текущей цены;
- хранения валютной исходной цены;
- будущего FX preview;
- подготовки новой версии pricebook.

`spr_price` не является расчётной истиной зафиксированного КП.

### 12.2. GOOGLEFINANCE

На текущем этапе не реализован.

Принята policy:

```text
GOOGLEFINANCE
→ допустим как future working FX preview source
→ НЕ является прямой зависимостью официального расчёта или КП
```

Нельзя допускать:

```text
Quote
→ volatile GOOGLEFINANCE
→ total меняется автоматически
```

### 12.3. Публикация цены

Будущий publish flow:

```text
spr_price mutable state
→ validation
→ new Pricebook_Versions row
→ new immutable Prices rows
```

Pricebook lifecycle:

```text
DRAFT → ACTIVE → RETIRED
```

Effective periods:

```text
[effective_from, effective_to)
```

Published snapshots immutable.

Новая цена создаёт новую version.

Старые цены не перезаписываются.

### 12.4. Published price provenance

`Prices` должна сохранять минимум:

```text
unit_price
currency
price_code
pricebook_version_id

source_currency
source_price
fx_rate_used
fx_rate_source
price_derivation_mode
provenance
```

Для `MANUAL_RUB`:

```text
source_currency = RUB
source_price = unit_price
fx_rate_used = 1
fx_rate_source = NOT_APPLICABLE
```

---

## 13. ORIGINAL / CURRENT_REPRICE

Будущая База КП должна поддерживать два режима:

```text
ORIGINAL
CURRENT_REPRICE
```

### ORIGINAL

Использует:

```text
исходный quantity / calculation snapshot
+
зафиксированный pricebook_version_id
```

Цель:

```text
воспроизвести стоимость на момент исходного расчёта
```

### CURRENT_REPRICE

Использует:

```text
тот же quantity / calculation snapshot
+
latest applicable ACTIVE pricebook
```

Ключевое правило:

```text
CURRENT_REPRICE
≠ новый layout
≠ новый BOM
≠ новый quantity calculation
```

Это только repricing уже рассчитанного изделия.

`CURRENT_REPRICE` не читает `spr_price` или `GOOGLEFINANCE` напрямую.

---

## 14. Минимальный будущий quote snapshot contract

Stage 4 не проектирует полноценный Google Sheets №2.

Принят только минимальный контракт:

```text
quote_id
project_id
calculation_model_version
schema_version_id
pricebook_version_id
rule_version_snapshot_json
input_snapshot_json
result_snapshot_json
total
currency
created_at
```

На будущих этапах этот контракт может быть расширен без изменения расчётного baseline.

---

## 15. Проверки Stage 4

После price patch:

```text
schema:
11 sheets
136 columns
9 relations

schema validator tests:
20 / 20 PASS

Stage 3 calculation regression:
11 / 11 PASS

Stage 3 layout regression:
18 / 18 PASS

full suite:
49 / 49 PASS

py_compile:
PASS

git diff --check:
PASS

source-materials:
unchanged

stages/02-normalization:
unchanged
```

---

## 16. Текущий этап — 5

Следующий этап:

```text
Этап 5. setupSystem()
```

Цель:

```text
принятый Stage 4 data contract
        ↓
Apps Script setupSystem()
        ↓
физическое создание Google Sheets №1
```

Именно на Этапе 5 разрешается начинать реальную Google Sheets / Apps Script интеграцию.

Stage 5 должен использовать принятые machine-readable schema artifacts Stage 4 как источник структуры, а не заново проектировать workbook.

Stage 5 не должен менять архитектуру Stage 4 без отдельной эскалации Штабу.

---

## 17. Постоянные правила реализации

Использовать:

```text
AI_FURNITURE_EXECUTION.md
```

Режим по умолчанию:

```text
NORMAL
```

Контекстная иерархия:

```text
AI_FURNITURE_EXECUTION.md
→ как Codex работает

PROJECT_CONTEXT.md
→ общий accepted baseline

stage-X-context.md
→ контракт текущего этапа

stage-X-report.md
→ фактический итог этапа

код / CSV / tests
→ канонические технические данные
```

Промт Codex должен ссылаться на локальные файлы и не дублировать весь контекст.
