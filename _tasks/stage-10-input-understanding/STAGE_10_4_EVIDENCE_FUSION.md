# Stage 10.4 — Evidence Fusion

## Цель

Объединять evidence из нескольких источников в единый Draft Configuration.

## Зачем

Один и тот же параметр может одновременно присутствовать в тексте пользователя, размерной подписи и Vision output. Нужна единая детерминированная логика выбора или фиксации конфликта.

## Источники

```text
USER_CONFIRMATION
USER_DIMENSION
USER_TEXT
IMAGE_TEXT
VISION_ENTITY
DEFAULT_CANDIDATE
```

## Базовый приоритет

```text
USER_CONFIRMATION
→ USER_DIMENSION
→ USER_TEXT
→ IMAGE_TEXT
→ VISION_ENTITY
→ DEFAULT_CANDIDATE
```

Приоритет применяется только когда значения не образуют обязательный конфликт по правилам поля.

## Выход

```text
Unified Draft Configuration
```

с:

```text
candidate_configuration
evidence[]
field_states[]
```

## Acceptance gate

- provenance всех выбранных значений сохраняется;
- конфликтующие явные значения не теряются;
- подтверждённое пользователем значение имеет высший приоритет;
- custom numeric values не нормализуются.
