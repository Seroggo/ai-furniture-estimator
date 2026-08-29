# SHEETS_DEPENDENCY_AUDIT

## Статус

**AUDIT ONLY — NO RUNTIME/CODE/GOOGLE SHEETS CHANGES.**

Dependency audit фактического Apps Script против принятой целевой архитектуры
`TARGET_SHEETS_ARCHITECTURE_V1.md`. Цель — migration map из 12 текущих листов в
5 целевых (`Custom_Price`, `Construction_Defaults`, `BOM_LAST`, `CALC_LOG`,
`SYSTEM`). Новая архитектура не проектируется заново.

Все выводы привязаны к конкретным файлам/функциям в `apps-script/`.

---

## 1. Current sheets audited

12 физических листов текущей таблицы (по `setup_system.gs` + `generated/schema_manifest.gs`):

| Sheet | Тип | Активные runtime-читатели в Apps Script |
|---|---|---|
| `Custom_Price` | Human UX | `custom_price.gs:syncCustomPrice` |
| `Schema_Meta` | Technical | нет runtime-читателя; только `setup_system.gs:seedSchemaMeta_` пишет 1 строку |
| `System_Config` | Technical | нет читателя; нет writer; тело листа не наполняется |
| `Module_Size_Rules` | Technical | `master_data_loader.gs:loadStage8MasterData_`, `layout_runtime.gs:stage8MarketBaseline_`, `syncStage8ModuleSizeRules` |
| `Module_Recipes` | Technical | `master_data_loader.gs`, `recipe_resolver.gs:resolveStage8Recipes` |
| `Module_Recipe_Items` | Technical | `master_data_loader.gs`, `recipe_resolver.gs`, `quantity_engine.gs:calculateStage8Quantities` |
| `Catalog_Items` | Technical | `master_data_loader.gs`, `quantity_engine.gs`, `custom_price.gs:syncCustomPrice` (write), FK target |
| `spr_price` | Technical | `custom_price.gs:syncCustomPrice` (write only); НЕ читается расчётом |
| `Pricebook_Versions` | Technical | `master_data_loader.gs`, `pricebook_resolver.gs:resolveStage8Pricebook` |
| `Prices` | Technical | `master_data_loader.gs`, `pricebook_resolver.gs` |
| `Calculation_Rules` | Technical | `master_data_loader.gs`, `recipe_resolver.gs`, `quantity_engine.gs`, `pricebook_resolver.gs` |
| `Reference_Values` | Technical | нет runtime-читателя; только `setup_system.gs` seeding |

Полный расчётный путь Stage 8 оркестрируется в
`calculation_orchestrator.gs:calculateProject`:

```text
adaptProjectInputToLayoutRequest
→ composeStage8Layout (Module_Size_Rules)
→ resolveStage8Recipes (Module_Recipes + Module_Recipe_Items + Calculation_Rules)
→ calculateStage8Quantities (Catalog_Items + Calculation_Rules + Module_Recipe_Items)
→ resolveStage8Pricebook (Pricebook_Versions + Prices + Calculation_Rules)
```

`src/construction-core/index.js` не содержит ни одной ссылки на эти листы
(verified — no matches for sheet names). Construction Core берётConfirmed
Configuration и считает по формулам/профилю, не читая Google Sheets.

---

## 2. Price chain conclusion

### Фактическая цепочка (по коду)

```text
Manager (human)
  → Custom_Price          [write]   custom_price.gs:syncCustomPrice reads human rows
  → Catalog_Items         [write]   upsertObjectRow_ (custom_price.gs:56)
  → spr_price             [write]   upsertObjectRow_ (custom_price.gs:57)
                                     ↓
                            (НЕТ функции публикации в коде)
                                     ↓
  Pricebook_Versions      [read]    pricebook_resolver.gs:8-18  (требует ACTIVE)
  Prices                  [read]    pricebook_resolver.gs:19-49  (unit_price, provenance)
```

### Установленные факты

1. **Source of truth для published расчёта = `Pricebook_Versions` + `Prices`.**
   `pricebook_resolver.gs:resolveStage8Pricebook` фильтрует `status === 'ACTIVE'`
   и `source_context === 'production_pricebook'` версии и читает `unit_price` из
   `Prices`. Никакой другой лист не является published calculation truth.

2. **`spr_price` НЕ является source of truth для расчёта.** Его пишет только
   `syncCustomPrice` (`custom_price.gs:57`). Ни `pricebook_resolver.gs`, ни
   `calculateProject`, ни `loadStage8MasterData_` его не читают. Это
   промежуточный mutable working layer для будущего publication workflow,
   которого нет в коде.

