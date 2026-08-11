# AI Мебельщик — корректирующий патч Этапа 4
## Working price source (`spr_price`) + immutable pricebook snapshots + reprice contract

## 1. Статус и режим

Это не новый этап и не Этап 5.

```text
Stage 4 corrective patch
Управление: NORMAL
Рекомендуемый Codex: GPT-5.6 Sol
Reasoning: Medium
```

Постоянные правила:

```text
AI_FURNITURE_EXECUTION.md
```

Accepted baseline до патча:

```text
Stage 4 — ACCEPTED / CLOSED
branch: main
HEAD: 17000b51ef093ed956bdec5fc20f56ba191d2689
working tree: clean
push: NO
```

Перед работой проверить фактический Git state и не предполагать, что HEAD не изменился.

---

## 2. Причина патча

Принятая схема Stage 4 корректно разделяет quantity model и immutable versioned pricebook:

```text
Module_Recipe_Items
x
Pricebook_Versions + Prices
=
runtime CostResult
```

Но в ней отсутствует отдельный удобный рабочий слой, из которого менеджер/администратор сможет поддерживать **актуальные цены до публикации snapshot**.

Нужно добавить рабочий price-source sheet:

```text
spr_price
```

Его назначение:

```text
ручной ввод текущих цен
или
валютная исходная цена + текущий/ручной курс
        ↓
рабочая текущая цена
        ↓
publish
        ↓
immutable Pricebook_Versions + Prices
```

`spr_price` НЕ является расчётной истиной для зафиксированного КП и НЕ заменяет `Pricebook_Versions` / `Prices`.

---

## 3. Обязательный контекст

Перед изменениями изучить:

```text
AI_FURNITURE_EXECUTION.md
PROJECT_CONTEXT.md

docs/stage-4-google-sheets/stage-4-context.md
docs/stage-4-google-sheets/stage-4-report.md
docs/stage-4-google-sheets/google-sheets-schema.md
docs/stage-4-google-sheets/sheets-columns.csv
docs/stage-4-google-sheets/sheets-relations.csv

tools/validate_sheets_schema.py
tests/test_sheets_schema.py

calculation_model/calculation_engine.py
tests/test_calculation_engine.py
```

Принятые Stage 3 и Stage 4 решения сохранять, кроме явно изменяемой этим патчем ценовой части.

---

## 4. Главное архитектурное решение

После патча ценовая модель должна быть:

```text
spr_price
(editable working price source)
        ↓
publication / snapshot boundary
        ↓
Pricebook_Versions
        ↓
Prices
(immutable published calculation truth)
        ↓
Quote calculation / reprice
```

### `spr_price`

Это **mutable working/staging sheet** для текущих цен.

### `Pricebook_Versions + Prices`

Это **immutable published snapshots**, которые использует runtime и которые можно зафиксировать в КП.

Нельзя объединять эти роли.

---

## 5. Итоговый набор sheets

Текущие 10 sheets сохранить и добавить один:

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

Итого после патча:

```text
11 sheets
```

Если Codex считает, что физическое имя `spr_price` нарушает существующий naming convention, НЕ переименовывать его самостоятельно: это принятое пользователем имя рабочего листа. Технические IDs/columns при этом должны оставаться ASCII-safe и стабильными.

---

## 6. Назначение `spr_price`

`spr_price` должен позволять поддерживать текущую рабочую цену минимум в трёх режимах:

```text
MANUAL_RUB
FX_AUTO
FX_MANUAL
```

### MANUAL_RUB

Менеджер/администратор вводит текущую цену непосредственно в RUB.

### FX_AUTO

Хранится исходная цена в валюте, а рабочий курс может получать Google Sheets через `GOOGLEFINANCE` на будущем этапе физической реализации.

### FX_MANUAL

Хранится исходная цена в валюте, но для расчётной рабочей цены используется вручную заданный коммерческий курс.

Важно:

```text
GOOGLEFINANCE
```

сейчас НЕ реализовывать.

Stage 4 patch задаёт только data contract и formula policy для будущего `setupSystem()` / Apps Script.

---

## 7. Минимальный контракт `spr_price`

Codex должен уточнить типы и validations, но sheet должен выражать как минимум следующую семантику:

```text
working_price_id
price_code
catalog_item_code
display_name
unit

pricing_mode

source_currency
source_price

fx_rate_source
fx_rate_manual
fx_rate_current
fx_rate_used_preview

current_price_rub

status
source_ref
updated_at
notes
```

### Требования

