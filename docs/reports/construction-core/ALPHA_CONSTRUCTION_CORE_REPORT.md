# ALPHA Construction Core Report

## Реализовано

- Изолированное plain-JavaScript ядро: `Construction_core/index.js`.
- Публичный API `loadConstructionProfile(profile)` и `calculateConstructionCore(input, profile, benchmarkReference)`.
- Canonical result с `Project`, `Parts`, `Materials`, `Materials_by_component`, `Edge`, `Edge_by_component`, `Part_count_by_component`, `Hardware`, `Manufacturing_features`, `Issues`, `Benchmark`.
- Генерация боковин, нижних/верхних панелей, задних стенок tall-модулей, explicit фасадов и drawer parts при достаточных размерах.
- Per-part `Area_m2`, `Edge_length_m`, `Holes`, `Grooves`, `Notches`, `Joinery`.
- Component scopes: `CARCASS`, `DRAWER_COMPONENT`, `FACADE_COMPONENT`, `WALL_CABINET_COMPONENT`.
- Кодогенератор golden artifact: `Construction_core/generate_golden.mjs`.
- Artifact: `Construction_core/generated/golden_kitchen_result.json`.

## OSS provenance

Использована компактная самостоятельная адаптация методик WoodworkingShop, а не прямое копирование функций:

| Repository | Commit | Source_path | Source_function_or_logic | Adaptation |
|---|---|---|---|---|
| WoodworkingShop | `9f6f1ff51b0e50cb54c7df832eac78023c389b31` | `src/engine/parts.ts` | `generateParts` carcass geometry | Явные размеры confirmed input сохранены authoritative; профильные reductions вынесены в rule object. |
| WoodworkingShop | `9f6f1ff51b0e50cb54c7df832eac78023c389b31` | `src/engine/edge-banding-calc.ts` | `calculateEdgeBanding` edge grouping | Кромка рассчитывается по `Edge_sides` каждой детали и агрегируется по material/component. |
| WoodworkingShop | `9f6f1ff51b0e50cb54c7df832eac78023c389b31` | `src/engine/hinge-bore.ts` | `hingeCount` thresholds | Только provisional hardware diagnostic; null facade dimensions не заменяются. |
| WoodworkingShop | `9f6f1ff51b0e50cb54c7df832eac78023c389b31` | `src/engine/dowel-joint.ts` | standard dowel sizing logic | Использован provisional fixed alignment baseline. |
| cabinet-studio | `1caae5ba9b362ff40cc652a1ba797e8164468d66` | `js/cabinet-math.js` | panel/feature data model reference | Только reference; исходный код не копировался. |

## Tests

| Command | Passed | Failed |
|---|---:|---:|
| `node --check Construction_core/index.js` | 1 | 0 |
| `node --test Construction_core/tests/construction_core.test.mjs` | 9 | 0 |
| `npm test` | 108 | 0 |

## Golden benchmark

| Metric | Golden | Generated | Delta | Delta % | Classification |
|---|---:|---:|---:|---:|---|
| LDSP 16 mm, carcass scope | 15.93 | 15.92528 | -0.00472 | -0.02963% | `UNIVERSAL_GEOMETRY` |
| LHDF 3 mm, carcass scope | 2.73 | 2.72699 | -0.00301 | -0.110256% | `PROVISIONAL_ALPHA_RULE` |
| Edge 19x1, carcass scope | 105.23 | 29.238 | -75.992 | -72.215148% | `PROVISIONAL_ALPHA_RULE` |
| Facade reference | 14.80 | 0 | -14.80 | -100% | `INPUT_GAP` |

LDSP and LHDF use explicit module dimensions and the current profile. The small LDSP delta is caused by the transparent panel-count/depth rules. Edge has a large difference because the profile explicitly excludes edge policy from alpha authority and the core does not apply an undocumented Basis waste or exposure coefficient. Facade is not synthesized: current input contains null facade width/height values.

## Hardware

Implemented output contains only quantities produced by explicit or provisional rules:

- `LEGS`: 28, provisional, four per base-like module.
- `PLINTH_CLIPS`: 14, provisional, two per base-like module.
- `HINGES`: 3, provisional threshold rule where an explicit front height exists.
- `MOUNTING_PLATES`: 3, provisional, one per hinge.
- `DOWELS_8x30`: 44, provisional structural baseline.
- `CONFIRMATS_7x50`: 88, provisional structural baseline.
- `DRAWER_MECHANISMS`: `null`, `NOT_IMPLEMENTED`; vendor rule is absent.

## Input gaps and provisional rules

`INPUT_GAP` is returned for null facade dimensions, missing drawer-front heights, and missing shelf count/dimensions. Back construction for unsupported non-tall module types is reported as `NOT_IMPLEMENTED` rather than guessed.

Provisional rules include carcass horizontal-panel counts, wall depth reduction, tall back-panel scope, visible-front edge policy, hinge thresholds, dowel count, confirmat count, legs, plinth clips, and drawer clearances. These are centralized in `RULES` and do not use hidden calibration coefficients.

## Remaining gaps

- Confirmed facade dimensions and facade material variant are required for a numeric facade result.
- Basis edge policy and production exposure/waste rules require an approved studio rule.
- Drawer vendor/mechanism mapping requires vendor data.
- Full back construction mode, shelf schedule, hinge drilling details, and production fastener schedule require confirmed construction rules.

## Git

- Commit: created after all checks pass.
- Working tree before commit contained the pre-existing task inputs `_tasks/` and `source-materials/Medvedev.Works.Calc/`; they were not modified.

Next action: approve the production edge policy and back construction mode, then add those rules as versioned profile entries and regression fixtures.
