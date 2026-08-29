# TARGET_SHEETS_ARCHITECTURE_V1

## Статус

**APPROVED TARGET ARCHITECTURE — NOT YET IMPLEMENTED**

Этот документ фиксирует целевую архитектуру Google Sheets для проекта `AI Furniture Estimator` после перехода от табличного/recipe-based расчёта к отдельному `Construction Core`.

Документ описывает **куда должна прийти система**. Он не является описанием текущей физической таблицы и не разрешает автоматически удалять старые листы до dependency audit.

---

## 1. Главный архитектурный принцип

Google Sheets больше не является расчётным ядром.

Google Sheets используется только для:

- пользовательских редактируемых данных;
- конфигурационных defaults;
- представления последнего результата;
- краткой истории расчётов;
- технического состояния последнего запуска.

Предметная логика находится в коде:

```text
Input / Vision / Text
        ↓
Stage 10
        ↓
Confirmed Configuration
        ↓
Construction Core
        ↓
Costing
        ↓
BOM Result
        ↓
Google Sheets output
```

---

## 2. Целевая физическая структура Google Sheets

Основная целевая структура содержит **ровно пять листов**:

```text
1. Custom_Price
2. Construction_Defaults
3. BOM_LAST
4. CALC_LOG
5. SYSTEM
```

Шестой лист не добавляется без отдельного доказанного требования.

---

# 3. Custom_Price

## Назначение

`Custom_Price` — единый пользовательский каталог материалов, фурнитуры, работ и других ценовых позиций, используемых при costing.

Он является:

```text
persistent source of truth for current prices
```

Менеджер/заказчик может редактировать его вручную.

Для demo-версии лист заполняется тестовыми данными. После передачи системы заказчик заменяет их своими актуальными данными.

## Принцип

Целевая архитектура **не использует отдельную цепочку физических листов**:

```text
Custom_Price
→ spr_price
→ Pricebook_Versions
→ Prices
```

Нормализация данных для расчёта, если она нужна, должна выполняться runtime-кодом в памяти.

Отдельный машинный price sheet допускается только если dependency audit докажет техническую необходимость, которую нельзя разумно устранить.

## Минимально ожидаемые сущности данных

Точный контракт колонок определяется отдельным шагом, но лист должен покрывать минимум:

```text
item_id
category
name
unit
price
currency
active
vendor / brand (если требуется)
article (если требуется)
notes
updated_at
```

Поля из старого `Catalog_Items`, которые действительно нужны runtime, должны быть перенесены сюда при миграции.

---

# 4. Construction_Defaults

## Назначение

`Construction_Defaults` содержит изменяемые конструкционные значения по умолчанию для скрытых элементов, которые:

- влияют на материалы, фурнитуру, работы или стоимость;
- не могут быть надёжно определены по рендеру;
- не были явно заданы пользователем или документацией проекта.

Примеры класса данных:

```text
shelf_count
drawer_count
hidden filling parameters
other construction defaults
```

## Ключевое правило

Значение из `Construction_Defaults` **не является подтверждённым фактом проекта**.

Оно должно попадать в Stage 10 как:

```text
DEFAULT_CANDIDATE
```

и затем:

```text
Dynamic Brief
→ user confirmation/change
→ USER_CONFIRMATION
→ Confirmed Configuration
```

То есть default не должен тихо становиться `KNOWN`.

## Ожидаемая структура правила

Точный контракт колонок определяется отдельно. Базовая модель:

```text
rule_id
module_type
condition
parameter
default_value
unit
confirmation_required
active
description
```

## Ограничение текущего документа

Конкретные canonical значения defaults этим документом **не устанавливаются**.

Количество полок, ящиков и другие скрытые параметры должны быть утверждены отдельным шагом и затем записаны в эту таблицу.

---

# 5. BOM_LAST

## Назначение

`BOM_LAST` — человекочитаемый полный BOM **последнего успешно сформированного расчёта**.

Это основной пользовательский output в Google Sheets.

## Поведение

При новом успешном расчёте:

```text
старое содержимое BOM_LAST
→ очищается
→ записывается новый BOM
```

Лист **не является архивом**.

Пользователь может скачать текущий результат в Excel.

## Содержание

Целевая presentation structure должна позволять показать минимум:

```text
Project metadata

Parts
Materials
Edge
Hardware
Works / Costing
Totals
```

Точная раскладка блоков и колонок фиксируется отдельным schema/design шагом.

---

# 6. CALC_LOG

## Назначение

`CALC_LOG` — append-only журнал пресейл-расчётов.

Одна строка соответствует одному запуску/расчёту.

## Что хранить

Только краткие данные, необходимые для:

- аудита;
- аналитики;
- диагностики;
- понимания истории запусков.

Минимально рассматриваются:

```text
calculation_id
timestamp
project_name
manager
status
vision_model
material_total
hardware_total
work_total
grand_total
currency
```

Точный набор колонок определяется отдельным schema шагом.

## Что не хранить

`CALC_LOG` не должен содержать:

- полный BOM построчно;
- отдельную копию каждой спецификации;
- отдельный расчётный файл на каждый пресейл.

---

# 7. SYSTEM

## Назначение

`SYSTEM` — техническое состояние **последнего запуска**.

Это машинный, а не пользовательский лист.

При новом расчёте его значения могут перезаписываться.

## Минимально ожидаемые данные

```text
calculation_id
timestamp
status
vision_model
confirmed_configuration_json
construction_result_json
```

При необходимости могут храниться другие технические данные последнего запуска, если они действительно нужны runtime или диагностике.

## Запрет

В `SYSTEM` не хранятся:

- API keys;
- токены;
- пароли;
- иные секреты.

