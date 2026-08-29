# Human UX contract

## Принцип

```text
человек работает с понятными интерфейсными листами
        ↓
deterministic adapter / normalization
        ↓
машина работает с canonical technical sheets
```

Human-facing слой не заменяет accepted Stage 4 data model. Каноническая модель
после patch состоит из двух явно разделённых контрактов:

```text
accepted technical schema
docs/stage-4-google-sheets/sheets-columns.csv
docs/stage-4-google-sheets/sheets-relations.csv
→ 11 technical sheets / 136 columns

explicit Human UX extension
docs/human-ux-patch/custom-price-schema.json
→ Custom_Price
```

Оба manifest генерируются и машинно проверяются. Generated `.gs` не редактируются
вручную.

## Human и machine sheets

Human-facing сейчас:

```text
Custom_Price → Актуальный прайс
```

Human-facing позднее, только Stage 10 contracts:

```text
Calculations → Реестр расчётов
Offer        → Коммерческое предложение
```

Technical:

```text
Schema_Meta
System_Config
Module_Size_Rules
Module_Recipes
Module_Recipe_Items
Catalog_Items
spr_price
Pricebook_Versions
Prices
Calculation_Rules
Reference_Values
```

В DEV technical sheets остаются видимыми для отладки. В production они могут
быть hidden/protected отдельной deployment policy; этот patch их не скрывает.

## Pricing architecture

```text
Менеджер
  ↓
Custom_Price
human source of current working inputs
  ↓ syncCustomPrice()
Catalog_Items + spr_price
normalized machine working layer
  ↓ future explicit publication
Pricebook_Versions + Prices
immutable published calculation truth
```

`Custom_Price` не заменяет `spr_price`, не пишет в `Prices` и не меняет
опубликованные или уже рассчитанные КП.

## Custom_Price fields

Видимые editable поля имеют светло-жёлтый фон:

| Поле | Назначение |
|---|---|
| Категория | понятная мебельщику группа |
| Наименование | mutable display name, не relation key |
| Ед. изм. | реальная единица стоимости |
| Цена | RUB price или исходная валютная цена |
| Валюта | RUB, USD, EUR, CNY |
| Режим цены | Рубли / По текущему курсу / По ручному курсу |
| Курс ручной | ввод только для ручного FX |
| Активна | checkbox, false означает deactivate |
| Комментарий | рабочая заметка |

Calculated/system visible fields имеют светло-голубой фон и warning protection:

```text
Курс текущий
Цена в ₽
Дата обновления
```

Русские dropdown values:

```text
Категория:
ЛДСП, МДФ, Фасады, Столешницы, Кромка,
Фурнитура, Работы, Доставка, Прочее

Ед. изм.:
м², пог.м, шт, комплект, проект

Режим цены:
Рубли, По текущему курсу, По ручному курсу
```

Title row, frozen headers, filter, column widths, formats, dropdowns и визуальное
разделение восстанавливаются `setupSystem()` без очистки пользовательских строк.

## Stable identity

Скрытые и warning-protected поля:

```text
custom_price_id
catalog_item_code
price_code
working_price_id
```

При первом sync система генерирует random stable `custom_price_id`, сохраняет его
в строке и однозначно выводит остальные IDs. Повторный sync использует те же IDs.
Изменение категории или наименования не меняет identity. Ручное повреждение hidden
IDs вызывает ошибку вместо создания дубликата.

## Mapping

Category mapping:

```text
ЛДСП / МДФ / Фасады / Столешницы → MATERIAL
Кромка                            → EDGE
Фурнитура                         → HARDWARE
Работы                            → WORK
Доставка / Прочее                 → SERVICE
```

Unit mapping:

```text
м²       → m2
пог.м    → m
шт       → pcs
комплект → set
проект   → project
```

Каждая human row сначала полностью валидируется. Только если все строки valid,
adapter выполняет idempotent upsert:

```text
Custom_Price identity
→ Catalog_Items.catalog_item_code
→ spr_price.working_price_id / price_code
```

Повторный sync обновляет существующие managed rows. Удалённая human row не
удаляет machine data: соответствующие `Catalog_Items` / `spr_price` переводятся
в `RETIRED` / `INACTIVE`. Никакие production rows не создаются без human row.

## Pricing modes and FX

### Рубли → MANUAL_RUB

```text
Цена = 1850
Валюта = RUB
Цена в ₽ = 1850
```

FX fields machine layer остаются пустыми.

### По текущему курсу → FX_AUTO

```text
Цена = source_price
Валюта = USD / EUR / CNY
Курс текущий = cached GOOGLEFINANCE preview
Цена в ₽ = Цена × Курс текущий
```

### По ручному курсу → FX_MANUAL

```text
Цена = source_price
Курс ручной > 0
Цена в ₽ = Цена × Курс ручной
```

В hidden FX cache существуют ровно три volatile calls — по одному для USD, EUR,
CNY. Формулы одноаргументные, без `,`/`;`, поэтому не зависят от separator locale
`ru_RU`. Human rows переиспользуют cache при explicit sync; отдельный call на
каждую строку не создаётся.

`GOOGLEFINANCE` используется только как working preview. `Prices` при будущей
publication фиксирует source price/currency, used rate/source и RUB unit price.
Official calculation, ORIGINAL и CURRENT_REPRICE не читают volatile cache.

## Sync UX and safety

Явная команда:

```text
AI Furniture → Обновить актуальный прайс
```

вызывает `syncCustomPrice()`.

Нет `onEdit`, auto-publish или hidden publication logic. Ошибка содержит номер
human row. Invalid row не создаёт `READY` machine row. Adapter возвращает
`publishedRowsChanged: 0` и не обращается к immutable pricebook sheets.

## setupSystem

`setupSystem()` поддерживает:

```text
12 physical sheets total
1 Human UX sheet + 11 accepted technical sheets
136 accepted technical columns unchanged
```

Он создаёт/проверяет `Custom_Price`, восстанавливает UX settings и hidden cache,
но не очищает rows и не перегенерирует существующие stable IDs.
