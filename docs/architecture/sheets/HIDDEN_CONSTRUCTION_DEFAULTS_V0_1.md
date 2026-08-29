# HIDDEN_CONSTRUCTION_DEFAULTS_V0_1

## Статус
**MVP DEFAULT POLICY — APPROVED FOR CONTRACT DESIGN**

Назначение — стартовая политика для скрытого внутреннего наполнения кухни, влияющего на BOM, но не всегда видимого на рендере.

Default никогда не становится `KNOWN` автоматически.

Flow:
`explicit evidence → use evidence`
иначе
`default policy → DEFAULT_CANDIDATE / REQUIRED_QUESTION → user confirmation → Confirmed Configuration`.

## 1. BASE_CABINET_WITH_DOORS
- parameter: `shelf_count`
- default: `1`
- resolution: `DEFAULT_CANDIDATE`
- confirmation_required: `true`

Market evidence: типовые base cabinets широко представлены с одной полкой / одной регулируемой полкой.
Sources:
- https://www.homedepot.com/b/Kitchen-Kitchen-Cabinets-In-Stock-Kitchen-Cabinets/Base/1-Shelf/N-5yc1vZchbpZ1z118ifZ1z1yx6s
- https://www.homedepot.com/b/Kitchen-Kitchen-Cabinets-In-Stock-Kitchen-Cabinets-Ready-to-Assemble-Kitchen-Cabinets/1-Adjustable-Shelf/N-5yc1vZ2fkowpzZ1z1yxcs

## 2. SINK_BASE
- parameter: `shelf_count`
- default: `0`
- resolution: `DEFAULT_CANDIDATE`
- confirmation_required: `true`

Причина: мойка/сифон/коммуникации.
Sources:
- https://www.homedepot.com/b/Kitchen-Kitchen-Cabinets-In-Stock-Kitchen-Cabinets/Sink-Base/No-Shelves/N-5yc1vZchbpZ1z1nbp2Z1z1yxb8
- https://homedecoratorscabinetry.homedepot.com/products/sb36-cvo

## 3. WALL_CABINET
parameter: `shelf_count`

MVP bands:
- `height_mm <= 650` → `1`
- `650 < height_mm <= 950` → `2`
- `950 < height_mm <= 1150` → `3`

Все как `DEFAULT_CANDIDATE`, `confirmation_required=true`.

Это MVP policy, а не универсальный международный стандарт. Основание — повторяемая конфигурация:
- 24" ≈ 610 mm → 1 shelf
- 30" ≈ 762 mm → 2 shelves
- 36" ≈ 914 mm → 2 shelves
- 42" ≈ 1067 mm → 3 shelves

Sources:
- https://www.rtacabinetstore.com/RTA-Kitchen-Cabinets/slim-white-shaker/
- https://www.rtacabinetstore.com/RTA-Kitchen-Cabinets/florence-white-shaker/
- https://www.rtacabinetstore.com/RTA-Kitchen-Cabinets/frameless-white-shaker

Для типового верхнего шкафа порядка 700–800 мм default = `2`.

## 4. DRAWER_BASE
- parameter: `drawer_count`
- condition: module identified as `DRAWER_BASE`, count unresolved
- default: `3`
- resolution: `DEFAULT_CANDIDATE`
- confirmation_required: `true`

Если количество видно по фасадам/чертежу/тексту — использовать evidence.

Source:
- https://www.homedepot.com/b/Kitchen-Kitchen-Cabinets/Drawer-Base/3-Drawers/N-5yc1vZas87Z1z18pmsZ1z1uzpy

## 5. TALL_CABINET / PANTRY
parameter: `shelf_count`

MVP bands:
- `height_mm <= 2300` → `4`
- `height_mm > 2300` → `5`

Только для storage/pantry tall cabinet. Не применять автоматически к appliance tower / oven / refrigerator housing.

Source:
- https://www.rtacabinetstore.com/RTA-Kitchen-Cabinets/florence-honey-shaker-kitchen-cabinets

## 6. APPLIANCE / SPECIAL MODULES
Для:
- `DISHWASHER`
- `HOOD / HOOD_CABINET`
- `OVEN / BUILT_IN_OVEN_MODULE`
- `MICROWAVE_MODULE`
- `REFRIGERATOR_HOUSING`
- `APPLIANCE_TALL_CABINET`

если internal configuration не подтверждена explicit evidence:
- `resolution_mode = REQUIRED_QUESTION`
- numeric default не придумывать.

`DISHWASHER` не считать обычным base cabinet.
`HOOD_CABINET` не наследует обычный wall-cabinet shelf default автоматически.

## 7. Rule registry

| rule_id | module_type | condition | parameter | value | resolution_mode | confirmation_required |
|---|---|---|---|---:|---|---|
| BASE_DOOR_SHELF | BASE_CABINET | doors, non-sink, non-appliance | shelf_count | 1 | DEFAULT_CANDIDATE | true |
| SINK_BASE_SHELF | SINK_BASE | unless explicit evidence | shelf_count | 0 | DEFAULT_CANDIDATE | true |
| WALL_LOW_SHELF | WALL_CABINET | height_mm <= 650 | shelf_count | 1 | DEFAULT_CANDIDATE | true |
| WALL_STANDARD_SHELF | WALL_CABINET | 650 < height_mm <= 950 | shelf_count | 2 | DEFAULT_CANDIDATE | true |
| WALL_HIGH_SHELF | WALL_CABINET | 950 < height_mm <= 1150 | shelf_count | 3 | DEFAULT_CANDIDATE | true |
| DRAWER_BASE_COUNT | DRAWER_BASE | drawer_count unresolved | drawer_count | 3 | DEFAULT_CANDIDATE | true |
| TALL_PANTRY_SHELF | TALL_CABINET | pantry/storage and height_mm <= 2300 | shelf_count | 4 | DEFAULT_CANDIDATE | true |
| TALL_PANTRY_HIGH_SHELF | TALL_CABINET | pantry/storage and height_mm > 2300 | shelf_count | 5 | DEFAULT_CANDIDATE | true |
| APPLIANCE_INTERNAL | APPLIANCE_SPECIAL | internal construction unresolved | internal_configuration | null | REQUIRED_QUESTION | true |

## 8. Construction_Defaults contract requirement
Будущий sheet contract должен поддерживать минимум:
- `rule_id`
- `module_type`
- `condition`
- `parameter`
- `default_value`
- `unit`
- `resolution_mode`
- `confirmation_required`
- `active`
- `description`

`default_value` nullable для `REQUIRED_QUESTION`.

Допустимые `resolution_mode` v0.1:
- `DEFAULT_CANDIDATE`
- `REQUIRED_QUESTION`

## 9. Explicit override
Любое explicit project value имеет приоритет над default policy.

## 10. Scope limitation
v0.1 не определяет:
- drawer mechanism vendor/model
- hinge count schedule
- appliance cutout dimensions
- hood internal geometry
- oven support geometry
- refrigerator ventilation gaps
- special corner mechanisms
- pull-out baskets

Такие параметры должны приходить evidence или отдельным construction/appliance policy.
