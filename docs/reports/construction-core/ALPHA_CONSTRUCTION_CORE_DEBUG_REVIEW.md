# ALPHA Construction Core — Independent Debug Review

## Review scope

- **Reviewed commit:** `2f5f7cb12e86a53d10c5facded44811be8b6223e`
- **Repository:** `C:\Project_all\ai-furniture-estimator`
- **Reviewed implementation:** `Construction_core/index.js`
- **Reviewed tests/generator/artifact:**
  - `Construction_core/tests/construction_core.test.mjs`
  - `Construction_core/generate_golden.mjs`
  - `Construction_core/generated/golden_kitchen_result.json`
  - `ALPHA_CONSTRUCTION_CORE_REPORT.md`
- **Input/profile/benchmark:** files from `_tasks/alpha-construction-core/`
- **OSS references checked only for the cited formulas:**
  - WoodworkingShop, commit `9f6f1ff51b0e50cb54c7df832eac78023c389b31`
  - cabinet-studio, commit `1caae5ba9b362ff40cc652a1ba797e8164468d66`

Mutation tests used temporary runtime/source copies. No production source, tests, input JSON, profile, or generated artifact were modified.

## Verdict

# ACCEPT_WITH_FIXES

Текущий Construction Core пригоден как **`PROVISIONAL_ALPHA` foundation** и действительно детерминированно реагирует на входную геометрию. Он формирует `Part[]` из module dimensions, затем агрегирует материалы, кромку, features и provisional hardware.

При этом текущая реализация пока **не должна считаться валидированным production/Basis-equivalent engine**. Близкое совпадение LDSP/LHDF достигнуто на одном golden case при конкретном provisional component/back scope и не доказывает корректность правил за пределами этого случая.

Главный результат ревью:

- target values не влияют на generated geometry — **`NO_CRITICAL_TARGET_LEAKAGE` в generated geometry**;
- benchmark API изолирован недостаточно: переданный `benchmarkReference` игнорируется, а targets зашиты в engine;
- обнаружены реальные ошибки drawer count и facade edge orientation;
- текущие component/back/edge rules остаются provisional;
- дальнейшая разработка возможна только после минимального corrective patch по Required fixes.

## Architecture and independence assessment

Ожидаемая цепочка в целом присутствует:

```text
Confirmed Configuration
  -> Construction Core
  -> Part[]
  -> Materials / Edge / Hardware
  -> Benchmark diff
```

Положительные результаты:

- генерация деталей выполняется до benchmark aggregation;
- `Parts`, `Materials`, `Edge`, `Hardware` не зависят от benchmark delta;
- ветвления по `project_id` не обнаружено;
- специальной проверки конкретных golden dimensions не обнаружено;
- explicit width сохраняется и используется непосредственно в формулах;
- benchmark targets не используются для изменения размеров деталей.

Границы независимости и воспроизводимости:

- `15.93`, `2.73`, `105.23`, `14.8` и benchmark material codes hard-coded в `Construction_core/index.js` в benchmark layer;
- параметр `benchmarkReference` принимается публичным API, но фактически не читается benchmark function;
- `overall_width_mm`, `overall_depth_mm`, openings и `non_carcass_surfaces` входа не участвуют в генерации деталей;
- commit содержит Construction Core, но входные файлы `_tasks/alpha-construction-core/` находятся в незакоммиченной рабочей области. Поэтому clean checkout проверяемого commit сам по себе не является самодостаточным для запуска текущего generator/test setup.

## Critical findings

### 1. Benchmark API не использует внешний reference

`calculateConstructionCore(input, profile, benchmarkReference)` принимает третий аргумент, но `benchmark()` не использует переданный reference. Независимый runtime test с альтернативными targets дал тот же benchmark result.

Дополнительно benchmark targets и material codes зашиты в engine:

```text
Construction_core/index.js:540-550
```

Это **не target leakage в generated geometry**, но это дефект benchmark boundary: внешний reference не является фактическим источником сравнения.

### 2. Drawer `front.count` не размножает drawer box groups

В `generateModuleParts()` массив `DRAWER_FRONT` перебирается как набор front records, но `front.count` не используется при генерации box parts.

Для `IS_BASE_02`:

```text
DRAWER_FRONT count = 2
```

