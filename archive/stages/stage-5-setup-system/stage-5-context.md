# AI Мебельщик — Этап 5
## Контракт: `setupSystem()` и физическое создание Google Sheets №1

## 1. Режим выполнения

```text
Управление: NORMAL
Рекомендуемый Codex: GPT-5.6 Sol
Reasoning: Medium
```

Постоянные правила:

```text
AI_FURNITURE_EXECUTION.md
```

Этап 5 впервые включает внешний изменяемый Google-ресурс. Поэтому обычная локальная реализация выполняется автономно, но любые действия в Google должны быть ограничены отдельной DEV/TEST-таблицей расчётной базы.

Не изменять существующие рабочие или production Google Sheets.

---

## 2. Цель

Реализовать `setupSystem()` на основании принятого machine-readable data contract Stage 4 и доказать его на реальном пустом Google Spreadsheet.

Целевой поток:

```text
accepted Stage 4 schema
        ↓
schema manifest / deterministic setup definition
        ↓
Apps Script setupSystem()
        ↓
blank DEV Google Spreadsheet
        ↓
11 sheets + headers + validations + formatting + schema metadata
        ↓
verification
```

Stage 5 НЕ перепроектирует schema.

---

## 3. Accepted baseline

Перед работой изучить:

```text
AI_FURNITURE_EXECUTION.md
PROJECT_CONTEXT.md

docs/stage-4-google-sheets/stage-4-context.md
docs/stage-4-google-sheets/stage-4-report.md
docs/stage-4-google-sheets/stage-4-price-patch-report.md
docs/stage-4-google-sheets/google-sheets-schema.md
docs/stage-4-google-sheets/sheets-columns.csv
docs/stage-4-google-sheets/sheets-relations.csv

tools/validate_sheets_schema.py
tests/test_sheets_schema.py

calculation_model/layout_configurator.py
calculation_model/calculation_engine.py
tests/test_layout_configurator.py
tests/test_calculation_engine.py
```

Git baseline по `PROJECT_CONTEXT.md` после accepted Stage 4 price patch:

```text
branch: main
HEAD: f075d66
working tree: clean
push: NO
```

Перед изменениями проверить фактический Git state.

---

## 4. Каноническая физическая схема

`setupSystem()` должен создать ровно следующие 11 рабочих sheets в принятом порядке:

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

Источник колонок, типов, required/unique/reference/enum contract:

```text
docs/stage-4-google-sheets/sheets-columns.csv
```

Источник relations:

```text
docs/stage-4-google-sheets/sheets-relations.csv
```

Не дублировать 136-column schema вручную в нескольких независимых местах без необходимости.

---

## 5. Главный принцип реализации

Stage 4 schema artifacts являются source of truth для структуры workbook.

Нужно обеспечить цепочку:

```text
sheets-columns.csv
+ sheets-relations.csv
        ↓
детерминированное представление setup schema
        ↓
setupSystem()
```

Codex самостоятельно выбирает минимальный способ:

- generated Apps Script schema manifest;
- deterministic build/generation step;
- другой простой подход.

Но нельзя создавать вручную вторую независимую schema, которая сможет незаметно разойтись с Stage 4 CSV.

Если создаётся generated artifact, он должен быть машинно проверяем на соответствие canonical CSV.

---

## 6. Разрешённый Apps Script scope

Stage 5 разрешает минимальный Apps Script, необходимый только для bootstrap workbook.

Разрешено:

```text
setupSystem()
schema/setup helpers
validation helpers
minimal verification helpers
generated schema manifest
```

Не строить полноценную Apps Script application architecture — это Stage 6.

Не начинать Web App, OpenRouter, calculation runtime integration или quote workflow.

---

## 7. Поведение `setupSystem()`

### 7.1. Безопасность

`setupSystem()` должен быть безопасным для повторного запуска.

Он НЕ должен:

- очищать существующие master-data rows без явного destructive mode;
- удалять non-empty неизвестные sheets;
- молча заменять несовместимые headers;
- перезаписывать published/ACTIVE rows;
- удалять данные ради приведения workbook к schema.

Если найден конфликт с существующей непустой структурой:

```text
STOP / VALIDATION ERROR
```

с понятным сообщением.

### 7.2. Новый пустой workbook

На dedicated blank DEV workbook разрешено:

- создать недостающие 11 sheets;
- привести их к canonical order;
- создать headers;
- установить column formatting;
- frozen header row;
- filters, если они не мешают runtime;
- data validations;
- seed только системных metadata/reference rows, которые явно следуют из accepted schema;
- удалить/переименовать стандартный пустой лист Google только если он действительно пуст и не является частью canonical schema.

### 7.3. Повторный запуск

На уже правильно созданном workbook:

```text
setupSystem()
→ не создаёт дубликаты
→ не повреждает данные
→ подтверждает / восстанавливает безопасные schema-level настройки
```

Idempotency должна быть проверена.

---

## 8. Headers и columns

Для каждого sheet:

