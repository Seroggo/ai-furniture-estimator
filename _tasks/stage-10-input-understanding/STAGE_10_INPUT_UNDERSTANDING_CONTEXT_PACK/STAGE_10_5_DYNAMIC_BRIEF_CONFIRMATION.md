# Stage 10.5 — Dynamic Brief / Confirmation

## Цель

Преобразовать clarification result в короткий пользовательский бриф и принять ответы обратно в Draft.

## Зачем

Пользователь должен уточнять только реально отсутствующие или спорные параметры конкретного проекта.

## Структура брифа

Минимально:

```text
understood
defaults_to_confirm
questions
conflicts
blockers
```

Для каждого вопроса сохраняется связь с:

```text
target_path
evidence
state
```

## Результат подтверждения

Ответ пользователя создаёт новый evidence:

```text
source_type = USER_CONFIRMATION
```

и обновляет соответствующий `field_state`.

## Acceptance gate

- brief формируется из clarification result;
- ответ пользователя обновляет конкретное поле;
- принятый default становится подтверждённым evidence;
- после закрытия blockers Draft может быть передан mapper Stage 10.1.