текущий результат содержит только один набор:

```text
DRAWER_SIDE       Qty 2
DRAWER_FRONT_BOX  Qty 1
DRAWER_BACK_BOX   Qty 1
DRAWER_BOTTOM     Qty 1
```

То есть для `count: 2` создаётся один drawer box group вместо двух. Это реальная ошибка BOM quantity, а не только отсутствие vendor rule.

### 3. Ошибка orientation logic для facade edge

Текущая функция:

```js
function edgeLength(partItem, side) {
  return side === 'front' || side === 'back'
    ? partItem.Length_mm
    : partItem.Width_mm;
}
```

При принятой модели фасада:

```text
Length_mm = facade width
Width_mm  = facade height
```

правильное соответствие должно быть:

```text
top/bottom -> Length_mm
left/right -> Width_mm
```

Сейчас `top` и `bottom` получают высоту вместо ширины. Текущий carcass result с `front`-only policy эту ошибку не раскрывает, но любой explicit facade edge result будет неверным.

### 4. Latent defect в facade benchmark classification

Текущая expression эквивалентна:

```js
facadeDimensionsPresent ? 'INPUT_GAP' : 'INPUT_GAP'
```

Поэтому classification остаётся `INPUT_GAP` даже после появления explicit facade dimensions и сгенерированной площади. Это будет искажать будущий facade benchmark.

### 5. Provisional component/back scope выдан за более сильный результат

Почти точные LDSP/LHDF values подтверждают совпадение текущей alpha geometry/scope с одним golden case, но не production correctness.

Результат зависит от provisional assumptions:

- tall-only back policy;
- `horizontal_width_reduction_mm = 32`;
- `back_panel_top_clearance_mm = 10`;
- wall cabinet part scope;
- исключение `DRAWER_COMPONENT` из carcass benchmark;
- отсутствие shelves;
- отсутствие части backs;
- отсутствие decorative/end panels.

Classification `UNIVERSAL_GEOMETRY` для LDSP слишком сильна. До проверки на независимых проектах корректнее использовать `MATCH_ON_GOLDEN_CASE` либо эквивалентный provisional статус.

### 6. Provenance не всегда соответствует реально перенесённой логике

Generic WoodworkingShop provenance присваивается fixed alpha assumptions, которые не являются переносом соответствующего OSS algorithm. Особенно это относится к:

- fixed `DOWELS_8x30 = physical modules × 4`;
- fixed `CONFIRMATS_7x50 = physical modules × 8`;
- drawer reductions и drawer box model;
- tall-only back policy;
- alpha edge exposure policy.

`DOWEL_COUNT_ALPHA_V1` ссылается на `selectDowelDiameter` из `dowel-joint.ts`, однако selection, joint length, spacing и drilling layout в core не выполняются. Эти quantities должны быть явно обозначены как alpha assumptions, а не как полноценная OSS-derived implementation.

## Benchmark isolation

Временная mutation только benchmark targets:

```text
LDSP  15.93  -> 25.00
LHDF   2.73  -> 10.00
Edge 105.23  -> 200.00
```

Результат:

| Output | Changed by target mutation |
|---|---:|
| `Parts` | No |
| `Materials` | No |
| `Materials_by_component` | No |
| `Edge` | No |
| `Hardware` | No |
| `Manufacturing_features` | No |
| `Issues` | No |
| benchmark `golden` / delta fields | Yes |

Вывод:

```text
NO_CRITICAL_TARGET_LEAKAGE
```

в generated geometry/material/edge/hardware result.

Отдельно остаётся дефект пункта 1: публичный `benchmarkReference` не является фактическим источником targets, поскольку benchmark layer его игнорирует и использует встроенные constants.

## LDSP / LHDF match explanation

### LDSP

Фактический component-aware benchmark scope:

```text
CARCASS LDSP:               15.477280 m²
WALL_CABINET_COMPONENT:      0.448000 m²
Benchmark scope total:      15.925280 m²
Basis:                       15.930000 m²
Delta:                       -0.004720 m²
```

В этот scope не входит drawer material:

```text
DRAWER_COMPONENT LDSP:       0.739680 m²
```

Поэтому это **не совпадение общего LDSP BOM**. Это совпадение конкретного scope, в котором wall cabinets включены, а drawer component исключён.

