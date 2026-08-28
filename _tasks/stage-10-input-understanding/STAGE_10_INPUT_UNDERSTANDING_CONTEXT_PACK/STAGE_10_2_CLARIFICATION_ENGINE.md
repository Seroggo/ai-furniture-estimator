# Stage 10.2 — Clarification Engine

## Цель

Создать детерминированный анализ Draft Configuration:

```text
Draft
→ understood
→ missing
→ conflicts
→ default candidates
→ blockers
→ questions
```

## Зачем

Система должна задавать пользователю только те вопросы, которые нужны конкретному проекту, и не перекладывать эту логику на Vision-модель.

## Вход

```text
Draft Configuration
```

из Stage 10.1.

## Выход

Минимально:

```text
understood[]
questions[]
default_candidates[]
conflicts[]
blockers[]
```

## Логика

Каждый вопрос должен быть связан с конкретным `target_path`.

Default хранится как кандидат и получает отдельный provenance.

Blocking question означает, что confirmed JSON пока сформировать нельзя.

## Acceptance gate

- один Draft всегда создаёт один и тот же clarification result;
- known fields не запрашиваются повторно;
- conflict сохраняет оба исходных evidence;
- default не становится confirmed value без подтверждения;
- blockers однозначно определяются тестами.