3. **Publication workflow отсутствует.** В `apps-script/` нет функции, которая
   копирует `spr_price` (READY rows) → новый `Pricebook_Versions` + `Prices`.
   Следовательно в текущем runtime `Pricebook_Versions`/`Prices` остаются
   пустыми, если не заполнены внешне, и `calculateProject` всегда возвращает
   `PRICEBOOK_NOT_AVAILABLE` (`pricebook_resolver.gs:13`) для реальных данных.

4. **Функции, зависящие от промежуточных price sheets:**
   - `custom_price.gs:syncCustomPrice` — пишет в `Catalog_Items` и `spr_price`.
   - `custom_price.gs:deactivateMissingCustomPriceRows_` — читает `spr_price`
     (`source_ref` pattern `Custom_Price:CP_...`) и переводит отсутствующие rows
     в `INACTIVE`, а связанные `Catalog_Items` в `RETIRED`.
   - `pricebook_resolver.gs:resolveStage8Pricebook` — читает `Pricebook_Versions`
     + `Prices` + `Calculation_Rules` (COST_UNIT_PRICE_V1).

5. **Поля `Catalog_Items`, реально нужные runtime:**
   - `quantity_engine.gs:71-74`: `catalog_item_code`, `lifecycle_status`,
     `price_code`, `default_unit`, `catalog_item_type`.
   - `pricebook_resolver.gs:39-42`: `catalog_item_code` (match against price),
     `unit` (через `Prices`).
   - FK target для `Module_Recipe_Items` и `Prices` (referenceSheet relations в
     `schema_manifest.gs`).
   - Не нужны: `provenance`, `notes` (только audit/seed).

6. **Что нужно перенести в `Custom_Price`, чтобы он стал единственным persistent
   source of truth:**
   - `catalog_item_type` (из категории: MATERIAL/EDGE/HARDWARE/WORK/SERVICE —
     mapping уже есть в `human-ux-contract.md` и `custom_price.gs` через
     `ux.categories`).
   - `default_unit` (из human unit: m2/m/pcs/set/project — mapping в `ux.units`).
   - `price_code` (уже генерируется в `custom_price.gs:117` как
     `PRICE_CP_<token>`).
   - `catalog_item_code` (уже генерируется как `CAT_CP_<token>`).
   - `lifecycle_status` (derive из `active` checkbox).
   - Published price fields: `unit_price` (= `current_price_rub` из Custom_Price),
     `currency`, FX provenance (`source_currency`, `source_price`, `fx_rate_used`,
     `fx_rate_source`, `price_derivation_mode`) — всё это уже вычисляется в
     `custom_price.gs:normalizeCustomPriceRow_` и пишется в `spr_price`.
   - Нормализация FX/`current_price_rub` должна выполняться runtime-кодом в
     памяти, а не отдельным physical sheet (`TARGET_SHEETS_ARCHITECTURE_V1.md`
     §3).

### Итог по price chain

`Custom_Price` уже содержит все исходные данные. Промежуточные `spr_price`,
`Catalog_Items`, `Pricebook_Versions`, `Prices` — derived layers без runtime
читателя, кроме `pricebook_resolver.gs`, который сам требует publication, не
существующей в коде. После замены `pricebook_resolver.gs` на чтение
`Custom_Price` напрямую (или in-memory snapshot) все четыре промежуточных листа
становятся удаляемыми.

---

## 3. Old construction sheets conclusion

Проверены: `Module_Size_Rules`, `Module_Recipes`, `Module_Recipe_Items`,
`Calculation_Rules`. Лист не считается устаревшим по названию — подтверждение
кодом ниже.

### `Module_Size_Rules`

- **Читатели:** `master_data_loader.gs:loadStage8MasterData_` (line 20),
  `master_data_loader.gs:syncStage8ModuleSizeRules` (line 38),
  `layout_runtime.gs:stage8MarketBaseline_` (принимает rows как параметр,
  line 7-33), `calculation_orchestrator.gs:75` (diagnostic provenance).
- **Активный путь:** `calculateProject` → `composeStage8Layout` →
  `stage8MarketBaseline_`. Используется для подбора стандартных модулей по
  exact-width сетке (rank A–E).
- **Нужен ли `src/construction-core/`:** НЕТ. `src/construction-core/index.js`
  не ссылается на `Module_Size_Rules` (verified, no matches). Construction Core
  считает геометрию по confirmed width и формулам профиля
  (`config/construction/ALPHA_CONSTRUCTION_PROFILE_V1.json`), а не по сетке
  эталонных модулей.
