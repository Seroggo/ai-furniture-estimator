# Stage 5 — Google verification

## Result

```text
PASS
verified_at: 2026-08-11T16:01:28+05:00
```

## Target

```text
spreadsheet_id: 1begIbLngVMshpAmnn142TozbHWgIAD-QBvKX6y8NNvs
url: https://docs.google.com/spreadsheets/d/1begIbLngVMshpAmnn142TozbHWgIAD-QBvKX6y8NNvs/edit
title: AI Furniture Calculation Base — DEV
locale: ru_RU
time_zone: Asia/Yekaterinburg
```

Verification выполнен read-only через Google Sheets connector после подтверждённых
пользователем первого и второго успешных запусков `setupSystem()`.

## Setup runs

```text
first run: PASS
second run: PASS
idempotency: PASS
```

После второго запуска connector подтверждает отсутствие duplicate sheets,
duplicate headers и duplicate system seeds. Canonical data/seed rows сохранены.

## Structure and exact headers

Каждый header row считан через полный bounded range `A1:<last-column>1000` и
сопоставлен с accepted order `sheets-columns.csv` / generated manifest.

| Index | Sheet | Columns | Exact headers | Frozen rows |
|---:|---|---:|---|---:|
| 0 | `Schema_Meta` | 9 | PASS | 1 |
| 1 | `System_Config` | 11 | PASS | 1 |
| 2 | `Module_Size_Rules` | 18 | PASS | 1 |
| 3 | `Module_Recipes` | 12 | PASS | 1 |
| 4 | `Module_Recipe_Items` | 12 | PASS | 1 |
| 5 | `Catalog_Items` | 8 | PASS | 1 |
| 6 | `spr_price` | 17 | PASS | 1 |
| 7 | `Pricebook_Versions` | 11 | PASS | 1 |
| 8 | `Prices` | 15 | PASS | 1 |
| 9 | `Calculation_Rules` | 15 | PASS | 1 |
| 10 | `Reference_Values` | 8 | PASS | 1 |
| | **Total** | **136** | **PASS** | **11/11** |

Canonical sheet order: PASS. Unknown/additional sheets: отсутствуют.

## Seed and production-data verification

| Sheet | Data rows | Verification |
|---|---:|---|
| `Schema_Meta` | 1 | canonical bootstrap record |
| `System_Config` | 0 | no invented config |
| `Module_Size_Rules` | 0 | no unrequested import |
| `Module_Recipes` | 0 | no synthetic recipes |
| `Module_Recipe_Items` | 0 | no synthetic BOM |
| `Catalog_Items` | 0 | no production catalog |
| `spr_price` | 0 | no production working prices |
| `Pricebook_Versions` | 0 | no production/historical pricebook |
| `Prices` | 0 | no production/historical prices |
| `Calculation_Rules` | 1 | accepted blocking rule only |
| `Reference_Values` | 79 | accepted schema enum seeds only |

`Schema_Meta` record:

```text
schema_version_id: SCHEMA_STAGE4_PRICE_PATCH_V1
schema_name: calculation_database
version: 1
status: ACTIVE
effective_from: 2026-08-11
compatible_runtime_version: stage-5-setup-v1
provenance: accepted columns/relations artifacts + setup timestamp
```

`Calculation_Rules` seed:

```text
rule_version_id: MODULE_TO_PARTS_V1:1
rule_id: MODULE_TO_PARTS_V1
rule_status: REQUIRES_EXPERT
execution_mode: BLOCKING_STATUS
lifecycle_status: DRAFT
```

`Reference_Values`:

```text
rows: 79
unique reference_value_id: 79
unique (reference_set, reference_code): 79
status values: ACTIVE only
provenance: accepted sheets-columns.csv fields
```

## Validations

Body-row validation metadata всех 136 columns считана через
`get_spreadsheet_cells` и сопоставлена с setup definition. Одинаковые counts и
rules подтверждены на первой (`row 2`) и последней (`row 1000`) строках setup
range, поэтому validation coverage распространяется на весь подготовленный body.

| Validation type | Expected | Actual |
|---|---:|---:|
| `CUSTOM_FORMULA` | 7 | 7 |
| `ONE_OF_LIST` | 24 | 24 |
| `ONE_OF_RANGE` | 9 | 9 |
| `DATE_IS_VALID` | 14 | 14 |
| `NUMBER_GREATER` | 7 | 7 |
| `NUMBER_GREATER_THAN_EQ` | 5 | 5 |
| **Total** | **66** | **66** |

```text
strict validations: 66
non-strict validations: 0
setAllowInvalid(false) behavior: confirmed by native metadata
```

Все 7 integer rules используют locale-neutral custom formulas без argument
separators. Проверены оба accepted minimum contracts:

```text
integer >= 1: =ISNUMBER(C2)*(C2=INT(C2))*(C2>=1)=1
integer >= 0: =ISNUMBER(E2)*(E2=INT(E2))*(E2>=0)=1
```

`spr_price.pricing_mode` strict enum содержит:

```text
MANUAL_RUB
FX_AUTO
FX_MANUAL
```

## Formatting

| Number format | Expected columns | Actual columns |
|---|---:|---:|
| `TEXT` / `@` | 103 | 103 |
| `NUMBER` | 19 | 19 |
| `DATE` | 8 | 8 |
| `DATE_TIME` | 6 | 6 |
| **Total** | **136** | **136** |

Header formatting:

```text
bold: 136 / 136
wrap: 136 / 136
light gray #eeeeee: 136 / 136
frozen header row: 11 / 11 sheets
```

Visual-format verification выполнен по native Sheets metadata, поскольку
авторизованный CUA render в этой среде недоступен. Clipping/column visual fit не
проверялись пиксельным render; schema-level header styles и cell formats
подтверждены native metadata на начале и конце body range, повреждений не найдено.

## Deferred behavior

В соответствии со Stage 5 scope не реализованы и не проверялись:

- pricebook publication runtime;
- `CURRENT_REPRICE` runtime;
- `GOOGLEFINANCE` row-management/formula preview;
- Stage 6 Apps Script baseline/clasp.

Эти deferred items не являются blocker Stage 5.