Секреты должны находиться в Apps Script `Script Properties` или другом предназначенном для этого secret storage.

---

# 8. Что больше не является целевой моделью расчёта

После появления отдельного `Construction Core` следующие старые листы **не являются целевыми источниками расчётной логики**:

```text
Module_Size_Rules
Module_Recipes
Module_Recipe_Items
Calculation_Rules
```

Причина:

```text
модуль больше не выбирается как готовый эталонный образец;
геометрия и состав деталей рассчитываются Construction Core по формулам и параметрам.
```

Пример:

```text
confirmed width = 733
→ Construction Core formula
→ bottom length = 733 - 2 × panel_thickness
```

Custom numeric values не должны нормализоваться к стандартной сетке модулей.

## Важное уточнение

Это не означает, что любые технологические ограничения исчезают.

Реальные constraints техники, механизмов и конструктивных правил могут существовать в коде/профиле/специализированных правилах.

Но Google Sheets не должен возвращаться к модели:

```text
стандартный модуль
→ эталонный рецепт
→ заранее заданный набор деталей
```

---

# 9. Что больше не является целевой price architecture

Следующие старые листы **не входят в целевую архитектуру V1**:

```text
spr_price
Pricebook_Versions
Prices
```

`Catalog_Items` также не должен оставаться отдельным каталогом, если его необходимые поля могут быть объединены с `Custom_Price`.

Окончательное удаление этих листов возможно только после dependency audit и migration mapping.

---

# 10. Reference_Values

`Reference_Values` **не входит в базовую целевую структуру пяти листов**.

Перед миграцией необходимо установить:

- кто реально его читает;
- какие dropdown/enums от него зависят;
- какие значения должны редактироваться пользователем;
- можно ли перенести значения в schema/code.

Допустимые результаты аудита:

```text
REMOVE_AFTER_MIGRATION
KEEP_TEMPORARILY_WITH_REASON
KEEP_AS_REQUIRED
```

Если лист действительно нужен, это должно быть отдельно доказано.

---

# 11. Schema_Meta и старый System_Config

`Schema_Meta` не входит в целевую пользовательскую структуру V1.

Схемы и версии контрактов должны преимущественно жить в репозитории и коде, а не требовать отдельного пользовательского листа.

Старый `System_Config` в текущем виде не является целевой сущностью.

Его полезные пользовательские construction defaults должны быть перенесены в:

```text
Construction_Defaults
```

Техническое состояние последнего расчёта хранится в:

```text
SYSTEM
```

Секреты и API configuration — вне таблицы.

---

# 12. Целевая ответственность слоёв

```text
INPUT / CONFIG
├── Custom_Price
└── Construction_Defaults

ENGINE
├── Stage 10
├── Construction Core
└── Costing

OUTPUT
├── BOM_LAST
└── CALC_LOG

TECH
└── SYSTEM
```

---

# 13. Data flow

```text
Image / sketch / drawing / text / dimensions
                    ↓
                 Stage 10
                    ↓
          Confirmed Configuration
                    ↓
             Construction Core
                    ↓
            Construction Result
                    ↓
                 Costing
                    ↑
              Custom_Price
                    ↓
                BOM Result
              ↙     ↓      ↘
       BOM_LAST   CALC_LOG   SYSTEM
```

`Construction_Defaults` подключается раньше, на этапе формирования `DEFAULT_CANDIDATE` и пользовательского подтверждения.

---

# 14. Семантика хранения

## Перезаписываются

```text
BOM_LAST
SYSTEM
```

Они всегда отражают последний расчёт/последнее состояние.

## Append-only

```text
CALC_LOG
```

Новая строка добавляется для каждого запуска согласно будущему runtime contract.

## Редактируются пользователем/администратором

```text
Custom_Price
Construction_Defaults
```

---

# 15. Что не хранится

Целевая MVP-архитектура не требует:

- отдельного Google Sheet файла на каждый пресейл;
- отдельной вкладки на каждый расчёт;
- полного архива BOM внутри рабочей таблицы;
- immutable pricebook snapshot для каждого расчёта;
- копии нормализованного прайса в отдельном physical sheet только ради runtime;
- эталонной библиотеки готовых мебельных модулей как основы расчёта.

---

# 16. Migration constraints

До изменения Apps Script или физической Google Sheet необходимо выполнить dependency audit.

Для каждого старого листа нужно установить:

```text
кто создаёт
кто читает
кто пишет
какие связи использует
какое целевое место заменяет его функцию
какие данные необходимо перенести
когда его безопасно удалить
```

Никакой старый лист не удаляется только потому, что он отсутствует в этой целевой архитектуре.

---

# 17. Текущий target state

Целевая V1:

```text
Custom_Price
Construction_Defaults
BOM_LAST
CALC_LOG
SYSTEM
```

Это основной design target для следующего dependency audit и последующей локальной migration/schema работы.

---

# 18. Открытые вопросы следующих шагов

Этот документ намеренно не решает:

1. точные колонки пяти листов;
2. canonical hidden construction defaults;
3. какие поля старого `Catalog_Items` нужны в `Custom_Price`;
4. нужен ли временно `Reference_Values`;
5. финальный costing contract;
6. точную presentation layout `BOM_LAST`;
7. migration implementation;
8. Apps Script deployment.

Они должны быть закрыты последовательно после dependency audit.

---

## Итоговое решение

Зафиксирована минимальная целевая архитектура Google Sheets:

```text
Custom_Price
Construction_Defaults
BOM_LAST
CALC_LOG
SYSTEM
```

Главная граница системы:

> Google Sheets хранит конфигурацию, прайс, журнал и представление результата.  
> Распознавание, подтверждение, конструкционный расчёт и costing выполняются кодом.
