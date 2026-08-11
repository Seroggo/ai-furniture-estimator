# AI Мебельщик — Этап 4
## Контракт: схема Google Sheets расчётной базы

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

Этап 4 является проектированием data contract. Реальный Google Sheets доступ не требуется.

## 2. Цель

Спроектировать каноническую схему Google Sheets №1 — «Расчётная база» так, чтобы на следующем этапе `setupSystem()` мог детерминированно создать её структуру.

Нужен не макет интерфейса таблицы, а устойчивый data contract:

```text
Stage 3 domain models
        ↓
Google Sheets data model
        ↓
machine-readable schema
        ↓
Stage 5 setupSystem()
```

## 3. Обязательный контекст

Перед работой изучить:

```text
AI_FURNITURE_EXECUTION.md
PROJECT_CONTEXT.md

docs/stage-3-calculation-model/stage-3.2-report.md
docs/stage-3-calculation-model/stage-3.3-report.md
docs/stage-3-calculation-model/stage-3.4-report.md

calculation_model/layout_configurator.py
calculation_model/calculation_engine.py

tests/test_layout_configurator.py
tests/test_calculation_engine.py

source-materials/kitchen-module-reference-comparison.csv
```

Также при необходимости использовать accepted Stage 2 datasets и validation reports.

Не проектировать схему из общего представления о мебельном производстве, если существующий baseline этого не требует.

## 4. Главный принцип

Схема Google Sheets должна отражать уже принятую предметную модель, а не создавать вторую несовместимую модель.

Особенно сохранить:

```text
LayoutItem
CalculationItem
PriceInput
CostResult
Rule registry
rule statuses
provenance
```

Будущий `ModuleRecipe` должен быть предусмотрен как контракт, но не заполнен выдуманными production rules.

## 5. Логические области расчётной базы

Нужно спроектировать структуру, способную хранить:

- system/config;
- module size rules;
- module recipes;
- module recipe items;
- materials / hardware / works или их нормализованный общий catalog;
- pricebook;
- calculation rules;
- reference/enums.

Конкретное разбиение на sheets определить из существующей модели данных, избегая как одной огромной таблицы, так и чрезмерной псевдо-SQL нормализации.

## 6. Stable IDs

Runtime не должен связывать сущности по display name.

Нужны стабильные IDs/codes, например:

```text
module_rule_id
recipe_id
recipe_item_id
catalog_item_code
price_code
rule_id
```

Требования:

- unique;
- immutable после публикации;
- ASCII-safe;
- пригодны для Apps Script;
- display names хранятся отдельно.

## 7. Quantity model и pricebook

Сохранить принцип:

```text
quantity model × pricebook = cost
```

Pricebook должен поддерживать минимум:

```text
stable price_code
unit
unit_price
currency
effective period / version
status
source/provenance
```

Historical fixtures из Stage 2/3 нельзя автоматически загружать как current pricebook.

## 8. Module recipes и expert debt

Нужно предусмотреть schema для:

```text
module class / role / variant
→ recipe
→ recipe items
```

Но фактические production recipe rows не выдумывать.

Текущий accepted status:

```text
module → parts = REQUIRES_EXPERT
```

Схема должна позволять хранить этот статус без fake BOM rows.

## 9. Rule registry

Табличный контракт должен поддерживать:

```text
rule_id
status
scope
inputs
outputs
provenance
notes
```

Статусы:

```text
CONFIRMED
DERIVED
PROVISIONAL
REQUIRES_EXPERT
NOT_SUPPORTED
```

Нужно явно определить, какие rules являются data/metadata, а какие executable formulas должны оставаться в коде.

Не хранить произвольный исполняемый код в ячейках только ради гибкости.

## 10. Версионность и историчность

Нужно обеспечить возможность ответить:

> На какой версии правил и цен был рассчитан результат?

Не требуется строить temporal database.

Нужен простой MVP-механизм, например:

```text
version
effective_from
effective_to
status
```

или эквивалентный контракт.

Нельзя проектировать схему, где новая цена просто перезаписывает старую без возможности воспроизвести исторический расчёт.

## 11. Null / unknown / status policy

Не использовать пустую строку как универсальный смысл для:

```text
unknown
not applicable
not supported
requires expert
```

Определить простую политику null/status.

Не создавать placeholder production rows только ради заполнения таблиц.

## 12. Validation и ссылочная целостность

Формализовать будущие проверки:

- required fields;
- unique keys;
- enum checks;
- type checks;
- reference validation;
- orphan detection;
- effective period checks.

Google Sheets не имеет полноценной relational integrity, поэтому Этап 4 должен задать contract, а Этап 5/8 позже реализуют проверки.

