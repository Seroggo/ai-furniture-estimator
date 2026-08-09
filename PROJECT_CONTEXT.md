# AI Мебельщик — PROJECT_CONTEXT

## 1. Назначение

AI Мебельщик — внутренняя MVP-система предварительного расчёта мебели.

Первая и единственная категория MVP:

```text
Кухни
```

Система должна принимать текстовое описание, размеры, эскизы, рендеры и простые чертежи, преобразовывать их в структурированную конфигурацию и рассчитывать предварительную стоимость кухни.

## 2. Базовый принцип

```text
LLM понимает и структурирует.
Детерминированный код проверяет, конфигурирует и рассчитывает.
Google Sheets хранит расчётные данные и результаты.
```

LLM:
- распознаёт свободный текст и визуальные материалы;
- формирует структурированный Project JSON;
- сообщает о недостающих данных и допущениях;
- может формировать текст коммерческого предложения.

LLM не:
- рассчитывает итоговую стоимость;
- является источником цен;
- заменяет детерминированные правила расчёта.

## 3. Архитектура MVP

```text
Google Drive
├── исходные эталонные файлы
├── файлы клиентских заявок
└── итоговые PDF

Google Sheets №1 — Расчётная база
├── эталонные проекты
├── эталонные позиции
├── нормативы модулей
├── актуальный прайс
├── правила расчёта
├── справочники
└── конфигурация LLM

Apps Script Web App
├── интерфейс менеджера
├── вызов OpenRouter API
├── мультимодальное распознавание
├── валидация конфигурации
├── детерминированный расчёт
└── запись результата

Google Sheets №2 — База КП
├── заявки
├── реестр КП
├── параметры КП
├── позиции КП
├── статусы
└── журнал ошибок

Персональные Google Sheets менеджеров
└── IMPORTRANGE
    → выбор quote_id
    → дашборд КП
    → экспорт PDF
```

Для MVP не используются:
- Supabase;
- Vercel;
- отдельная SQL-база;
- отдельный облачный backend;
- RAG / embeddings / vector DB;
- сложный каскад агентов;
- дополнительные категории мебели.

LLM API:

```text
OpenRouter
```

Конкретная мультимодальная модель будет выбрана позже по benchmark на реальных материалах.

## 4. Канонический план проекта

```text
Этап 0. Репозиторий и Wiki
Этап 1. Аудит исходных файлов
Этап 2. Нормализация эталонов
Этап 3. Расчётная модель
Этап 4. Схема Google Sheets
Этап 5. setupSystem()
Этап 6. Apps Script baseline + clasp
Этап 7. OpenRouter parser
Этап 8. Расчётное ядро
Этап 9. Web App
Этап 10. База КП и персональный дашборд
Этап 11. PDF
Этап 12. Технический E2E
Этап 13. Backtest ±10%
Этап 14. Ограниченный пилот
```

Любой более короткий 7-этапный план из старых контекстных файлов считать устаревшим.

## 5. Текущее состояние

```text
Этап 0 — ACCEPTED
Этап 1 — ACCEPTED
Этап 2 — ACCEPTED WITH DEBT
Этап 3.1 — ACCEPTED / CLOSED
Этап 3.2 — ACCEPTED / CLOSED
Этап 3.3 — ACCEPTED / CLOSED
Следующий подэтап — 3.4
```

### Этап 2 — нормализация

Нормализованы три репрезентативных проекта:

```text
P-2024-08-01 — legacy
P-2025-04-01 — basis
P-2026-01-16 — medvedev
```

Итог:

```text
3 проекта
25 компонентов
655 нормализованных позиций
23 исключения
17 364 проверки — PASS
```

Git baseline Этапа 2:

```text
b9d2d47
```

Резервные/holdout:

```text
P-2021-08-01
P-2023-07-01
P-2026-05-22
```

### Этап 3.1 — внешний market baseline

Канонический машиночитаемый справочник:

```text
source-materials/kitchen-module-reference-comparison.csv
```

Ключевые выводы:

- 600 мм — главный межрыночный размерный класс;
- 300 / 400 / 450 / 800 / 900 мм — сильные регулярные ширины в соответствующих классах;
- 150 / 200 мм — специализированные cargo/bottle размеры;
- 450 / 600 мм — стандартные классы слотов ПММ;
- корпус, фасад, ниша техники и физический размер прибора должны храниться раздельно;
- угловые геометрии system-specific;
- универсальный `STUDIO_STANDARD` из market baseline не выводится.

### Этап 3.2 — сравнение с кейсами студии

Проверены:

```text
P-2024-08-01
P-2025-04-01
P-2026-01-16
```

Доказаны визуальные секционные ширины:

```text
450
600
900
```

600 мм:

```text
9 наблюдений
9 секций
2 независимых проекта
```

Единственный функционально доказанный `MARKET_STANDARD`:

```text
600-мм слот ПММ
```

`STUDIO_STANDARD` не доказан.

Принятый отчёт:

```text
docs/stage-3-calculation-model/stage-3.2-report.md
```

### Этап 3.3 — детерминированный компоновщик

Принятый отчёт:

```text
docs/stage-3-calculation-model/stage-3.3-report.md
```

Реализован Python PoC прямого ряда:

```text
calculation_model/layout_configurator.py
tests/test_layout_configurator.py
```

Принятые свойства:

```text
hard constraints > optimisation
market baseline читается из canonical CSV
A/B/C → automatic generic candidates
D → только специализированная роль или явное разрешение
E → автоматически не используется
filler → отдельная сущность
произвольная ширина → не создаётся
NO_VALID_LAYOUT → явный результат
STUDIO_STANDARD → не введён
```

Проверки:

```text
18 / 18 tests — PASS
git diff --check — PASS
source-materials — unchanged
stages/02-normalization — unchanged
```

Git:

```text
implementation: a2af1b4
final accepted result: 8535887
branch: main
working tree: clean
push: NO
```

Ограничение:

```text
corner / L / U layouts
→ NOT_SUPPORTED
пока нет принятого system-specific профиля
```

## 6. Подтверждённые расчётные факты из Этапов 1–2

Использовать только с provenance и с учётом конкретного типа источника.

### Геометрическая площадь

```text
area_m2 = length_mm × width_mm × qty × 0.000001
```

### Legacy material

```text
material_cost = area_m2 × price_per_m2
```

### Basis

```text
item_cost = order_qty × price
```

### Кромка

```text
edge_length_m =
    (length_mm × qty × edge_length_flag × 0.001)
  + (width_mm × qty × edge_width_flag × 0.001)

edge_cost = edge_length_m × edge_rate
```

### Area-based work

```text
work_cost = area_m2 × work_rate
```

### Legacy detail total

Исторически подтверждена логика:

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

### Известные legacy totals

```text
P-2021-08-01 → 424022.31
P-2024-08-01 → 362372.73
```

### Ограничения

- Basis имеет компонентные суммы, но не всегда имеет однозначный whole-project total.
- В Basis существуют альтернативные варианты; их нельзя суммировать как одновременно выбранные.
- В некоторых источниках встречаются коэффициенты заказа 1.15–1.20 для листовых материалов/кромки; универсальное правило округления не доказано.
- Исторические цены не являются текущим pricebook.
- Для countertop в основном наблюдается `price × qty`, но есть ручная аномалия доставки `800 × 1 → 5000`.
- Medvedev содержит экспертные/неформализованные детали и фурнитуру. Нельзя изобретать скрытые правила. Использовать только явно присутствующие строки и доказанные зависимости.
- Прямой доказанный mapping `module → parts` пока не принят как универсальный норматив.

## 7. Текущий подэтап 3.4

Цель:

```text
ordered modules
→ parts / explicit calculation items
→ quantities
→ materials
→ hardware
→ works
```

с разделением:

```text
quantity model × pricebook = cost
```

Этап 3.4 должен формализовать только доказанные правила и явно маркировать недоказанные переходы.

Статусы правил:

```text
CONFIRMED
DERIVED
PROVISIONAL
REQUIRES_EXPERT
NOT_SUPPORTED
```

Подробный контракт:

```text
docs/stage-3-calculation-model/stage-3.4-context.md
```

## 8. Управление реализацией

Постоянные правила Codex:

```text
AI_FURNITURE_EXECUTION.md
```

По умолчанию:

```text
NORMAL
```

Штаб управляет целью, scope, baseline, риском и acceptance criteria.

Codex управляет технической декомпозицией, реализацией, тестами, исправлениями, Git commit и stage report.

## 9. Рабочие пути

Корень:

```text
C:\Project_all\ai-furniture-estimator
```

Контекст и артефакты Этапа 3:

```text
docs/stage-3-calculation-model/
```

Market baseline:

```text
source-materials/kitchen-module-reference-comparison.csv
```

Нормализованные данные Этапа 2 — найти в текущей структуре репозитория; известный provenance указывает на:

```text
stages/02-normalization/
```

Исходные материалы по умолчанию READ ONLY.

## 10. Правило локального контекста

```text
AI_FURNITURE_EXECUTION.md
→ как Codex работает

PROJECT_CONTEXT.md
→ общий принятый baseline проекта

stage-X-context.md
→ контракт текущего этапа

stage-X-report.md
→ фактический итог этапа
```

Промт Codex должен ссылаться на эти файлы и не дублировать весь контекст.
