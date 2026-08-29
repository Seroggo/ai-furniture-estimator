# AI Мебельщик — Этап 3.4
## Контракт: детерминированная расчётная модель

## 1. Режим выполнения

```text
Управление: NORMAL
Рекомендуемый Codex: GPT-5.6 Sol
Reasoning: High
```

Задача затрагивает расчётные правила и потенциально скрытые исторические зависимости. Поэтому при любой недоказанной производственной логике требуется не догадка, а явный статус правила.

Постоянные правила работы находятся в:

```text
AI_FURNITURE_EXECUTION.md
```

---

## 2. Цель

Спроектировать и доказать минимальную детерминированную расчётную модель, которая соединяет принятый результат компоновщика с расчётными сущностями настолько, насколько это подтверждено источниками.

Целевая архитектура:

```text
ordered modules
        ↓
parts / explicit calculation items
        ↓
quantities
        ↓
materials
hardware
works
        ↓
pricebook
        ↓
cost
```

Ключевой принцип:

```text
quantity model × pricebook = cost
```

Количество и цена должны быть разделены.

Этап 3.4 не должен изображать полноту там, где mapping или правило не доказаны.

---

## 3. Обязательный контекст

Перед работой изучить:

```text
AI_FURNITURE_EXECUTION.md
PROJECT_CONTEXT.md

docs/stage-3-calculation-model/stage-3.2-report.md
docs/stage-3-calculation-model/stage-3.3-report.md

source-materials/kitchen-module-reference-comparison.csv
```

Также найти и изучить актуальные результаты Этапов 1–2, включая:

```text
source-audit.md
issues-register.md
data-map.csv
project-register.csv

projects.csv
components.csv
normalized-items.csv
exceptions.csv
validation-report.md
```

Использовать исходные Excel/PDF только для точечной проверки provenance или формулы, если нормализованных данных недостаточно.

`source-materials/` не изменять.

---

## 4. Принятый вход от 3.3

Компоновщик уже умеет вернуть упорядоченный набор `LayoutItem` для прямого ряда с:

- ролью;
- `module_class`;
- шириной;
- market rank;
- provenance market rule;
- filler;
- статусом валидности.

Не менять правила компоновщика ради удобства расчётного слоя.

Если 3.4 требует новой информации, которой `LayoutResult` не содержит, определить минимальный контракт расширения, но не превращать 3.4 в новый этап компоновщика без необходимости.

---

## 5. Главная исследовательская задача 3.4

До реализации полного перехода `module → parts` определить, какие связи реально доказаны.

Нужно явно разделить:

```text
A. подтверждённые формулы расчёта существующих items
B. подтверждённые quantity rules
C. доказанные module → item/part mappings
D. недоказанные производственные правила
```

Если универсальный `module → parts` mapping из локальных данных не доказан, это не ошибка выполнения.

В таком случае:

- не изобретать BOM;
- формализовать доказанный нижний слой расчёта;
- определить интерфейс для будущих module recipes;
- маркировать отсутствующий mapping как `REQUIRES_EXPERT` или `NOT_SUPPORTED`;
- показать, какие данные потребуются для его закрытия.

---

## 6. Статусы правил

Каждое существенное правило должно иметь один из статусов:

```text
CONFIRMED
DERIVED
PROVISIONAL
REQUIRES_EXPERT
NOT_SUPPORTED
```

### CONFIRMED

Правило прямо подтверждено источниками и воспроизводится на данных.

### DERIVED

Правило не записано напрямую, но однозначно выводится из нескольких подтверждённых фактов.

Для `DERIVED` обязательно сохранить derivation/provenance.

### PROVISIONAL

Временное техническое правило допустимо только если оно необходимо для PoC, явно не претендует на производственный норматив и не влияет скрыто на стоимость.

Не использовать `PROVISIONAL` для выдумывания неизвестного BOM или скрытой фурнитуры.

### REQUIRES_EXPERT

Правило требует производственного/экспертного решения, которого нет в данных.

### NOT_SUPPORTED

Правило или сущность сознательно не поддерживается текущим scope.