- **Реально нужные данные:** нет. Размерные правила стандартных модулей не
  используются формульным расчётом Construction Core.
- **Действие:** `REMOVE_AFTER_MIGRATION` после переключения расчётного пути на
  Construction Core.

### `Module_Recipes` / `Module_Recipe_Items`

- **Читатели:** `master_data_loader.gs:22-23`,
  `recipe_resolver.gs:resolveStage8Recipes` (lines 36-37, 44-98),
  `quantity_engine.gs:84` (provenance label only).
- **Активный путь:** `calculateProject` → `resolveStage8Recipes` →
  `calculateStage8Quantities`. Recipe = предзаданный набор деталей для
  module_class/role/variant.
- **Нужны ли `src/construction-core/`:** НЕТ. Construction Core генерирует BOM
  из формул, а не из recipe rows. Подтверждено отсутствием ссылок.
- **Реально нужные данные:** нет. Quantity contract (`quantity_rule_id`,
  `quantity_params_json`, `quantity_value`) относится к recipe-based модели,
  которая заменяется формульным расчётом.
- **Действие:** `REMOVE_AFTER_MIGRATION` после переключения на Construction
  Core.

### `Calculation_Rules`

- **Читатели:** `master_data_loader.gs:25`,
  `recipe_resolver.gs:30,56-64` (rule snapshot, MODULE_TO_PARTS_V1 blocking),
  `quantity_engine.gs:12-21,76` (QTY_* code bindings),
  `pricebook_resolver.gs:22-28` (COST_UNIT_PRICE_V1 code binding).
- **Роль:** metadata-реестр, пинит `implementation_ref` к детерминированным
  функциям (`stage8QuantityArea_`, `stage8CalculateCost_` и т.д.) и effective
  periods.
- **Нужен ли `src/construction-core/`:** НЕТ. Construction Core реализует
  правила в коде/профиле напрямую, без registry-строк.
- **Реально нужные данные:** концепция rule registry переходит в
  код/`ALPHA_CONSTRUCTION_PROFILE_V1.json`; сами строки листа не мигрируются.
- **Действие:** `REMOVE_AFTER_MIGRATION` после миграции расчётного пути.

### Итог по old construction sheets

Все четыре листа обслуживают исключительно Stage 8 recipe/layout path
(`calculation_orchestrator.gs:calculateProject`). Construction Core их не
читает. Никакие данные из них не переносятся в целевую архитектуру — логика
переходит в код/профиль. Удаление возможно после переключения runtime на
Construction Core.

---

## 4. Reference_Values conclusion

- **Читатели runtime:** НЕТ. Ни `loadStage8MasterData_`, ни
  `pricebook_resolver.gs`, ни `recipe_resolver.gs`, ни `quantity_engine.gs`,
  ни `calculateProject` не читают `Reference_Values`.
- **Единственный потребитель:** `setup_system.gs:15-19` — seeding через
  `appendMissingSeedRows_(sheetsByName.Reference_Values, manifest.referenceSeeds,
  'reference_value_id')`. Содержимое берётся из `schema_manifest.gs`
  `referenceSeeds` (lines 2055+).
- **Dropdown / validation зависимости:** НЕТ.
  `setup_system.gs:dataValidationForColumn_` (lines 150-193) использует
  `column.enumValues` (inline-списки в manifest) и `column.referenceSheet`
  (FK ranges). `Reference_Values` **ни разу** не фигурирует как
  `referenceSheet` (verified: все 9 непустых `referenceSheet` указывают на
  `Module_Recipes`, `Catalog_Items`, `Calculation_Rules`, `Pricebook_Versions` —
  `schema_manifest.gs` lines 769, 795, 821, 860, 1049, 1062, 1440, 1453, 1466).
  Значит ни один dropdown не зависит от диапазона `Reference_Values`.
- **Редактирование пользователем:** не предполагается. По
  `google-sheets-schema.md` §10 — `DRAFT only`, источник — schema/admin release.
- **Содержимое:** enum-документация, продублированная из
  `sheets-columns.csv` (`schema_manifest.gs` provenance:
  `archive/stages/stage-4-google-sheets/sheets-columns.csv#...`).
- **Можно ли перенести в code/schema:** ДА. Все значения уже присутствуют в
  `schema_manifest.gs` (`referenceSeeds`) и в column `enumValues`. Лист —
  физическая копия enum-документации, не используемая валидацией или расчётом.