- `working_price_id` — stable row identity.
- `price_code` — тот же логический stable code, который используется quantity model / published prices.
- `catalog_item_code` — ссылка на `Catalog_Items`, если цена относится к catalog item.
- display name не является relation key.
- `unit` должен быть совместим с catalog/default unit и future published `Prices`.
- `source_currency` не изобретать.
- `source_price` — цена поставщика/исходная цена в source currency.
- `fx_rate_manual` используется только при `FX_MANUAL`.
- `fx_rate_current` — рабочее динамическое значение, которое на Stage 5 может быть формулой/вычисляемым полем.
- `current_price_rub` — рабочая preview/current цена, НЕ immutable published truth.
- `updated_at` фиксирует актуальность рабочего ввода.
- не создавать historical production values из Stage 2/3.

Codex может изменить названия отдельных columns, если сохраняется эта семантика и это объяснено в report.

---

## 8. GOOGLEFINANCE policy

Нужно зафиксировать архитектурное правило:

```text
GOOGLEFINANCE может быть источником рабочего FX preview,
но не является напрямую источником цены зафиксированного расчёта.
```

Запрещён поток:

```text
Quote
→ volatile GOOGLEFINANCE cell
→ total меняется сам
```

Разрешён поток:

```text
source_price
+ current FX preview
        ↓
working current price
        ↓
publish snapshot
        ↓
fixed fx_rate_used
+ fixed unit_price
        ↓
immutable Prices row
```

GoogleFinance formula strings не должны храниться как arbitrary executable code в master-data cells.

Stage 4 должен лишь определить безопасный formula/setup policy для Stage 5.

---

## 9. Публикация pricebook

Патч НЕ реализует publish workflow, но должен формализовать его контракт.

Публикация означает:

```text
spr_price current state
        ↓ validation
new Pricebook_Versions row
        ↓
new immutable Prices rows
```

При публикации для каждой валютной цены должен быть сохранён достаточный provenance для объяснения итоговой цены.

Минимально рассмотреть перенос в immutable `Prices`:

```text
unit_price
currency

source_currency
source_price
fx_rate_used
fx_rate_source
price_derivation_mode
```

Точное минимальное число полей определить после анализа текущей schema.

Не добавлять поля, если существующий provenance contract уже эквивалентно решает задачу.

Ключевой критерий:

> по published snapshot должно быть понятно, какая фиксированная цена использовалась и, для валютной позиции, из какой исходной цены/курса она была получена.

---

## 10. Pricebook lifecycle сохраняется

Accepted Stage 4 policy не отменяется:

```text
DRAFT → ACTIVE → RETIRED
```

Effective periods:

```text
[effective_from, effective_to)
```

Published versions immutable.

Новая цена не переписывает старую.

Точный:

```text
pricebook_version_id
```

должен сохраняться с зафиксированным расчётом/КП.

---

## 11. ORIGINAL / CURRENT_REPRICE

Минимальный будущий quote contract нужно расширить семантикой двух режимов отображения коммерческого предложения:

```text
ORIGINAL
CURRENT_REPRICE
```

### ORIGINAL

Использует:

```text
quantity/input/result snapshot проекта
+
pricebook_version_id,
зафиксированный при исходном расчёте
```

Цель — воспроизвести стоимость на момент расчёта.

### CURRENT_REPRICE

Использует:

```text
тот же зафиксированный quantity/calculation basis
+
текущий опубликованный ACTIVE pricebook
```

Цель — показать, сколько **тот же состав и те же количества** стоят по актуальным опубликованным ценам.

Ключевое правило:

```text
CURRENT_REPRICE ≠ новый layout / новый BOM / новый quantity calculation
```

Это repricing существующего snapshot, а не перепроектирование изделия.

---

## 12. Важная граница «цены на сейчас»

`CURRENT_REPRICE` не должен читать volatile `spr_price` напрямую.

Правильно:

```text
spr_price
→ publish
→ latest applicable ACTIVE Pricebook_Version
→ CURRENT_REPRICE
```

Таким образом незавершённая ручная правка или изменение `GOOGLEFINANCE` не должно самопроизвольно менять официальное КП.

Если пользователю позднее понадобится режим «preview по ещё не опубликованным ценам», это отдельная функция и не входит в этот patch.

---

## 13. Read/write ownership

Добавить для `spr_price` явную policy:

```text
source of truth:
working current price inputs only

writes:
pricing manager/admin/manual entry
future formula/setup fields

reads:
price publication workflow
human preview

manual edit:
разрешено для input fields
```

Published `Pricebook_Versions` / `Prices` сохраняют текущую policy:

```text
immutable / append-only after publication
```

---

## 14. Validation

Расширить machine-readable schema и validator/tests.

Проверить минимум:

### Schema-level

- `spr_price` существует.
- имеет stable key.
- `price_code`/`catalog_item_code` references валидны в соответствии с выбранным contract.
- enum `pricing_mode` валиден.
- mode-specific fields согласованы.
- currency/unit fields типизированы.
- новые immutable price provenance fields корректны.
- quote/reprice contract документирован.