К match привели текущие правила и входная интерпретация:

- explicit module widths используются без standard-module normalization;
- `horizontal_width_reduction_mm = 32`;
- для текущего carcass thickness `16 mm` это совпадает с `2 × 16 mm`;
- tall modules получают две horizontal panels;
- wall modules получают только side panels;
- drawer LDSP исключается из carcass benchmark;
- wall component включается обратно в benchmark scope.

### LHDF

Benchmark сформирован двумя tall back panels:

```text
MW_TALL_L: 2390 × 568 mm
MW_TALL_R: 2390 × 573 mm
```

Площадь:

```text
Generated: 2.726990 m²
Basis:     2.730000 m²
Delta:    -0.003010 m²
```

Текущая формула:

```text
back height = module height - toe_kick - 10
back width  = module width - 32
```

Для текущих tall modules:

```text
2500 - 100 - 10 = 2390
600  - 32       = 568
605  - 32       = 573
```

Match зависит от tall-only back policy, `10 mm` top clearance и `32 mm` horizontal reduction. Drawer bottom из LHDF (`0.302016 m²`) исключён, так как относится к `DRAWER_COMPONENT`.

## Mutation tests

Все mutations выполнялись во временных runtime objects/копиях. Постоянный golden input не изменялся.

| Mutation | Expected | Actual | Result |
|---|---|---|---|
| `MW_TALL_L` width `600 -> 733` | LDSP `+0.148960 m²`; LHDF `+0.317870 m²`; Edge `+0.266000 m` | LDSP `+0.148960 m²`; LHDF `+0.317870 m²`; Edge `+0.266000 m` | **PASS** |
| `MW_BASE_02` width `900 -> 823` | LDSP `-0.043120 m²`; LHDF `0`; Edge `-0.077000 m` | LDSP `-0.043120 m²`; LHDF `0`; Edge `-0.077000 m` | **PASS** |
| `MW_TALL_L` depth `560 -> 520` | LDSP `-0.245440 m²`; LHDF `0`; Edge `0` | LDSP `-0.245440 m²`; LHDF `0`; Edge `0` | **PASS** |
| `MW_BASE_01` height `770 -> 800` | LDSP `+0.033600 m²`; LHDF `0`; Edge `+0.060000 m` | LDSP `+0.033600 m²`; LHDF `0`; Edge `+0.060000 m` | **PASS** |

Зафиксировано:

```text
NO_STANDARD_WIDTH_NORMALIZATION
```

В частности, width `733` остаётся `733` и непосредственно участвует в derived dimensions; преобразований `733 -> 700`, `733 -> 750`, `733 -> 800` не обнаружено.

## Formula review

| Formula/area | Assessment | Finding |
|---|---|---|
| Side panels | Частично перенесена | Dimensions реагируют на input, но rear clearance и wall reduction являются alpha assumptions. |
| Bottom | Частично перенесена | `width - 32` работает для текущего 16 mm material, но reduction не связан формально с material thickness. |
| Top | Частично перенесена / assumption | Class-dependent count: wall `0`, tall `2`, остальные `1`; это не общий OSS rule. |
| Back | Искажена относительно OSS / provisional | Back создаётся только для tall modules; non-tall back mode не восстановлен. |
| Area | Корректна | `Length × Width × Qty / 1,000,000`, source-neutral geometric aggregation. |
| Edge | Частично корректна | Current carcass front edge is internally consistent; facade top/bottom orientation is wrong. |
| Facade | Частично | Explicit dimensions не синтезируются при null, но future edge/classification behavior содержит defects. |
| Drawer | Частично/искажена | Basic rectangular model exists, но count handling и vendor clearances не соответствуют полноценному OSS/vendor rule. |
| Hinge | Частично | Threshold count соответствует cited OSS threshold, но hinge geometry/drilling не реализована. |
| Dowel | Не перенесена | Fixed count вместо `calculateDowelJoint` layout/spacing/diameter logic. |

Cited sources used for this limited comparison:

