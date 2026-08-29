# Этап 5 — Отчёт

## Статус

```text
COMPLETE
```

Локальная реализация и реальный dedicated DEV Google checkpoint завершены.
Первый retry и второй idempotency run `setupSystem()` прошли успешно; финальная
connector verification подтверждает accepted workbook contract.

## Что реализовано

- минимальный Apps Script `setupSystem()`;
- safety guards для неизвестных sheets, несовместимых headers, данных вне
  canonical columns и конфликтующих seed rows;
- безопасный повторный запуск без очистки master-data rows;
- header formatting, frozen row, data-type number formats и column widths;
- enum, reference, boolean, integer, decimal и date/datetime validations;
- `Schema_Meta` bootstrap с schema/runtime compatibility и setup timestamp;
- системный `Reference_Values` seed только из enum values accepted schema;
- accepted blocking rule `MODULE_TO_PARTS_V1 = REQUIRES_EXPERT`;
- локальные schema/setup generation tests.

Production recipes, recipe items, catalog items, working prices,
`Pricebook_Versions` и `Prices` не seed-ятся.

## setupSystem architecture

```text
sheets-columns.csv + sheets-relations.csv
        ↓
tools/generate_setup_schema.py
        ↓
apps-script/generated/schema_manifest.gs
        ↓
apps-script/setup_system.gs :: setupSystem()
```

`setupSystem()`:

1. принимает единственный пустой default sheet как bootstrap target;
2. создаёт недостающие canonical sheets;
3. останавливается на неизвестном sheet или несовместимых непустых headers;
4. создаёт/проверяет exact headers;
5. применяет schema-level formatting и validations;
6. добавляет только разрешённые system seeds;
7. приводит sheets к canonical order;
8. выполняет встроенную проверку 11 sheets / 136 columns / exact headers.

Существующие строки не очищаются и не переписываются. При повторном запуске
seed IDs проверяются, недостающие seeds добавляются, существующие сохраняются.

## Schema source / generation

Source of truth не изменён:

```text
docs/stage-4-google-sheets/sheets-columns.csv
docs/stage-4-google-sheets/sheets-relations.csv
```

Generated manifest содержит все поля canonical CSV, relations и вычисленные из
них enum seeds. `python tools/generate_setup_schema.py --check` обнаруживает любое
расхождение generated artifact с accepted CSV.

Структура workbook не хранится в независимом вручную продублированном списке
136 колонок.

## Workbook structure

Manifest подтверждает:

```text
Schema_Meta             9
System_Config          11
Module_Size_Rules      18
Module_Recipes         12
Module_Recipe_Items    12
Catalog_Items           8
spr_price              17
Pricebook_Versions     11
Prices                 15
Calculation_Rules      15
Reference_Values        8
-------------------------
total                  136
```

Итого: 11 sheets, 136 columns, 9 relations.

## Validations / formatting

- string, stable ID/code и JSON columns форматируются как plain text;
- integer, decimal, date и datetime получают типовые number formats;
- enum values получают strict list validation непосредственно из schema;
- foreign-key columns получают range validation на accepted target column;
- numeric constraints `>= 0`, `> 0` и integer constraints применяются, когда
  они явно следуют из column validation contract;
- date/datetime columns получают date validation;
- header row имеет единый light-gray native style и закрепляется;
- сложная relational integrity и mode-specific row integrity остаются runtime
  validation, как требует Stage 5 contract.

`spr_price.pricing_mode` физически поддерживает:

```text
MANUAL_RUB
FX_AUTO
FX_MANUAL
```

`GOOGLEFINANCE` formulas не создаются. `fx_rate_current` остаётся будущим working
preview; официальный calculation/quote не зависит от volatile FX cells.

## Google run

- target type: dedicated DEV;
- spreadsheet id: `1begIbLngVMshpAmnn142TozbHWgIAD-QBvKX6y8NNvs`;
- title: `AI Furniture Calculation Base — DEV`;
- preflight metadata: один sheet `Лист1`, grid 1000 x 26;
- preflight bounded cell read `Лист1!A1:Z10`: пусто;
- first run/retry: `PASS`;
- second run / idempotency: `PASS`;
- connector verification: `PASS`;
- verification artifact:
  `docs/stage-5-setup-system/stage-5-google-verification.md`.

Подтверждено:

```text
11 canonical sheets in exact order
136 exact headers
11 / 11 frozen header rows
66 / 66 strict validations
136 / 136 expected number formats
79 unique Reference_Values seeds
no duplicate sheets / headers / seeds
no synthetic production data
```

## Deferred Google/runtime behavior

- автоматическое управление `GOOGLEFINANCE` preview rows;
- pricebook publication runtime;
- `CURRENT_REPRICE` runtime;
- полноценная Apps Script architecture / clasp (Stage 6);

## Tests

```text
python tools/generate_setup_schema.py --check
-> CURRENT

python tools/validate_sheets_schema.py
-> VALID: 11 sheets, 136 columns

new Stage 5 setup/schema tests: 11 / 11 PASS
Stage 4 schema tests:          20 / 20 PASS
Stage 3 calculation tests:     11 / 11 PASS
Stage 3 layout tests:          18 / 18 PASS
full suite:                    60 / 60 PASS

py_compile: PASS
Apps Script JavaScript syntax (node --check via stdin): PASS
git diff --check: PASS
source-materials diff: отсутствует
stages/02-normalization diff: отсутствует
```

## Security / secrets

Credentials, OAuth tokens, cookies, service-account keys и secrets не создавались
и не добавлялись в Git. Push не выполнялся.

## Ограничения / blocker

Blockers Stage 5 отсутствуют. Publication runtime, `CURRENT_REPRICE`, автоматическое
управление `GOOGLEFINANCE` preview rows и полноценная Apps Script architecture
остаются deferred согласно scope. Stage 6 не начат.

## Git

- branch: `main`;
- baseline: `f075d66`;
- Stage 5 context: `2838606`;
- implementation/tests: `9e1a76b`;
- locale validation fix: `ea52905`;
- Google verification/report: финальный Stage 5 commit;
- working tree: clean после финального commit;
- push: NO.