- колонки создаются в `column_order`;
- header text точно соответствует `column_name`;
- duplicate/missing headers недопустимы;
- Apps Script не связывает поля по display label, если machine name уже существует;
- column count должен совпадать с canonical schema.

После setup реальный workbook должен соответствовать:

```text
11 sheets
136 columns total
```

---

## 9. Data types и formatting

Stage 5 должен реализовать разумный spreadsheet representation accepted data types.

Как минимум рассмотреть:

```text
string / ID
integer
decimal
boolean
date/datetime
JSON text
enum
```

Formatting не должен менять семантику значений.

Особенно:

- IDs/codes хранить как text;
- денежные значения не превращать в display-only strings;
- timestamps/dates хранить как значения дат, если contract это требует;
- JSON хранить как text с последующей runtime validation;
- leading zero / punctuation в IDs не терять.

---

## 10. Data validation

Реализовать spreadsheet-level validations настолько, насколько это безопасно и прямо следует из Stage 4 contract.

Минимально:

- enum values;
- boolean fields;
- простые required/value constraints, где Google Sheets validation подходит;
- reference dropdown/range validation для стабильных master-data references, если это не создаёт ложную гарантию referential integrity;
- numeric non-negative constraints, где они предусмотрены schema.

Полная relational integrity остаётся за runtime validation.

Не превращать spreadsheet validation в сложную псевдо-БД.

---

## 11. `Schema_Meta`

После успешного bootstrap workbook должен иметь минимальный schema metadata record, достаточный для будущей runtime compatibility check.

Он должен позволять определить минимум:

```text
schema_version_id
schema version
setup/runtime compatibility
created/setup timestamp
status
```

Использовать accepted `Schema_Meta` column contract.

Не изобретать новый lifecycle вне Stage 4 schema.

---

## 12. `Reference_Values`

Разрешено seed только тех системных enum/reference values, которые:

- прямо определены accepted schema;
- нужны для validations/runtime;
- не являются production material/recipe/price data.

Не создавать production catalog data.

---

## 13. `spr_price`

Stage 5 создаёт физическую структуру и validations `spr_price` для:

```text
MANUAL_RUB
FX_AUTO
FX_MANUAL
```

Но Stage 5 НЕ реализует publication runtime.

### GOOGLEFINANCE

Можно реализовать только безопасный bootstrap/formula policy, если он естественно следует из accepted schema и не создаёт volatile dependency официального расчёта.

Обязательное правило:

```text
GOOGLEFINANCE / fx_rate_current
→ working preview only
```

Официальный calculation/quote никогда не должен читать volatile working FX напрямую.

Если автоматическая формула для будущих rows требует отдельного row-management workflow, не изобретать его на Stage 5. Зафиксировать deferred implementation в report.

---

## 14. Pricebook sheets

Создать физическую структуру:

```text
Pricebook_Versions
Prices
```

с accepted validations/formatting.

Не заполнять production prices.

Не переносить historical fixtures как current pricebook.

Lifecycle сохраняется:

```text
DRAFT → ACTIVE → RETIRED
```

Published truth и publication workflow не реализуются на Stage 5.

---

## 15. Module recipes / expert debt

Создать:

```text
Module_Recipes
Module_Recipe_Items
```

по canonical schema.

Оставить production rows пустыми.

Сохранить:

```text
MODULE_TO_PARTS_V1 = REQUIRES_EXPERT
```

в том виде, который предусмотрен `Calculation_Rules`/accepted schema.

Synthetic BOM запрещён.

---

## 16. Локальные тесты

До реального Google run создать автоматические проверки, которые минимум подтверждают:

1. setup definition покрывает все 11 canonical sheets;
2. все 136 canonical columns представлены один раз;
3. порядок sheets соответствует contract;
4. порядок columns соответствует contract;
5. enum/validation definitions не ссылаются на неизвестные fields;
6. generated manifest, если есть, соответствует canonical CSV;
7. existing Stage 4 schema validator остаётся PASS;
8. Stage 3 regression tests остаются PASS.

Не строить тяжёлый Apps Script emulator, если достаточно детерминированной проверки generation/setup manifest.

---

## 17. Реальный Google run — обязательная часть COMPLETE

`COMPLETE` разрешён только если `setupSystem()` реально выполнен на dedicated blank DEV Google Spreadsheet и результат проверен.

Если Codex не имеет авторизованного доступа к Google:

1. полностью закончить локальную реализацию;
2. создать точную краткую инструкцию ручного запуска;
3. не объявлять Stage 5 COMPLETE;
4. вернуть статус:

```text
READY_FOR_GOOGLE_RUN
```

или `PARTIAL`, если отчётный enum требует только `COMPLETE/PARTIAL/BLOCKED`;
5. остановиться и запросить только необходимое действие пользователя.

Отсутствие Google auth не является причиной не делать локальную часть.

---

## 18. Требования к DEV workbook

Для проверки использовать только новый dedicated spreadsheet без production data.

Рекомендуемый смысл имени:

```text
AI Furniture Calculation Base — DEV
```

Конкретное имя не является relation key и не должно попадать в бизнес-логику.