- WoodworkingShop `src/engine/parts.ts`, `src/engine/dimensions.ts`, `src/engine/edge-banding-calc.ts`, `src/engine/hinge-bore.ts`, `src/engine/dowel-joint.ts`, audited commit `9f6f1ff51b0e50cb54c7df832eac78023c389b31`.
- cabinet-studio `js/cabinet-math.js`, reference commit `1caae5ba9b362ff40cc652a1ba797e8164468d66`.

## Construction Profile audit

### INPUT FACT

- explicit module width/height/depth values;
- assembly/module topology;
- global worktop, toe-kick and countertop dimensions;
- evidence states and source references from the confirmed input.

### OSS BASELINE

- WoodworkingShop panel-generation model as a reference;
- WoodworkingShop edge grouping model as a reference;
- WoodworkingShop hinge threshold model;
- WoodworkingShop material/dowel references;
- cabinet-studio panel data model as a secondary reference.

### PROVISIONAL_ALPHA

- base/tall depth `560 mm`;
- wall depth `320 mm` and wall reduction `40 mm`;
- horizontal reduction `32 mm`;
- back top clearance `10 mm`;
- drawer side/height/depth/bottom clearances;
- tall-only back construction;
- facade gaps and visible-edge policy;
- fixed legs, plinth clips, dowels and confirmats quantities;
- missing shelf/back construction modes.

### DERIVED

- base height `910 - 100 - 40 = 770`;
- panel dimensions from module dimensions and active rules;
- material areas;
- edge totals;
- component and feature aggregates.

Основная проблема не в том, что provisional parameters существуют. Для ALPHA это допустимо. Проблема в том, что часть provisional rules фактически используется как active production-like behavior, а итоговый LDSP match классифицирован как `UNIVERSAL_GEOMETRY`.

## Component scope

Текущий output:

```text
CARCASS:
  LDSP 15.477280 m², 29 parts
  LHDF  2.726990 m²,  2 parts

DRAWER_COMPONENT:
  LDSP  0.739680 m², 4 parts
  LHDF  0.302016 m², 1 part

WALL_CABINET_COMPONENT:
  LDSP  0.448000 m², 4 parts
```

Оценка:

- drawer material не попадает в текущий carcass benchmark;
- facade parts при explicit dimensions получают отдельный `FACADE_COMPONENT`;
- wall cabinets включены в benchmark через отдельный component name;
- shelves не генерируются;
- часть backs не генерируется;
- decorative/end panels и non-carcass surfaces input не агрегируются;
- текущий LDSP match может быть следствием scope choice, а не полного BOM correctness;
- double counting в текущем одном aggregate pass не обнаружен, но scope contract остаётся provisional и требует независимых fixtures.

## Edge gap

```text
Basis:     105.230 m
Generated:  29.238 m
Delta:     -75.992 m
```

Текущий generated breakdown:

```text
CARCASS side fronts:    20.780 m
CARCASS bottom fronts:   5.717 m
CARCASS top fronts:      1.141 m
WALL side fronts:        1.600 m
Total:                  29.238 m
```

`29.238 m` внутренне согласован с текущей alpha policy: для emitted carcass/wall parts учитывается только `front` edge, backs не имеют edge, drawer parts не имеют edge.

Причины разрыва, которые видны из core:

- не сгенерированы shelves;
- не сгенерированы часть backs;
- не сгенерированы facade edges;
- не сгенерированы decorative/end panels;
- drawer box edges исключены;
- wall cabinet scope содержит только side panels;
- production exposure policy Basis не восстановлена.

Из одного aggregate Basis value `105.230 m` нельзя достоверно распределить весь gap между missing part types, missing sides и Basis-specific policy. Поэтому edge policy не следует расширять до исправления перечисленных defects и получения part-level reference.

## Facade gap

Текущий результат корректен для имеющегося input:

```text
Generated facade area: 0 m²
Status: INPUT_GAP
```

Input не содержит одновременно положительные `width_mm` и `height_mm` для фасадов. В частности, размеры отсутствуют у drawer/wall fronts; у отдельных island/appliance fronts присутствует только один из размеров.

Core не синтезирует размеры для достижения Basis reference `14.80 m²`, что является правильным поведением. Это не failure Construction Core.

Отдельно остаётся latent benchmark classification defect: даже после появления explicit facade dimensions текущая conditional expression всё равно выдаст `INPUT_GAP`.

## Hardware

