# Calculations UX contract — deferred to Stage 10

`Calculations` — будущий human-facing реестр всех проектов/расчётов. Этот patch
фиксирует contract, но физический sheet, storage и runtime не создаёт.

## Identities

```text
project_id
→ immutable technical project identity

calculation_no
→ unique monotonic human-readable calculation number

quote_id
→ immutable identity конкретной версии КП
```

`calculation_no` уникален и сквозной. Адрес объекта является важным search/display
attribute, но не primary key. Display selector:

```text
000127 | Ленина, 25 | Иванов
```

## Human-visible columns

```text
№ расчёта
Дата
Клиент
Адрес объекта
Телефон
Менеджер
Статус
Версия КП
Сумма на момент расчёта
Сумма по текущим ценам
Дата обновления
Комментарий
```

`Сумма на момент расчёта` соответствует ORIGINAL snapshot. `Сумма по текущим
ценам` может появиться только после Stage 10 implementation принятой
CURRENT_REPRICE semantics. Quote DB, CRM workflow и физическая реализация
deferred; пустой `Calculations` сейчас запрещён.
