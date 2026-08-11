# Google Sheets №1 — каноническая схема расчётной базы

## 1. Назначение и границы

Этот документ задаёт data contract для будущего `setupSystem()`. Он не создаёт
Google Sheet, Apps Script или production master data.

Схема продолжает принятую модель Stage 3:

```text
LayoutItem
  -> ModuleRecipe (пока REQUIRES_EXPERT)
  -> CalculationItem(quantity, unit, price_code, quantity_rule_id)
  x  PriceInput(price_code, unit_price, unit, price context)
  -> CostResult
```

`LayoutItem`, `CalculationItem`, `PriceInput` и `CostResult` являются runtime-
моделями детерминированного кода. Расчётная база хранит их master-data зависимости,
но не дублирует runtime строки и не проектирует полноценную Базу КП.

## 2. Итоговый набор sheets

| Sheet | Назначение | Начальное содержимое |
|---|---|---|
| `System_Config` | Версионируемые параметры системы, не являющиеся исполняемым кодом | только явно принятые параметры |
| `Module_Size_Rules` | Размерные правила модулей и слотов с provenance | импорт только из явно принятого источника |
| `Module_Recipes` | Заголовки будущих рецептов по class/role/variant | пусто до экспертной приёмки |
| `Module_Recipe_Items` | Строки quantity model будущего рецепта | пусто; synthetic BOM запрещён |
| `Catalog_Items` | Общий каталог материалов, кромки, фурнитуры и работ | только production-approved master data |
| `spr_price` | Редактируемый рабочий источник актуальных цен до публикации | пусто до production price population |
| `Pricebook_Versions` | Неизменяемые версии pricebook и effective periods | historical fixtures не импортируются |
| `Prices` | Цены внутри версии pricebook | пусто до production price population |
| `Calculation_Rules` | Реестр metadata-контрактов правил и их версий | Stage 3 rules могут быть перенесены с теми же IDs/statuses |
| `Reference_Values` | Управляемые enum/reference values | системные enum values |
| `Schema_Meta` | Версия этой структуры и совместимость setup/runtime | одна активная schema version после Stage 5 |

Это минимальный набор: каталоги объединены одним discriminator `catalog_item_type`,
а отдельные sheets для материалов/работ не создаются. Runtime results не смешиваются
с master data.

## 3. Stable ID policy

- Все relation keys ASCII-safe и не зависят от display name.
- Published IDs/codes immutable. Переименование меняет только `display_name`.
- Row identity: `config_entry_id`, `module_rule_id`, `recipe_id`,
  `recipe_item_id`, `catalog_item_code`, `working_price_id`, `pricebook_version_id`,
  `price_entry_id`, `rule_version_id`, `reference_value_id`, `schema_version_id`.
- Логические стабильные коды, переживающие версии: `config_key`, `price_code`,
  `rule_id`, `reference_code`.
- Формат нового ID: `^[A-Za-z][A-Za-z0-9_.:-]{0,127}$`. Существующие accepted
  IDs (`MKT-030`, `QTY_AREA_MM_V1`) сохраняются, а не генерируются заново.
- Уникальность составных business keys (`pricebook_version_id + price_code`,
  `rule_id + version`, `reference_set + reference_code`) проверяется отдельно от
  row identity.

## 4. Quantity model и pricebook

`Module_Recipe_Items` хранит только quantity contract: catalog item, unit,
quantity rule и параметры правила. В нём нет `unit_price` или currency.

`Prices` хранит только price input для `price_code` и `catalog_item_code` в
конкретной `Pricebook_Versions`. В нём нет dimensions, quantity или BOM logic.

Runtime обязан соединять их по `price_code`, дополнительно проверяя совпадение
`unit`, как это делает `calculation_engine.calculate_cost()`.

Historical values из `stages/02-normalization` имеют контекст
`historical_fixture` и не являются допустимым источником автоматического наполнения
`Pricebook_Versions`/`Prices`.

### 4.1. Working prices и publication boundary

Ценовые роли физически разделены:

```text
spr_price (mutable working current prices)
  -> publication validation
  -> new Pricebook_Versions row
  -> new immutable Prices rows
  -> official calculation / quote reprice
```

`spr_price` — source of truth только для текущих рабочих price inputs и human
preview. Он не является расчётной истиной зафиксированного КП. Его input fields
может редактировать pricing manager/admin; будущий setup может управлять только
явно определёнными preview/formula fields. Publication workflow читает только
полные `READY` rows и создаёт новый snapshot, не изменяя опубликованные строки.