---

## 7. Подтверждённые формулы, которые необходимо проверить

Не считать этот список достаточным без сверки с локальными источниками.

### 7.1. Area

```text
area_m2 = length_mm × width_mm × qty × 0.000001
```

### 7.2. Legacy material

```text
material_cost = area_m2 × price_per_m2
```

### 7.3. Basis item

```text
item_cost = order_qty × price
```

### 7.4. Edge

```text
edge_length_m =
    (length_mm × qty × edge_length_flag × 0.001)
  + (width_mm × qty × edge_width_flag × 0.001)

edge_cost = edge_length_m × edge_rate
```

### 7.5. Area-based works

```text
work_cost = area_m2 × work_rate
```

### 7.6. Legacy detail aggregation

```text
detail_cost =
    (material_cost + edge_cost + work_costs)
    × J2

if K2 != 0:
    detail_cost = detail_cost / K2
```

В проверенных legacy-примерах:

```text
J2 = 1
K2 = 0
```

Нужно подтвердить семантику полей по источникам перед переносом в код.

---

## 8. Исторические цены

Исторические цены разрешено использовать:

```text
только как fixture/evidence для воспроизведения исторического расчёта
```

Запрещено превращать их в текущий pricebook.

В кодовой модели должны быть разделены:

```text
quantity / measure
price input
cost result
```

Расчётное ядро не должно знать, что историческая цена является «актуальной».

---

## 9. Особенности типов источников

### legacy

Цель:

- воспроизвести подтверждённые формулы;
- проверить известные totals там, где они однозначны;
- не обобщать `J2/K2` дальше доказательств.

Известные reference totals:

```text
P-2021-08-01 → 424022.31
P-2024-08-01 → 362372.73
```

Если один из них является резервным проектом, его можно использовать как calculation holdout без полной перенормализации только при воспроизводимом точечном чтении исходных данных и без изменения accepted Stage 2 datasets.

### basis

Учитывать:

- `item_cost = order_qty × price`;
- компонентные суммы;
- альтернативные варианты;
- отсутствие гарантированного единого whole-project total.

Не суммировать альтернативы как одновременно выбранные позиции.

### medvedev

Учитывать только:

- явно присутствующие source rows;
- подтверждённые quantities/prices/formulas;
- явную фурнитуру, если она действительно присутствует.

Не восстанавливать скрытую экспертную фурнитуру или правила по аналогии.

---

## 10. Module → parts / items

Это ключевая граница 3.4.

Codex должен проверить, существуют ли в данных доказанные связи вида:

```text
module role/class/width
→ конкретный набор деталей
→ размеры деталей
→ количества
→ материал
→ edge
→ hardware
→ works
```

Допустимо доказать связь только если она имеет достаточный provenance и повторяемость.

Запрещено:

- строить recipe модуля из «обычно так делают кухни»;
- использовать market width как доказательство состава корпуса;
- восстанавливать BOM по одному неразмеченному проекту;
- считать фасад доказательством полного корпуса;
- выводить скрытую фурнитуру из названия модуля.

Если доказательств недостаточно, результат должен явно сохранить:

```text
module_to_parts = REQUIRES_EXPERT
```

для соответствующего класса.

---

## 11. Минимальная архитектура результата

Точная файловая структура остаётся за Codex, но результат должен разделять как минимум:

### Calculation item / quantity

Например:

```text
item_type
quantity
unit
dimensions
material_or_work_code
rule_id
rule_status
provenance
```

### Price input

```text
price_code
unit_price
currency / price context if available
```

### Calculated result

```text
quantity
unit_price
cost
formula/rule provenance
```

### Rule registry

Для каждого правила:

```text
rule_id
name
scope
status
inputs
outputs
source/provenance
notes
```

Rule registry должен быть машинно проверяемым или детерминированно читаемым кодом/данными.

---

## 12. PoC и проверки

Нужно создать воспроизводимый PoC, доказывающий расчётный слой на принятых данных.

Минимально:

### Case L1 — legacy area/material

Проверить площадь и material cost на реальной нормализованной строке.