Apps Script сейчас не писать.

## 13. Read/write ownership

Для каждого sheet описать:

```text
source of truth
кто/что пишет
кто/что читает
разрешено ли ручное редактирование
```

Historical normalized datasets не должны незаметно стать current production master data.

## 14. Минимальный контракт с будущей Базой КП

Этап 4 не проектирует полноценный Google Sheets №2.

Нужно определить лишь минимальный snapshot/output contract, например:

```text
quote_id
project_id
calculation/model version
pricebook version
input snapshot
result snapshot
total
created_at
```

Не проектировать сейчас CRM/status workflow, dashboard, IMPORTRANGE, PDF или права пользователей.

## 15. Ожидаемые артефакты

Создать:

```text
docs/stage-4-google-sheets/google-sheets-schema.md
docs/stage-4-google-sheets/sheets-columns.csv
docs/stage-4-google-sheets/sheets-relations.csv
docs/stage-4-google-sheets/stage-4-report.md
```

Дополнительные артефакты допустимы только если реально нужны для машинной проверки.

### sheets-columns.csv

Минимальные поля:

```text
sheet_name
column_order
column_name
data_type
required
unique
default_value
enum_values
reference_sheet
reference_column
validation
description
```

### sheets-relations.csv

Минимальные поля:

```text
relation_id
from_sheet
from_column
to_sheet
to_column
cardinality
required
validation_policy
description
```

## 16. Schema validator

Создать минимальную автоматическую проверку schema artifacts.

Она должна обнаруживать минимум:

- duplicate `(sheet_name, column_name)`;
- duplicate column order внутри sheet;
- отсутствие обязательных schema fields;
- reference на несуществующий sheet/column;
- relation на несуществующий column;
- invalid data type;
- invalid boolean values;
- invalid/unknown cardinality;
- отсутствие stable key там, где сущность требует identity.

Не требуется писать общий framework.

## 17. Acceptance criteria

Этап 4 считается `COMPLETE`, если:

1. Схема основана на accepted Stage 3 domain models.
2. Определён набор sheets и назначение каждого.
3. Все runtime-сущности имеют stable IDs/codes.
4. Display names не используются как relation keys.
5. Quantity model и pricebook остаются разделены.
6. Historical prices не повышены до current pricebook.
7. Pricebook поддерживает воспроизводимую version/effective period.
8. Module recipes предусмотрены, но synthetic BOM не создан.
9. `REQUIRES_EXPERT` выражается без fake production rows.
10. Rule statuses и provenance поддерживаются.
11. Определено, что является rule metadata, а что остаётся executable code.
12. Для каждого sheet описан read/write ownership.
13. Есть machine-readable columns schema.
14. Есть machine-readable relations schema.
15. Validation/reference integrity формализованы.
16. Schema validator/tests проходят.
17. Existing 29 Stage 3 regression tests остаются PASS.
18. Реальный Google Sheet не создан.
19. Apps Script / setupSystem не написаны.
20. Google Sheets №2 не спроектирован за пределами минимального snapshot contract.
21. `source-materials` и accepted datasets не изменены.
22. `git diff --check` проходит.
23. `stage-4-report.md` создан.
24. Working tree после итогового commit clean.
25. Push не выполнялся.

## 18. Не делать

Не выполнять:

- создание Google Sheet;
- Google API auth;
- Apps Script;
- `setupSystem()`;
- clasp;
- OpenRouter;
- UI/Web App;
- полноценную базу КП;
- IMPORTRANGE;
- PDF;
- production price population из historical данных;
- synthetic module recipes;
- следующий этап.

Если для schema требуется изменить accepted архитектуру Stage 3 — не менять её самостоятельно, а эскалировать Штабу.

## 19. Итоговый отчёт

Создать:

```text
docs/stage-4-google-sheets/stage-4-report.md
```

Минимальная структура:

```markdown
# Этап 4 — Отчёт

## Статус
COMPLETE / PARTIAL / BLOCKED

## Итоговая схема

## Ключевые архитектурные решения

## Sheets и ownership

## IDs и связи

## Versioning / pricebook

## Module recipes / expert debt

## Validation

## Quote snapshot contract

## Проверки и тесты

## Ограничения / открытые вопросы

## Git
- branch
- commits
- working tree
- push
```

## 20. Git

Начать с текущего accepted baseline:

```text
main
HEAD: 3dd047b
working tree: clean
```

Перед изменениями проверить фактическое состояние Git.

Не делать push.

После acceptance criteria:

- создать итоговый report;
- выполнить проверки;
- сделать осмысленные commits;
- привести working tree к clean;
- остановиться.

Не начинать Этап 5.
