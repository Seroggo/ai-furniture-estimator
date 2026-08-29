# SHEETS_MIGRATION_DECISIONS_V1

## Статус
**APPROVED HQ DECISIONS — PRE-IMPLEMENTATION**

Основание:
- `docs/architecture/sheets/TARGET_SHEETS_ARCHITECTURE_V1.md`
- `docs/architecture/sheets/SHEETS_DEPENDENCY_AUDIT.md`
- `docs/architecture/sheets/sheet-dependency-map.csv`

## 1. Migration sequencing
Миграция новой Sheets architecture проектируется и проверяется локально как один согласованный change-set. Старые вкладки не удаляются из runtime до готовности нового Apps Script path. Физическое обновление Google Sheet и Apps Script выполняется позднее как часть единого Stage 11 deployment.

## 2. Price architecture
Единственный persistent source актуальных цен: `Custom_Price`.

Целевая архитектура не использует обязательные physical layers:
- `spr_price`
- `Pricebook_Versions`
- `Prices`
- `Catalog_Items`

Runtime:
`Custom_Price → read → validate → normalize in memory → immutable calculation price snapshot → Costing`.

Для последнего запуска в `SYSTEM` допускается хранить:
- `price_snapshot_json`
- `currency`
- `fx_rate_used`
- `price_snapshot_created_at`

## 3. FX capture
Курс фиксируется в момент расчёта, а не в момент редактирования прайса. Технические детали последнего запуска — `SYSTEM`, краткие исторические значения — `CALC_LOG`.

## 4. Construction_Defaults
`Construction_Defaults` — human-editable runtime source правил по умолчанию для скрытых конструкционных параметров.

Flow:
`Construction_Defaults → DEFAULT_CANDIDATE → Dynamic Brief → user confirm/change → USER_CONFIRMATION → Confirmed Configuration`.

Для случаев без безопасного numeric default будущий contract должен поддерживать `REQUIRED_QUESTION`.

## 5. Schema_Meta
Отдельная вкладка `Schema_Meta` не входит в target architecture. Machine-readable schemas и версии живут в `contracts/`. При необходимости `SYSTEM` хранит `app_version`, `schema_version`, `construction_profile_version`.

## 6. Reference_Values
По dependency audit отдельная вкладка runtime не требуется. Целевое действие: `REMOVE_AFTER_MIGRATION`.

Enums/validation values живут в canonical schemas/code, если это не пользовательские настройки.

## 7. Old construction sheets
Не входят в новую calculation paradigm:
- `Module_Size_Rules`
- `Module_Recipes`
- `Module_Recipe_Items`
- `Calculation_Rules`

Активный расчёт: `Confirmed Configuration → Construction Core`.

## 8. Legacy Stage 8 tests
Существующие Stage 8 Apps Script regression tests временно сохраняются как legacy regression до появления полного покрытия нового Stage 11 path.

## 9. Final target sheets
Ровно пять:
1. `Custom_Price`
2. `Construction_Defaults`
3. `BOM_LAST`
4. `CALC_LOG`
5. `SYSTEM`

Шестая вкладка не требуется.

## 10. Storage semantics
Human editable:
- `Custom_Price`
- `Construction_Defaults`

Overwrite:
- `BOM_LAST`
- `SYSTEM`

Append-only:
- `CALC_LOG`

## 11. User output
Полные отдельные расчётные файлы внутри системы не архивируются. `BOM_LAST` — последний человекочитаемый результат, пригодный для скачивания в Excel; при новом успешном расчёте перезаписывается.

## 12. Boundary
Google Sheets хранит конфигурацию, прайс, defaults, журнал и last-result state/presentation.

Code выполняет Vision, Evidence, Clarification, Confirmation, Construction Core, Costing и BOM generation.

Google Sheets не является расчётным ядром.
