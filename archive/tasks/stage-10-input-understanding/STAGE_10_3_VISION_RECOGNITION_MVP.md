# Stage 10.3 — Vision Recognition MVP

## Цель

Преобразовывать изображение кухни в структурированный набор Evidence.

## Зачем

Изображение должно стать источником фактов для общего Draft, а не отдельным расчётным контуром.

## Минимально распознаваемые сущности

```text
BASE_CABINET
WALL_CABINET
TALL_CABINET
SINK
DISHWASHER
HOB
OVEN
HOOD
REFRIGERATOR
ISLAND
COUNTERTOP
```

Дополнительно:

```text
layout_type
relative_order
visible_text
visible_dimensions
```

## Выход

```text
Vision Evidence JSON
```

Каждый результат содержит:

```text
target_path
value
source_type = VISION_ENTITY или IMAGE_TEXT
confidence
source_ref
```

## Acceptance gate

- основные функциональные сущности возвращаются структурированно;
- распознанные размерные подписи отделены от визуальных предположений;
- output совместим с Evidence contract Stage 10.1;
- одинаковый fixture можно использовать в regression tests.
