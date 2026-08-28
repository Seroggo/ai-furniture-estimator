# Stage 10.7 — Local End-to-End Alpha

## Цель

Собрать и проверить локальную вертикаль Stage 10 целиком.

## Зачем

До общей интеграции нужен доказанный pipeline от пользовательского ввода до подтверждённого расчётного входа и запуска Construction Core.

## Сценарии

### A — изображение + размеры + описание

Ожидается:

```text
Evidence
→ Draft
→ минимальные уточнения
→ Confirmed Configuration
→ Construction Core
```

### B — изображение + описание, часть размеров отсутствует

Ожидается:

```text
Evidence
→ Draft
→ Dynamic Brief
→ user confirmation fixture
→ Confirmed Configuration
→ Construction Core
```

### C — только изображение

Ожидается корректное структурированное распознавание и список недостающих данных. Расчёт запускается только если confirmed contract может быть сформирован.

## Golden regression

Текущий golden kitchen используется как один из E2E fixtures:

```text
source input
→ Stage 10 pipeline
→ Confirmed Configuration
→ Construction Core
```

Сравнение проводится с текущим canonical Construction Core behavior.

## Stage 10 completion gate

Stage 10 считается завершённым, когда:

1. Evidence создаётся из входных источников.
2. Draft хранит known/missing/conflict/confirmation states.
3. Clarification формирует необходимые вопросы.
4. Ответы приводят к валидному Confirmed Configuration.
5. Confirmed Configuration запускает Construction Core без ручной правки.
6. Local E2E regression suite проходит полностью.
