# AI Мебельщик — PROJECT_CONTEXT

## 1. Назначение

AI Мебельщик — внутренняя MVP-система предварительного расчёта кухонной мебели.

Первая и единственная категория MVP:

```text
Кухни
```

Базовый принцип:

```text
LLM понимает и структурирует.
Детерминированный код проверяет, конфигурирует и рассчитывает.
Google Sheets хранит расчётные данные и результаты.
```

LLM не является источником цен и не рассчитывает итоговую стоимость.

## 2. Каноническая архитектура MVP

```text
Google Drive
├── исходные эталонные файлы
├── файлы клиентских заявок
└── итоговые PDF

Google Sheets №1 — Расчётная база
├── reference data
├── нормативы модулей
├── module recipes
├── материалы / фурнитура / работы
├── актуальный pricebook
├── правила расчёта
├── справочники
└── конфигурация системы

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

## 3. Канонический план

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

Любой старый сокращённый план считать неканоническим.

## 4. Статус проекта

```text
Этап 0 — ACCEPTED
Этап 1 — ACCEPTED
Этап 2 — ACCEPTED WITH DEBT
Этап 3.1 — ACCEPTED / CLOSED
Этап 3.2 — ACCEPTED / CLOSED
Этап 3.3 — ACCEPTED / CLOSED
Этап 3.4 — ACCEPTED / CLOSED

Этап 3 — CLOSED

Текущий этап — 4
```

Git baseline после Этапа 3.4:

```text
branch: main
HEAD: 3dd047b
working tree: clean
push: NO
```

## 5. Этап 2 — нормализация

Репрезентативные проекты:

```text
P-2024-08-01 — legacy
P-2025-04-01 — basis
P-2026-01-16 — medvedev
```

Нормализованный набор:

```text
3 проекта
25 компонентов
655 позиций
23 исключения
17 364 проверки — PASS
```

Резервные/holdout:

```text
P-2021-08-01
P-2023-07-01
P-2026-05-22
```

## 6. Этап 3 — принятый расчётный baseline

### 6.1. Market baseline

Канонический внешний справочник:

```text
source-materials/kitchen-module-reference-comparison.csv
```

Не является собственной размерной сеткой студии.

### 6.2. Studio evidence

Доказаны визуальные ширины:

```text
450
600
900
```

Доказанный функциональный market standard:

```text
600-мм слот ПММ
```

```text
STUDIO_STANDARD = NOT PROVEN
```

### 6.3. Layout configurator

Принятый код:

```text
calculation_model/layout_configurator.py
tests/test_layout_configurator.py
```

Свойства:

```text
hard constraints > optimisation
market baseline читается из canonical CSV
A/B/C → automatic generic candidates
D → специализированная роль или явное разрешение
E → автоматически не используется
filler → отдельная сущность
NO_VALID_LAYOUT → явный результат
произвольные ширины не создаются
```

Угловые / L / U layouts:

```text
NOT_SUPPORTED
```

до появления system-specific профиля.

Принятый отчёт:

```text
docs/stage-3-calculation-model/stage-3.3-report.md
```

### 6.4. Calculation layer

Принятый код:

```text
calculation_model/calculation_engine.py
tests/test_calculation_engine.py
```

Архитектурный принцип:

```text
quantity model × pricebook = cost
```

Количество и цена разделены.

Формализованы подтверждённые quantities/formulas:

```text
area_m2
edge_length_m
explicit source/order quantity
quantity × unit_price
legacy detail aggregation с явно переданными J2/K2
Basis order_qty × price
```

Historical prices используются только как fixtures/evidence и не являются current pricebook.

Принятый отчёт:

```text
docs/stage-3-calculation-model/stage-3.4-report.md
```

Тесты после 3.4:

```text
calculation: 11 / 11 PASS
layout regression: 18 / 18 PASS
total: 29 / 29 PASS
```

## 7. Открытый экспертный долг

Не блокирует Этап 4.

```text
module → parts = REQUIRES_EXPERT
Basis alternative selection = REQUIRES_EXPERT
order coefficients / rounding = REQUIRES_EXPERT
hidden Medvedev logic = REQUIRES_EXPERT / NOT_SUPPORTED
legacy J2/K2 semantics = REQUIRES_EXPERT
```

Этап 4 должен предусмотреть место для будущих module recipes и экспертных правил, но не заполнять их выдуманными значениями.

## 8. Этап 4 — цель

Спроектировать каноническую схему Google Sheets №1 — «Расчётная база».

Этап 4:

```text
НЕ создаёт реальный Google Sheet
НЕ пишет Apps Script
НЕ пишет setupSystem()
```

Он создаёт локальный, проверяемый контракт данных, на основании которого Этап 5 сможет механически создать рабочую таблицу.

Подробный контракт:

```text
docs/stage-4-google-sheets/stage-4-context.md
```

## 9. Постоянные правила реализации

Использовать:

```text
AI_FURNITURE_EXECUTION.md
```

Режим по умолчанию:

```text
NORMAL
```

## 10. Контекстная иерархия

```text
AI_FURNITURE_EXECUTION.md
→ постоянные правила реализации

PROJECT_CONTEXT.md
→ текущий общий baseline

stage-X-context.md
→ контракт этапа

stage-X-report.md
→ принятый фактический результат

код / CSV / tests
→ канонические технические данные
```

Промт Codex должен ссылаться на локальные файлы, а не дублировать весь контекст.