### Semantic policy

Для `MANUAL_RUB`:
- RUB manual price обязателен;
- FX-only inputs не должны требоваться.

Для `FX_AUTO`:
- source currency и source price обязательны;
- manual FX rate не является обязательным источником расчёта.

Для `FX_MANUAL`:
- source currency, source price и manual FX rate обязательны.

Не обязательно строить полноценный row runtime validator Stage 5; достаточно schema contract + проверяемых invariants, соответствующих scope Stage 4.

---

## 15. Какие артефакты обновить

Обновить:

```text
docs/stage-4-google-sheets/google-sheets-schema.md
docs/stage-4-google-sheets/sheets-columns.csv
docs/stage-4-google-sheets/sheets-relations.csv

tools/validate_sheets_schema.py
tests/test_sheets_schema.py
```

Не удалять полезные существующие проверки.

Создать новый отчёт патча:

```text
docs/stage-4-google-sheets/stage-4-price-patch-report.md
```

### Не переписывать историю

Существующий:

```text
docs/stage-4-google-sheets/stage-4-report.md
```

оставить как отчёт первоначально принятого Stage 4.

Допустимо добавить в него короткую ссылку/примечание о superseding price patch только если это действительно улучшает навигацию и не уничтожает исходный baseline.

Каноническим новым ценовым дополнением после приёмки будет `stage-4-price-patch-report.md`.

---

## 16. Что НЕ делать

Не выполнять:

- создание реального Google Sheet;
- GOOGLEFINANCE formulas в реальном workbook;
- Google API auth;
- Apps Script;
- `setupSystem()`;
- publish pricebook implementation;
- UI листа «Коммерческие предложения»;
- Google Sheets №2;
- поиск/выпадающий список КП;
- CURRENT_REPRICE runtime implementation;
- IMPORTRANGE;
- PDF;
- production price population;
- synthetic module recipes;
- Stage 5.

Это patch data contract, а не реализация интерфейса или Google-интеграции.

---

## 17. Acceptance criteria

Patch считается `COMPLETE`, если:

1. Исходные 10 sheets сохранены.
2. Добавлен `spr_price`; итоговая schema содержит 11 sheets.
3. `spr_price` имеет stable row identity и stable `price_code`.
4. Поддержаны `MANUAL_RUB`, `FX_AUTO`, `FX_MANUAL`.
5. `spr_price` явно является mutable working source, а не расчётной истиной.
6. `Pricebook_Versions + Prices` остаются immutable published truth.
7. GOOGLEFINANCE зафиксирован только как future working FX source, не как volatile quote dependency.
8. Publication boundary `spr_price → immutable snapshot` формализован.
9. Published валютная цена сохраняет достаточный FX/source provenance.
10. Existing effective-period/version policy `[from, to)` сохранена.
11. Quote contract различает `ORIGINAL` и `CURRENT_REPRICE`.
12. `ORIGINAL` использует исходный `pricebook_version_id`.
13. `CURRENT_REPRICE` использует тот же quantity basis + latest applicable ACTIVE pricebook.
14. `CURRENT_REPRICE` не читает `spr_price` напрямую.
15. Machine-readable columns/relations schema обновлена.
16. Validator/tests обновлены и PASS.
17. Stage 3 regression tests остаются PASS.
18. Historical fixtures не повышены до production prices.
19. `source-materials` и accepted normalization datasets неизменны.
20. Реальный Google Sheet/Apps Script/setupSystem не созданы.
21. `git diff --check` PASS.
22. Итоговый patch report создан.
23. Working tree после итогового commit clean.
24. Push не выполнялся.
25. Stage 5 не начат.

---

## 18. Итоговый отчёт

Создать:

```text
docs/stage-4-google-sheets/stage-4-price-patch-report.md
```

Минимальная структура:

```markdown
# Stage 4 — Price patch report

## Статус
COMPLETE / PARTIAL / BLOCKED

## Изменение schema
- sheets before
- sheets after

## spr_price contract

## Pricing modes

## Publication boundary

## FX / GOOGLEFINANCE policy

## Immutable published price provenance

## ORIGINAL / CURRENT_REPRICE contract

## Validation / tests

## Совместимость с accepted Stage 4

## Ограничения / deferred implementation

## Git
- branch
- baseline
- commits
- working tree
- push
```

---

## 19. Git

Работать поверх фактического текущего `main`.

Перед изменениями проверить:

```text
git status --short
git branch --show-current
git log -1 --oneline
```

Не делать push.

Не менять accepted Stage 3 code без необходимости.

После завершения:

```text
schema validation
tests
Stage 3 regressions
py_compile where applicable
git diff --check
git status
```

Сделать осмысленный corrective commit/commits.

После patch остановиться.

Stage 5 не начинать.