Одна строка `spr_price` имеет immutable row identity `working_price_id` и один
уникальный стабильный `price_code`, связанный с `Catalog_Items`. `display_name`
никогда не является ключом. `unit` совпадает с catalog/default unit либо использует
отдельно принятую conversion rule.

Поддерживаемые contracts:

- `MANUAL_RUB`: `current_price_rub` вводится вручную; FX-only inputs пусты;
- `FX_AUTO`: обязательны `source_currency`, `source_price`, `fx_rate_current` и
  выбранный `fx_rate_used_preview`; `fx_rate_manual` пуст;
- `FX_MANUAL`: обязательны `source_currency`, `source_price`, `fx_rate_manual` и
  равный ему `fx_rate_used_preview`.

Для FX modes `current_price_rub = source_price * fx_rate_used_preview`.
`current_price_rub`, `fx_rate_current` и `fx_rate_used_preview` являются mutable
preview values, а не опубликованными фактами.

`GOOGLEFINANCE` сейчас не реализован. На Stage 5 он может стать setup-managed
источником только `fx_rate_current` для рабочего preview; formula strings не
хранятся как произвольный исполняемый код в master-data cells. Запрещена прямая
цепочка `Quote -> volatile GOOGLEFINANCE -> total`. Разрешён только snapshot flow:

```text
source price + working FX preview
  -> current_price_rub
  -> publish
  -> fixed unit_price + fixed FX/source provenance
```

При публикации `Prices` фиксирует `unit_price`, `currency`, `source_currency`,
`source_price`, `fx_rate_used`, `fx_rate_source` и `price_derivation_mode`. Для
`MANUAL_RUB`: `source_currency=RUB`, `source_price=unit_price`, `fx_rate_used=1`,
`fx_rate_source=NOT_APPLICABLE`. Для валютных modes значения копируются из
прошедшего validation рабочего состояния. Поэтому published price объясним и не
зависит после публикации от дальнейших правок `spr_price` или FX preview.

## 5. Pricebook version/effective-period policy

1. `pricebook_version_id` обозначает immutable published snapshot.
2. Lifecycle: `DRAFT -> ACTIVE -> RETIRED`; `DRAFT` не используется runtime.
3. В один момент для `(pricebook_code, currency)` допустима не более чем одна
   `ACTIVE` версия; её `[effective_from, effective_to)` не пересекается с другой
   published версией того же pricebook.
4. `effective_to` nullable и означает open-ended period; пустая строка не означает
   unknown.
5. После публикации строки версии и её `Prices` не перезаписываются. Новая цена
   создаёт новую version и новые `price_entry_id`.
6. Расчёт фиксирует точный `pricebook_version_id`; выбор версии выполняется по
   calculation timestamp/effective period до вычисления cost.
7. `price_code` стабилен между версиями. Внутри версии он уникален и unit обязан
   совпадать с `Catalog_Items.default_unit` либо иметь явно принятую conversion rule.

## 6. Rule version/effective-period policy

`rule_id` — стабильная логическая ссылка Stage 3. Изменение контракта создаёт новый
`rule_version_id` и увеличивает integer `version`, не перезаписывая published row.
Периоды `[effective_from, effective_to)` версий одного `rule_id` не пересекаются.

`execution_mode` разделяет данные и код:

- `CODE_BINDING`: формула выполняется в детерминированном коде; sheet хранит inputs,
  outputs, status, provenance и `implementation_ref`, но не произвольный код;
- `METADATA_ONLY`: справочное/ограничивающее правило без исполняемой формулы;
- `BLOCKING_STATUS`: `REQUIRES_EXPERT`/`NOT_SUPPORTED`; runtime останавливает переход,
  указанный контрактом.

Произвольные формулы, JavaScript или Python в cells запрещены. Stage 3 rule statuses
сохраняются без повышения: `CONFIRMED`, `DERIVED`, `PROVISIONAL`,
`REQUIRES_EXPERT`, `NOT_SUPPORTED`.

## 7. Module recipes и expert debt

Связь имеет форму:

```text
module_class + module_role + variant_code
  -> Module_Recipes.recipe_id
  -> zero or more Module_Recipe_Items
```

Нулевая мощность items разрешена, поэтому `MODULE_TO_PARTS_V1 = REQUIRES_EXPERT`
выражается в `Calculation_Rules` без fake recipe или placeholder item. До появления
повторяемых evidence и экспертной приёмки оба recipe sheets остаются пустыми.