### Case L2 — legacy edge

Проверить edge length и edge cost на реальной строке, где присутствуют необходимые flags/rates.

### Case L3 — legacy work

Проверить area-based work на реальной строке.

### Case L4 — legacy aggregation

Если локальные данные позволяют однозначно воспроизвести detail/project total — проверить его.

Известный `P-2024-08-01 = 362372.73` использовать только если состав и выбор строк действительно однозначны.

### Case B1 — basis

Проверить `order_qty × price` и минимум один воспроизводимый component subtotal.

Альтернативы должны обрабатываться раздельно.

### Case M1 — medvedev

Проверить хотя бы один явный расчётный фрагмент без выдумывания скрытых правил.

### Case Q — price separation

Одинаковые quantities при разных price inputs должны менять cost, не меняя quantity model.

### Case R — unsupported module recipe

Если module→parts mapping не доказан, запрос такого расчёта должен возвращать явный `REQUIRES_EXPERT`/`NOT_SUPPORTED`, а не синтетический BOM.

---

## 13. Acceptance criteria

3.4 считается `COMPLETE`, если:

1. Проверены и формализованы подтверждённые расчётные правила.
2. Каждое существенное правило имеет status и provenance.
3. Количество отделено от цены.
4. Исторические цены не используются как current pricebook.
5. Legacy formulas воспроизводятся на реальных данных там, где source semantics однозначны.
6. Basis `order_qty × price` и компонентный расчёт проверены минимум на одном реальном компоненте.
7. Альтернативы Basis не суммируются как одновременно выбранные.
8. Medvedev не получает выдуманной скрытой фурнитуры/логики.
9. Module→parts mapping либо доказан для конкретных классов, либо честно маркирован `REQUIRES_EXPERT/NOT_SUPPORTED`.
10. Не создаётся универсальный BOM без доказательств.
11. PoC машинно воспроизводим.
12. Есть автоматические tests/validation для подтверждённых правил.
13. Существующий layout configurator и его tests остаются PASS.
14. Не реализованы Google Sheets, Apps Script, OpenRouter, Web App, PDF и pricing storage будущих этапов.
15. `source-materials` и accepted normalization datasets не изменены.
16. `git diff --check` проходит.
17. Итоговый stage report создан.
18. Working tree после commit clean.
19. Push не выполнялся.

Если пункт 9 приводит к `REQUIRES_EXPERT`, это само по себе не делает этап `PARTIAL`: этап может быть `COMPLETE`, если граница доказательно установлена и нижний расчётный слой реализован корректно.

---

## 14. Не делать

Не выполнять на 3.4:

- Google Sheets schema;
- Apps Script;
- `setupSystem()`;
- OpenRouter parser;
- UI/Web App;
- PDF;
- current production pricebook;
- финальный ±10% backtest;
- промышленную оптимизацию layout configurator;
- угловой configurator без system-specific profile;
- автоматическое создание module recipes из общерыночных знаний;
- следующий этап.

---

## 15. Итоговый отчёт

Создать:

```text
docs/stage-3-calculation-model/stage-3.4-report.md
```

Минимальная структура:

```markdown
# Этап 3.4 — Отчёт

## Статус
COMPLETE / PARTIAL / BLOCKED

## Что реализовано

## Rule registry
- CONFIRMED
- DERIVED
- PROVISIONAL
- REQUIRES_EXPERT
- NOT_SUPPORTED

## Quantity model

## Price separation

## Module → parts status

## Проверенные historical cases

## Тесты и проверки

## Неподдерживаемые случаи

## Ограничения / вопросы для эксперта

## Git
- branch
- commits
- working tree
- push
```

Отчёт должен быть коротким техническим baseline, а не журналом действий.

---

## 16. Git

Перед работой проверить Git baseline.

Не менять accepted history.

Не делать push.

Итоговые commits должны быть осмысленными и относиться к 3.4.

После выполнения acceptance criteria создать `stage-3.4-report.md`, привести working tree в clean и остановиться.

Не начинать следующий этап без решения Штаба.
