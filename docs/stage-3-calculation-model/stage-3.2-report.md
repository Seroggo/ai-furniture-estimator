# AI Мебельщик — Этап 3.2
## Итоговый отчёт / accepted baseline

## Статус

```text
COMPLETE / ACCEPTED / CLOSED
```

## Исходный baseline

Этап 2:

```text
legacy / basis / medvedev — PASS
3 проекта
25 компонентов
655 нормализованных позиций
23 исключения
```

Git baseline Этапа 2:

```text
b9d2d47
```

Внешний baseline Этапа 3.1:

```text
source-materials/kitchen-module-reference-comparison.csv
```

## Выборка

Проверены:

```text
P-2024-08-01 — legacy
P-2025-04-01 — basis
P-2026-01-16 — medvedev
```

Использованы:

1. нормализованные данные Этапа 2;
2. визуальные PDF с планами, фасадами и размерными цепочками.

Резервные проекты не использовались.

## Доказательные правила

Принято:

```text
detail dimension != module dimension
facade dimension != module dimension без доказанной связи
```

Табличный слой не содержит прямых `module_width / module_height / module_depth`.

Визуальный слой позволил доказать отдельные секционные ширины, размерные цепочки и один функционально определённый слот техники.

## Проверенные визуальные источники

### P-2024-08-01

```text
Кухня_01.08.24.pdf
pages 3–6
```

Доказанная цепочка:

```text
390 | 350 | 600 | 600 | 600 | 40 = 2580
```

### P-2025-04-01

```text
Кухня_01.04.25.pdf
pages 2–4
```

Основная цепочка:

```text
100 | 600 | 600 | 900 | 600 | 100 | 600
```

Остров:

```text
600 | 600 | 900
```

Функционально доказанный слот:

```text
ПММ 600 мм
```

`40 / 50 / 40` не классифицированы как доборы: роль не доказана.

### P-2026-01-16

```text
Кухня_16.01.26.pdf
pages 1, 4–5
```

Доказанная цепочка:

```text
450 | 450 | 450 | 450 = 1800
```

## Visual evidence

```text
23 DIRECT_VISUAL наблюдения
```

Для наблюдений сохранены project, source, page/view, position, dimension type, value, role where proven, provenance and confidence.

## Market comparison

Для секций с неизвестной функциональной ролью доказано только присутствие ширины в market baseline:

```text
450 — WIDTH_PRESENT_IN_MARKET_BASELINE
600 — WIDTH_PRESENT_IN_MARKET_BASELINE
900 — WIDTH_PRESENT_IN_MARKET_BASELINE
```

Единственный семантически определённый market match:

```text
600 мм
base_dishwasher_slot
EXACT_MARKET_MATCH
market rank A
```

## MARKET_STANDARD

Подтверждён:

```text
600-мм слот ПММ
P-2025-04-01
```

## STUDIO_STANDARD

```text
NOT PROVEN
```

Сильнейший повторяемый сигнал:

```text
section_width = 600 мм
observation_count = 9
section_count = 9
project_count = 2
```

Но функциональная роль большинства секций неизвестна, а 600 мм является сильным market standard. Поэтому специфический `STUDIO_STANDARD` не выводится.

## PROJECT_EXCEPTION

Доказанных модульных `PROJECT_EXCEPTION` нет.

## UNRESOLVED

Не доказаны:

- функциональная семантика части секций 450 / 600 / 900;
- стандартные ширины корпусов по функциям;
- высоты корпусов;
- глубины корпусов;
- собственные правила студии по доборам;
- устойчивые функциональные комбинации.

## Принятый baseline для следующих этапов

1. Market baseline 3.1 — внешний справочник типовых размеров.
2. Размеры деталей и фасадов нельзя использовать как размеры модулей без доказанной связи.
3. В реальных проектах доказаны секционные ширины 450, 600 и 900 мм.
4. 600 мм повторяется минимум в двух независимых проектах.
5. Единственный доказанный функциональный `MARKET_STANDARD` — слот ПММ 600 мм.
6. Собственный `STUDIO_STANDARD` не доказан.
7. Отсутствие `STUDIO_STANDARD` не блокирует дальнейшее проектирование.
8. Неизвестные правила студии нельзя восстанавливать предположениями.

## Резервные проекты

На текущем этапе не подключать.

Дополнительный исторический проект сам по себе не устраняет главный дефицит доказательств. Для доказательства собственных стандартов нужен источник, где одновременно явно заданы:

```text
роль модуля
ширина корпуса
высота корпуса
глубина корпуса
положение в композиции
```

## Артефакты

```text
docs/stage-3-calculation-model/studio-module-comparison.csv
docs/stage-3-calculation-model/studio-module-analysis.md
docs/stage-3-calculation-model/studio-module-visual-evidence.csv
source-materials/kitchen-module-reference-comparison.csv
```

## Git

```text
branch: main
be66bea docs: compare market baseline with visual project evidence
7a792c9 docs: finalize stage 3.2 evidence report
working tree: clean
push: NO
```
