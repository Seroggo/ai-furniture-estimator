# Этап 4 — Отчёт

## Статус

```text
COMPLETE
```

## Итоговая схема

Спроектирован локальный канонический data contract Google Sheets №1 —
«Расчётная база». Реальный Google Sheet не создан.

Итоговые sheets:

```text
Schema_Meta
System_Config
Module_Size_Rules
Module_Recipes
Module_Recipe_Items
Catalog_Items
Pricebook_Versions
Prices
Calculation_Rules
Reference_Values
```

Machine-readable contract содержит 114 колонок и 7 явных relations:

```text
docs/stage-4-google-sheets/sheets-columns.csv
docs/stage-4-google-sheets/sheets-relations.csv
```

Полная семантика, policies и ownership:

```text
docs/stage-4-google-sheets/google-sheets-schema.md
```

## Ключевые архитектурные решения

- Схема продолжает Stage 3, не создавая вторую доменную модель:
  `LayoutItem -> ModuleRecipe -> CalculationItem x PriceInput -> CostResult`.
- Runtime entities остаются типизированными моделями детерминированного кода.
  Sheet №1 хранит master-data dependencies; runtime input/results входят только в
  минимальный snapshot contract будущей Базы КП.
- Материалы, кромка, фурнитура, работы и услуги объединены в `Catalog_Items` через
  `catalog_item_type`, без отдельных дублирующих catalogs.
- Исполняемые formulas остаются в коде. `Calculation_Rules.execution_mode`
  различает `CODE_BINDING`, `METADATA_ONLY` и `BLOCKING_STATUS`; произвольный код в
  cells запрещён.
- `Schema_Meta` фиксирует версию структуры и runtime compatibility, чтобы Stage 5
  мог детерминированно создать workbook.

Accepted архитектура и код Stage 3 не изменялись.

## Sheets и ownership

- `System_Config`, `Module_Size_Rules`, `Catalog_Items`, `Reference_Values` —
  утверждённые master data; пишет только соответствующий admin/import workflow,
  runtime читает.
- `Module_Recipes` и `Module_Recipe_Items` — furniture-expert approved data; до
  приёмки пусты.
- `Pricebook_Versions` и `Prices` — pricing-admin owned immutable snapshots.
- `Calculation_Rules` — controlled schema/code release; ручная правка исполняемой
  логики запрещена.
- `Schema_Meta` — schema/setup release owned.

Ручное редактирование разрешено только для DRAFT rows. Published/ACTIVE rows
append-only; изменение создаёт новую версию.

## IDs и связи

Для каждого entity sheet есть unique ASCII-safe stable row ID/code:

```text
schema_version_id
config_entry_id
module_rule_id
recipe_id
recipe_item_id
catalog_item_code
pricebook_version_id
price_entry_id
rule_version_id
reference_value_id
```

Логические `config_key`, `price_code`, `rule_id`, `reference_code` сохраняются между
версиями. Display names отделены и не являются relation keys. Accepted IDs вроде
`MKT-030` и `QTY_AREA_MM_V1` сохраняются.

Relations покрывают recipe -> items -> catalog/rule/price code и
pricebook version -> prices -> catalog/price code. Orphan detection и uniqueness
формализованы.

## Versioning / pricebook

Quantity и prices физически разделены:

```text
Module_Recipe_Items(quantity rule + params + unit + price_code)
x
Prices(unit_price + unit + currency + price_code + pricebook_version_id)
= runtime CostResult
```

Pricebook policy:

- immutable version snapshot;
- lifecycle `DRAFT -> ACTIVE -> RETIRED`;
- half-open effective periods `[effective_from, effective_to)`;
- не более одной applicable ACTIVE version на `(pricebook_code, currency, time)`;
- отсутствие overlap;
- точный `pricebook_version_id` сохраняется в quote snapshot;
- новая цена создаёт новую version, старые rows не перезаписываются.

Historical prices Stage 2/3 остаются `historical_fixture`. Они не импортируются в
production pricebook, а неподтверждённые currency/effective dates не изобретаются.

Rule policy аналогично сохраняет стабильный `rule_id`, immutable
`rule_version_id`, integer version и effective period. Статусы Stage 3 сохранены:
`CONFIRMED`, `DERIVED`, `PROVISIONAL`, `REQUIRES_EXPERT`, `NOT_SUPPORTED`.

## Module recipes / expert debt

Контракт `module class + role + variant -> recipe -> recipe items` предусмотрен.
Production recipe rows не созданы.

```text
MODULE_TO_PARTS_V1 = REQUIRES_EXPERT
```

выражается в `Calculation_Rules` как blocking status. Relation recipe -> items
допускает zero items, поэтому fake BOM/placeholder recipe для выражения долга не
нужны. `quantity_params_json` в будущих accepted rows хранит только типизированные
inputs quantity rule, а не исполняемый код.

## Validation

Column contract формализует required/unique/type/enum/default/reference и
семантические validations. Relation contract формализует foreign keys,
cardinality и orphan policy. Отдельно описаны checks effective periods, composite
business keys, unit compatibility, immutable publication, JSON и stable IDs.

Минимальный validator:

```text
tools/validate_sheets_schema.py
```

Он обнаруживает duplicate columns/orders, missing schema fields, invalid types и
booleans, broken/non-unique reference targets, broken relation columns, unknown
cardinality, missing relation declarations и отсутствие stable key.

## Quote snapshot contract

Полноценная Google Sheets №2 не проектировалась. Зафиксирован только минимальный
future output contract:

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

CRM/status workflow, dashboard, IMPORTRANGE, PDF и user permissions не затронуты.

## Проверки и тесты

```text
python tools/validate_sheets_schema.py
-> VALID: 10 sheets, 114 columns

schema validator tests: 13 / 13 PASS
Stage 3 calculation regression: 11 / 11 PASS
Stage 3 layout regression: 18 / 18 PASS
full suite: 42 / 42 PASS
py_compile: PASS
git diff --check: PASS
source-materials diff: отсутствует
stages/02-normalization diff: отсутствует
```

## Ограничения / открытые вопросы

Блокеров Stage 4 нет. Сохранён принятый expert debt:

- production module recipes требуют повторяемого evidence и экспертной приёмки;
- Basis alternative selection, order coefficients/rounding, hidden Medvedev logic
  и legacy J2/K2 semantics не формализованы;
- production catalog и current pricebook не наполнены;
- row-level Google Sheets validations и setup относятся к будущим этапам.

Google API, Apps Script, `setupSystem()`, clasp и Stage 5 не начинались.

## Git

- branch: `main`
- baseline: `3dd047b`
- context contract: `200167e`
- schema/validator/tests: `1cd55e1`
- report: финальный docs commit Stage 4
- working tree: clean после финального commit
- push: NO

