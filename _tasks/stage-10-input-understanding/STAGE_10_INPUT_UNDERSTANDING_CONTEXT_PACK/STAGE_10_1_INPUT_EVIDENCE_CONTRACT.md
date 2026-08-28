# Stage 10.1 — Input / Evidence Contract

## Цель

Создать минимальные канонические структуры:

```text
Evidence[]
Draft Configuration
Confirmed Configuration
```

и детерминированный mapper:

```text
Draft Configuration
→ Confirmed Configuration
```

## Зачем

Vision, текстовый разбор, уточнения пользователя и defaults должны записывать результаты в один формат. Без общего контракта следующие подэтапы будут зависеть друг от друга напрямую.

## Основные сущности

### Evidence

Один факт или наблюдение с указанием:

```text
target_path
value
source_type
confidence
state
source_ref
```

### Draft Configuration

Промежуточная конфигурация, в которой допускаются:

```text
KNOWN
MISSING
CONFLICT
NEEDS_CONFIRMATION
```

### Confirmed Configuration

Финальный JSON, совместимый с существующей схемой:

```text
_tasks/alpha-construction-core/CONFIRMED_CONFIGURATION_V1.schema.json
```

## Основной результат

Успешный mapper возвращает валидный `Confirmed Configuration`.

Неразрешённое обязательное поле блокирует создание confirmed JSON и возвращается как issue.

## Acceptance gate

- схемы Evidence и Draft существуют;
- mapper детерминирован;
- successful output валиден по `CONFIRMED_CONFIGURATION_V1.schema.json`;
- custom width `733` сохраняется как `733`;
- regression tests включены в общий test suite.
