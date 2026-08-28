# Stage 10.6 — Confirmed Configuration → Construction Core

## Цель

Соединить подтверждённый вход Stage 10 с существующим Construction Core через стабильный contract boundary.

## Зачем

Верхний слой отвечает за понимание и подтверждение проекта, Construction Core — за детерминированный расчёт. Граница между ними должна быть проверяема тестами.

## Вход

```text
Confirmed Configuration
```

валидный по:

```text
_tasks/alpha-construction-core/CONFIRMED_CONFIGURATION_V1.schema.json
```

## Выход

Текущий canonical Construction Core result:

```text
Parts
Materials
Edge
Hardware
Manufacturing_features
Issues
Benchmark
```

## Ключевая проверка

Подтверждённые числовые значения должны доходить до ядра без скрытого преобразования.

Пример:

```text
confirmed width = 733
→ Construction Core input width = 733
→ generated geometry использует 733
```

## Acceptance gate

- adapter проходит contract tests;
- unresolved blocking fields не создают confirmed JSON;
- confirmed input запускает Construction Core без ручной правки;
- regression test сохраняет custom dimensions.
