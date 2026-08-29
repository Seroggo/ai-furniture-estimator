# Этап 3.4 — Отчёт

## Статус

```text
COMPLETE
```

## Что реализовано

Создан минимальный детерминированный lower calculation layer:

```text
calculation_model/calculation_engine.py
tests/test_calculation_engine.py
```

Слой содержит типизированные calculation items, отдельный `PriceInput`, точный Decimal-расчёт стоимости, legacy aggregation, безопасную обработку альтернатив и интерфейс `LayoutItem → parts`. Исходные материалы, accepted normalization datasets и компоновщик 3.3 не изменялись.

## Rule registry

Машинно проверяемый `RULE_REGISTRY` хранит `rule_id`, scope, status, inputs, outputs, provenance и notes.

- `CONFIRMED`: площадь; legacy edge length; явное Basis order quantity; явное source quantity; `quantity × unit_price`; legacy detail aggregation с явно переданными `J2/K2`.
- `DERIVED`: производственных правил этого статуса не добавлено.
- `PROVISIONAL`: правил нет; временные нормативы стоимости/BOM не вводились.
- `REQUIRES_EXPERT`: выбор Basis alternatives; `module role/class/width → parts/materials/edge/hardware/works`.
- `NOT_SUPPORTED`: вывод скрытых Medvedev parts/hardware.

## Quantity model

Формализованы только доказанные quantities:

```text
area_m2 = length_mm × width_mm × qty × 0.000001

edge_length_m =
    (length_mm × qty × edge_length_count × 0.001)
  + (width_mm × qty × edge_width_count × 0.001)

explicit quantity = accepted literal source/order quantity
```

Коэффициенты заказа, округление, скрытые quantities и composition recipes не выводятся.

## Price separation

```text
CalculationItem(quantity, unit, price_code)
× PriceInput(unit_price, unit, price_context, provenance)
= CostResult
```

Цена передаётся вызывающей стороной. Код не содержит pricebook и не классифицирует historical fixture как текущую цену. Несовпадение `price_code` или unit отклоняется. Тест Case Q подтверждает: изменение price input меняет cost, но не quantity item.

## Module → parts status

```text
module_to_parts = REQUIRES_EXPERT
```

Для всех текущих классов `LayoutItem` нет принятого повторяемого mapping полного состава корпуса. `resolve_module_parts()` возвращает пустой набор calculation items, явный статус и перечень требуемых доказательств. Market width, facade/detail dimensions и название модуля не используются как BOM evidence.

## Проверенные historical cases

- L1: `930 × 612 × 3 × 0.000001 = 1.70748 m2`; `1.70748 × 4000 = 6829.92` (`P-2024-08-01`, `Расчет!5`).
- L2: edge quantity `9.252 m`; `9.252 × 200 = 1850.4` (`Расчет!5`).
- L3: area work `1.70748 × 0 = 0`; нулевая historical rate сохранена буквально (`Расчет!5`).
- L4: пересчитаны 75 detail rows и 15 явных нижних строк; total `362372.7313` совпал с `Расчет!P162`, `projects.csv` и accepted validation report.
- B1: `130 × 29 = 3770`; вариант `Ящики №1` воспроизведён как `112800 + 13748 = 126548`. Неизвестные варианты остаются отдельными, combined total отсутствует.
- M1: только явная строка `корпус`: `39 × 2650 = 103350`; скрытая фурнитура не добавлена.

Все цены этих кейсов читаются тестами из accepted normalization dataset только как `historical_fixture`.

## Тесты и проверки

```text
calculation layer: 11 / 11 — PASS
layout configurator regression: 18 / 18 — PASS
full suite: 29 / 29 — PASS
py_compile — PASS
git diff --check — PASS
source-materials diff — отсутствует
stages/02-normalization diff — отсутствует
```

## Неподдерживаемые случаи

- универсальный или автоматический module BOM;
- скрытые Medvedev parts/hardware и правила «по наитию»;
- вывод order coefficient/rounding;
- автоматический выбор Basis alternatives;
- current production pricebook и pricing storage;
- Google Sheets, Apps Script, OpenRouter, Web App, PDF, backtest и следующий этап.

## Ограничения / вопросы для эксперта

- Нужны принятые повторяемые module recipes с part IDs, dimensions, quantities, materials, edge, hardware и works по конкретным module classes/variants.
- Нужны правила выбора Basis alternatives, order coefficients и rounding.
- Нужны производственные правила скрытых Medvedev деталей/фурнитуры, если их требуется автоматизировать.
- Семантика и допустимые диапазоны legacy `J2/K2` не доказаны; PoC использует их только как явные historical evidence inputs (`1/0`).

Эти вопросы не блокируют завершение 3.4: доказанная граница сохранена, нижний расчётный слой воспроизводим.

## Git

- branch: `main`
- context baseline: `a223688`
- implementation: `8006edd`
- report: итоговый docs commit (`HEAD` после завершения)
- working tree: clean после итогового commit
- push: NO