Когда рецепт будет принят, каждая item row обязана ссылаться на существующий
`Catalog_Items`, `Calculation_Rules` и стабильный `price_code`. `quantity_params_json`
содержит только типизированные inputs выбранного quantity rule; он не является
исполняемым кодом.

## 8. Null, unknown и status policy

- Пусто допустимо только для колонок `required=false` и означает строго `NULL` /
  not applicable по описанному контракту.
- `UNKNOWN`, `REQUIRES_EXPERT`, `NOT_SUPPORTED` выражаются enum/status, а не пустой
  строкой.
- Open-ended effective period — единственное специальное значение nullable
  `effective_to`.
- Placeholder production rows запрещены.
- JSON-колонки содержат валидный JSON object/array; пустая строка не заменяет `{}`
  или `[]`, если поле required.

## 9. Relations и validations

Полный column contract находится в `sheets-columns.csv`, relations — в
`sheets-relations.csv`. Обязательные классы проверок:

- required/type/enum/boolean checks;
- unique stable row keys и составные business keys;
- ASCII-safe immutable IDs;
- foreign-key existence и orphan detection;
- unit compatibility между recipe/catalog/price;
- non-negative prices and quantities;
- valid JSON и запрет executable code в JSON cells;
- lifecycle/effective-period ordering and overlap checks;
- ровно одна applicable active pricebook/rule version на timestamp;
- published version immutability.

Stage 4 validator проверяет согласованность самих schema artifacts. Row-level
production checks реализуются на Stage 5/8 по этому контракту.

## 10. Read/write ownership

| Sheet | Source of truth | Writes | Reads | Manual edit |
|---|---|---|---|---|
| `System_Config` | approved system configuration | Stage 5 admin workflow | setup/runtime | DRAFT only |
| `Module_Size_Rules` | accepted module-rule sources | controlled import/admin | configurator | DRAFT only |
| `Module_Recipes` | furniture-expert approved recipes | expert/admin workflow | recipe resolver | DRAFT only |
| `Module_Recipe_Items` | accepted recipe quantities | expert/admin workflow | quantity engine | DRAFT only |
| `Catalog_Items` | production catalog master | catalog admin | recipes/pricebook/runtime | DRAFT only |
| `spr_price` | working current price inputs only | pricing manager/admin; future setup-managed preview fields | publication workflow/human preview | input fields allowed |
| `Pricebook_Versions` | published pricebook snapshots | pricing admin | price resolver/audit | DRAFT only |
| `Prices` | prices of one immutable version | pricing admin/import | price resolver | DRAFT only |
| `Calculation_Rules` | accepted rule registry | controlled code/schema release | calculation engine/audit | DRAFT metadata only |
| `Reference_Values` | accepted enum registry | schema/admin release | validation/setup/runtime | DRAFT only |
| `Schema_Meta` | repository schema release | setup/schema release | setup/validator/runtime | no ad-hoc edit |

`spr_price` остаётся mutable и не имеет статуса published. `Pricebook_Versions` и
`Prices` после публикации immutable/append-only. Historical normalized datasets remain
read-only evidence and never become production truth through an implicit import.

## 11. Минимальный contract с Google Sheets №2

Stage 4 не проектирует второй workbook. Будущий quote record должен лишь сохранять:

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

`input_snapshot_json` сохраняет ordered layout items и calculation items со stable
IDs/provenance. `result_snapshot_json` сохраняет cost results, включая price codes и
rule IDs. Точный `pricebook_version_id` и rule-version snapshot обеспечивают
воспроизводимость. CRM workflow, dashboard, PDF, IMPORTRANGE и access model вне scope.

Будущий quote display contract различает два режима:

- `ORIGINAL` использует зафиксированные quantity/input/result snapshots и точный
  `pricebook_version_id` исходного расчёта;
- `CURRENT_REPRICE` использует тот же quantity/calculation snapshot и последнюю
  applicable `ACTIVE` опубликованную `Pricebook_Versions` на момент reprice.

`CURRENT_REPRICE` не выполняет новый layout, BOM или quantity calculation и не
читает `spr_price`/`GOOGLEFINANCE` напрямую. Его граница: `spr_price -> publish ->
latest applicable ACTIVE pricebook -> CURRENT_REPRICE`. Preview по неопубликованным
ценам является отдельной будущей функцией и не входит в этот contract.

## 12. Machine-readable artifacts

- `sheets-columns.csv` — sheets, columns, types и column validations;
- `sheets-relations.csv` — foreign-key relations;
- `tools/validate_sheets_schema.py` — минимальный artifact validator;
- `tests/test_sheets_schema.py` — positive и negative validator tests.