**Действие:** `REMOVE_AFTER_MIGRATION`. Enum values остаются в коде/схемах
(`schema_manifest.gs`, `contracts/`).

---

## 5. Migration risks

| Risk | Описание | Связанный код |
|---|---|---|
| Price chain break | `pricebook_resolver.gs:resolveStage8Pricebook` — единственный reader `Pricebook_Versions`/`Prices`. Замена на чтение `Custom_Price` требует нового resolver; до этого расчёт не работает (publication отсутствует). | `pricebook_resolver.gs`, `calculation_orchestrator.gs:98` |
| `spr_price` source_ref contract | `custom_price.gs:deactivateMissingCustomPriceRows_` парсит `source_ref` вида `Custom_Price:CP_...` из `spr_price` для deactivate-логики. Удаление `spr_price` требует переноса этой логики на `Custom_Price`-identity напрямую. | `custom_price.gs:291-304` |
| `Catalog_Items` FK relations | `Module_Recipe_Items` и `Prices` имеют `referenceSheet: Catalog_Items` (validation ranges). Удаление `Catalog_Items` ломает setup-time FK validation recipe/price path. Приемлемо только после удаления recipe/pricebook sheets. | `schema_manifest.gs:795,860,1049,1062,1453,1466`, `setup_system.gs:dataValidationForColumn_` |
| `setup_system.gs` manifest coupling | `setup_system.gs` и `schema_manifest.gs` жёстко ожидают 12 листов и 136 колонок (`verifySetupSystem_` line 57). Любое удаление листа требует перегенерации manifest и обновления `setupSystem`. | `setup_system.gs:39,57`, `generated/schema_manifest.gs` |
| Stage 8 tests regression | `tests/apps-script/test_stage8_*.mjs` покрывают recipe/pricebook path. Удаление листов инвалидирует эти тесты. | `tests/apps-script/` |
| Construction Core не подключён к Apps Script | Целевая архитектура предполагает Construction Core в Apps Script, но текущий `calculateProject` использует Stage 8 kernel. Удаление construction sheets до подключения Construction Core = расчёт полностью нерабочий. | `calculation_orchestrator.gs:55-111` |
| `System_Config` / `Schema_Meta` silent dependencies | `System_Config` не имеет reader, но `Reference_Values` seeds ссылаются на `System_Config.value_type`/`.status` как `reference_set` namespace (документационно). Удаление требует очистки seeds. | `schema_manifest.gs:2088-2163` |

---

## 6. Open decisions for HQ

1. **Migration sequencing.** Удалять ли все 4 construction sheets + 4 price
   sheets одним шагом после подключения Construction Core, или поэтапно
   (сначала price chain, потом construction)?
2. **`pricebook_resolver` replacement.** Должен ли новый resolver читать
   `Custom_Price` напрямую при каждом расчёте, или строить in-memory immutable
   snapshot на момент calculation (аналог `pricebook_version_id` для
   воспроизводимости)? Это влияет на `CALC_LOG`/`SYSTEM` contract.
3. **FX rate capture.** `Custom_Price` сейчас использует скрытый GOOGLEFINANCE
   cache (`custom_price.gs:configureFxCache_`). Должен ли fixed FX rate
  捕捉аться в `Custom_Price` updated_at-момент, или фиксация переносится в
   `SYSTEM`/`CALC_LOG` при расчёте?
4. **`System_Config` content.** Лист пуст и не используется. Есть ли
   пользовательские construction defaults, которые HQ хочет перенести в
   `Construction_Defaults` из каких-либо внешних источников (не из
   `System_Config`)?
5. **`Schema_Meta` retention.** Лист содержит 1 строку версии схемы. Переносить
   ли `schema_version_id` в `SYSTEM` (как часть техсостояния) или полностью в
   репозиторий/`contracts/`?
6. **Stage 8 test disposition.** `tests/apps-script/test_stage8_*` — удалить
   вместе с Stage 8 path или сохранить как legacy regression до полного
   отключения?

---

## 7. Sixth-sheet blocker

**NO.** Все 12 текущих листов отображаются либо в 5 целевых листов, либо в
код/схемы. Доказанной необходимости в шестой вкладке не обнаружено.

---

## Созданные файлы

- `Docs/architecture/sheets/SHEETS_DEPENDENCY_AUDIT.md` — этот файл.
- `Docs/architecture/sheets/sheet-dependency-map.csv` — построчная migration map.

## Runtime/code changes

**NONE.** Аудит не изменял runtime, Apps Script или Google Sheets.