Перед запуском нужно убедиться, что workbook можно безопасно изменять.

Нельзя тестировать destructive/bootstrap behavior на существующей рабочей таблице пользователя.

---

## 19. Google verification

После реального `setupSystem()` проверить минимум:

### Structure

```text
11 canonical sheets
canonical order
136 total columns
exact headers
```

### Schema settings

- frozen header rows;
- expected validations;
- expected formats;
- `Schema_Meta` bootstrap record;
- allowed system reference seeds;
- recipe/catalog/price production rows не придуманы.

### Idempotency

Запустить `setupSystem()` второй раз.

Ожидается:

```text
PASS
no duplicate sheets
no duplicate headers
no data loss
no destructive rewrite
```

### Verification artifact

Создать локальный воспроизводимый verification record, например JSON/MD, содержащий:

```text
spreadsheet identifier/reference
verification timestamp
sheet names/order
column counts
setup run result
second-run/idempotency result
known deferred items
```

Не сохранять OAuth tokens, secrets или лишние персональные данные.

---

## 20. Google credentials / secrets

Не коммитить:

- OAuth tokens;
- service-account private keys;
- refresh tokens;
- cookies;
- user secrets.

Если для локального запуска понадобятся credentials, использовать только безопасный local-secret mechanism вне Git.

Если Codex не может безопасно получить доступ — перейти к manual Google run checkpoint.

---

## 21. Ожидаемые локальные артефакты

Точную кодовую структуру Codex выбирает самостоятельно.

Ожидается минимум:

```text
Apps Script implementation setupSystem
deterministic schema representation/generation
tests/validator updates
docs/stage-5-setup-system/stage-5-report.md
```

Если нужен manual checkpoint:

```text
docs/stage-5-setup-system/google-run-checklist.md
```

создавать только если он реально требуется.

Не создавать пустые placeholders.

---

## 22. Acceptance criteria

Stage 5 считается `COMPLETE`, если:

1. `setupSystem()` реализован.
2. Структура выводится из accepted Stage 4 schema, а не из независимого ручного дубля.
3. Создаются ровно 11 canonical sheets.
4. Создаются ровно 136 canonical columns.
5. Порядок sheets и columns соответствует contract.
6. Stable IDs/codes сохраняются как text.
7. Spreadsheet-level validations реализованы в разумном объёме.
8. `Schema_Meta` bootstrap корректен.
9. `Reference_Values` seed не содержит выдуманных production data.
10. `spr_price` поддерживает accepted pricing modes на уровне structure/validation.
11. Production pricebook не заполнен историческими fixtures.
12. Module recipe sheets физически существуют, но synthetic BOM отсутствует.
13. Existing Stage 4 schema validation PASS.
14. Existing Stage 3 regression tests PASS.
15. Новые local setup/generation tests PASS.
16. `py_compile`/аналогичные локальные проверки PASS, где применимо.
17. `git diff --check` PASS.
18. `source-materials` и accepted normalization datasets неизменны.
19. Реальный dedicated DEV Google Spreadsheet создан/подготовлен и `setupSystem()` выполнен.
20. Google workbook verification подтверждает 11 sheets / 136 columns.
21. Второй запуск подтверждает idempotency без потери данных.
22. Verification artifact создан.
23. Secrets не попали в Git.
24. `stage-5-report.md` создан.
25. Working tree после итогового commit clean.
26. Push не выполнялся.
27. Stage 6 не начат.

Если пункты 19–21 не выполнены из-за отсутствия Google access, Stage 5 не может быть `COMPLETE`.

---

## 23. Не делать

Не выполнять:

- изменение Stage 4 schema без эскалации;
- production data population;
- publication pricebook runtime;
- CURRENT_REPRICE runtime;
- полноценный Apps Script architecture baseline;
- clasp setup;
- OpenRouter;
- Web App;
- calculation engine port/integration;
- Google Sheets №2;
- dashboard;
- IMPORTRANGE;
- PDF;
- Stage 6.

---

## 24. Итоговый отчёт

Создать:

```text
docs/stage-5-setup-system/stage-5-report.md
```

Минимальная структура:

```markdown
# Этап 5 — Отчёт

## Статус
COMPLETE / PARTIAL / BLOCKED

## Что реализовано

## setupSystem architecture

## Schema source / generation

## Workbook structure

## Validations / formatting

## Google run
- target type: DEV
- first run
- second run / idempotency
- verification

## Deferred Google/runtime behavior

## Tests

## Security / secrets

## Ограничения / blocker

## Git
- branch
- commits
- working tree
- push
```

Если локальная работа завершена, но Google run ожидает пользователя, статус должен это ясно отражать.

---

## 25. Git

Перед работой:

```text
git status --short
git branch --show-current
git log -1 --oneline
```

Не делать push.

Не коммитить secrets.

После локальной реализации и после финальной Google verification выполнить предусмотренные проверки.

Итоговые commits должны относиться к Stage 5.

После Stage 5 остановиться.

Stage 6 не начинать.
