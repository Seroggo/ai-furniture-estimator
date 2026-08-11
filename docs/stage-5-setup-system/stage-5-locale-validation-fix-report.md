# Stage 5 — locale validation corrective report

## Статус

```text
LOCAL FIX COMPLETE
STAGE 5: PARTIAL — GOOGLE CHECKPOINT PENDING
```

Stage 4 schema не изменялась. Google Spreadsheet в рамках корректирующей задачи
не изменялся и `setupSystem()` не запускался.

## Root cause

Read-only metadata целевого workbook подтверждает:

```text
spreadsheet id: 1begIbLngVMshpAmnn142TozbHWgIAD-QBvKX6y8NNvs
title: AI Furniture Calculation Base — DEV
locale: ru_RU
timeZone: Asia/Yekaterinburg
```

Первый ручной run успел создать 11 canonical sheets и начать настройку
`Schema_Meta`, после чего остановился на первом integer validation —
`Schema_Meta.version`, колонка C.

Исходная custom validation formula:

```text
=AND(ISNUMBER(C2),C2=INT(C2),C2>=1)
```

содержала разделители аргументов `,`. Для formula parsing в spreadsheet с
`ru_RU` используется `;` как argument separator. Язык имён функций является
отдельной spreadsheet setting и в target UI отображается на английском языке.
Поэтому проблема была не в английских `AND`/`ISNUMBER`/`INT`, а в locale-dependent
multi-argument syntax.

`isSheetEmpty_()` из отображённого stack trace не является root cause. Реальная
последовательность была:

```text
prepare sheets
→ validate/create Schema_Meta headers
→ freeze/format header
→ configure body columns
→ build/apply custom integer DataValidation
→ Google Sheets rejects invalid formula argument
```

Ошибка возникает на границе создания/применения правила из
`dataValidationForColumn_()` через `requireFormulaSatisfied(...).build()` и
`range.setDataValidation(rule)`.

## Исправление

Введён единый helper:

```javascript
integerValidationFormula_(columnNumber, minimum)
```

Он генерирует separator-free formula:

```text
integer >= 1:
=ISNUMBER(C2)*(C2=INT(C2))*(C2>=1)=1

integer >= 0:
=ISNUMBER(E2)*(E2=INT(E2))*(E2>=0)=1
```

Семантика сохранена:

- `ISNUMBER(cell)` требует реальное numeric value;
- `cell=INT(cell)` отклоняет дробные значения;
- `cell>=minimum` сохраняет accepted minimum `0` или `1`;
- произведение равно `1` только когда все три условия истинны;
- итоговое `=1` возвращает boolean result, требуемый
  `requireFormulaSatisfied()`;
- `setAllowInvalid(false)` сохранён, поэтому invalid input отклоняется, а не
  превращается в warning.

Исправление намеренно не заменяет `,` на `;`. У новой formula нет
multi-argument functions и нет ни `,`, ни `;`, поэтому она не зависит от
argument separator spreadsheet locale. Английские имена unary functions
соответствуют текущей English function-language setting target workbook и
официальному Apps Script contract `requireFormulaSatisfied(formula)`.

Locale workbook не меняется ни вручную, ни программно.

Официальные справочные точки:

- `https://developers.google.com/apps-script/reference/spreadsheet/data-validation-builder`;
- `https://support.google.com/docs/answer/58515` — locale и function language
  являются отдельными spreadsheet settings.

## Изменённые файлы

```text
apps-script/setup_system.gs
tests/test_setup_schema.py
docs/stage-5-setup-system/stage-5-locale-validation-fix-report.md
```

Generated manifest не изменялся и остаётся current относительно accepted CSV:

```text
apps-script/generated/schema_manifest.gs
```

Generator и accepted Stage 4 artifacts не требовали исправления.

## Regression tests

Добавлены проверки:

- exact separator-free formula для target Russia locale;
- отдельные contracts `integer >= 0` и `integer >= 1`;
- сохранение `ISNUMBER` и integer equality через `INT`;
- отсутствие `,` и `;` в integer custom formulas;
- ровно один контролируемый путь `requireFormulaSatisfied()`;
- отсутствие других `=AND`, `=OR`, `=IF`, `=IFERROR` custom formulas;
- сохранение enum, reference, checkbox, decimal, date validations;
- сохранение `setAllowInvalid(false)`.

Результаты:

```text
Stage 5 setup/schema tests: 11 / 11 PASS
Stage 4 schema tests:       20 / 20 PASS
Stage 3 calculation tests:  11 / 11 PASS
Stage 3 layout tests:       18 / 18 PASS
full suite:                 60 / 60 PASS

schema generator --check: CURRENT
schema validator: VALID — 11 sheets, 136 columns
py_compile: PASS
Apps Script JS syntax/static check: PASS
git diff --check: PASS
source-materials: unchanged
stages/02-normalization: unchanged
accepted Stage 4 artifacts: unchanged
```

## Аудит locale-sensitive rules

В executable Stage 5 setup найден ровно один custom-formula path:

```text
requireFormulaSatisfied(integerValidationFormula_(...))
```

После исправления он separator-free. Других `setFormula`, `setFormulas`,
`formulaValue`, `GOOGLEFINANCE(...)` или custom formula strings в setup code нет.

Остальные validations используют typed Apps Script builder methods и не требуют
formula parsing:

```text
requireValueInList
requireValueInRange
requireCheckbox
requireNumberGreaterThan
requireNumberGreaterThanOrEqualTo
requireDate
```

Number/date display formats содержат только format patterns и не являются
formulas. Generated manifest содержит слово `GOOGLEFINANCE` только как accepted
enum/reference value будущего working FX preview, а не как formula.

## Ограничения

- Реальный повторный Google run намеренно не выполнялся в этой задаче.
- Stage 5 остаётся `PARTIAL` до успешного первого retry, второго idempotency run
  и connector verification.
- Частично созданные 11 sheets не нужно удалять: исправленный `setupSystem()`
  рассчитан на безопасное продолжение и повторный запуск.
- Stage 6 не начат.

## Что повторно перенести в bound Apps Script

Обязательно заменить только:

```text
apps-script/setup_system.gs
```

`apps-script/generated/schema_manifest.gs` не изменился. Повторно копировать его
не требуется, если в bound project уже находится версия из commit `9e1a76b`.

## Точная инструкция повторного Google run

1. Открыть bound Apps Script project workbook
   `AI Furniture Calculation Base — DEV`.
2. Полностью заменить содержимое `setup_system.gs` содержимым локального
   `apps-script/setup_system.gs` из corrective commit.
3. Не менять locale workbook и не редактировать `schema_manifest.gs`.
4. Сохранить Apps Script project.
5. Выбрать `setupSystem` и выполнить — это продолжение неуспешного первого run.
6. Убедиться, что execution завершился без ошибки.
7. Сразу выполнить `setupSystem` второй раз для проверки idempotency.
8. Убедиться, что второй execution завершился без ошибки.
9. Сообщить Codex:

```text
setupSystem retry run: PASS
setupSystem second run: PASS
```

После этого требуется read-only connector verification workbook и обновление
основного Stage 5 report; только тогда может рассматриваться статус `COMPLETE`.