Текущее состояние:

| Item | Quantity | Status |
|---|---:|---|
| `HINGES` | 3 | `PROVISIONAL_ALPHA` |
| `MOUNTING_PLATES` | 3 | `PROVISIONAL_ALPHA` |
| `LEGS` | 28 | `PROVISIONAL_ALPHA` |
| `PLINTH_CLIPS` | 14 | `PROVISIONAL_ALPHA` |
| `DOWELS_8x30` | 44 | `PROVISIONAL_ALPHA` |
| `CONFIRMATS_7x50` | 88 | `PROVISIONAL_ALPHA` |
| `DRAWER_MECHANISMS` | `null` | `NOT_IMPLEMENTED` |

У каждой строки есть `source_rule`, но не каждая quantity является полноценным OSS-derived algorithm:

- hinges используют provisional height threshold;
- mounting plates считаются one-per-hinge;
- legs/clips/dowels/confirmats являются fixed alpha structural assumptions;
- drawer mechanisms честно возвращаются как `NOT_IMPLEMENTED` из-за отсутствия vendor rule.

Фиктивного совпадения с Basis hardware quantities не обнаружено: Basis hardware targets не используются как calibration coefficients.

Дополнительное наблюдение: проверка `HINGE_COUNT_INPUT_GAP` фактически недостижима для invalid hinged fronts, поскольку такие fronts заранее отфильтровываются из `visibleHinged`.

## Test quality

Существующие **9 Construction Core tests** и общий `npm test` проходят. Также прошли:

```text
Node --check Construction_core/index.js
Node --test Construction_core/tests/construction_core.test.mjs
Npm test
Git diff --check
```

Текущие tests проверяют schema/profile validation, deterministic repeatability, width regression, отдельные geometry fixtures, area aggregation, edge aggregation, smoke output и наличие benchmark fields.

Они не ловят:

- ignored `benchmarkReference`;
- drawer `front.count` bug;
- facade edge orientation bug;
- facade benchmark classification defect;
- component scope assumptions;
- missing shelves/back rules;
- inaccurate hardware provenance;
- distinction между total materials и carcass benchmark scope.

Часть expected values повторяет implementation constants, например width test использует:

```js
width - core.RULES.dimensions.horizontal_width_reduction_mm
```

Такие tests доказывают внутреннюю consistency implementation, но не независимую correctness formula. Existing tests также привязаны к одному golden project и не содержат mutation fixtures для benchmark isolation или component boundary.

## Required fixes

Минимальный список в порядке выполнения:

1. Исправить benchmark API: убрать hard-coded targets/material codes из engine и реально использовать внешний `benchmarkReference`.
2. Исправить drawer generation с учётом `front.count`.
3. Исправить orientation logic для facade edge: `top/bottom -> Length_mm`, `left/right -> Width_mm`.
4. Исправить facade benchmark classification для случая с explicit facade dimensions.
5. Скорректировать provenance для fixed alpha assumptions и не выдавать их за реально перенесённые OSS algorithms.
6. Добавить regression tests на пункты 1–5, включая target isolation, drawer count, facade orientation и scope boundaries.
7. Переименовать или ослабить classification текущего LDSP match с `UNIVERSAL_GEOMETRY` до provisional/golden-case match, например `MATCH_ON_GOLDEN_CASE`.
8. Не расширять edge/back/studio rules до исправления этих defects и получения независимых fixtures.

В этой Debug-сессии production-код и существующие tests не исправлялись.

## Final repository state

До проверки рабочее дерево уже содержало незакоммиченные входные материалы:

```text
?? _tasks/
?? source-materials/Medvedev.Works.Calc/
```

После mutation tests не обнаружено изменений в:

```text
Construction_core/index.js
Construction_core/tests/
_tasks/alpha-construction-core/GOLDEN_INPUT_KITCHEN_2025-04-01.json
_tasks/alpha-construction-core/ALPHA_CONSTRUCTION_PROFILE_V1.json
Construction_core/generated/golden_kitchen_result.json
```

Создаваемый этим review artifact — единственное ожидаемое новое tracked-содержание. Commit не создавался.

## Recommended next action

Передать список **Required fixes** в отдельную Code-сессию для минимального corrective patch без расширения Construction Core scope.
