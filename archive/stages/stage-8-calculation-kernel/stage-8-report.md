# Stage 8 — Report

## Status

```text
STAGE 8 — COMPLETE
```

The deterministic kernel, canonical result contract, Stage 3 parity fixtures, local
full-path in-memory proof, accepted Stage 6 clasp round-trip, and real bound DEV smoke
are complete. Stage 9 was not started.

## Runtime architecture

```text
validated project-input-v1
→ readiness / confirmation gate
→ exact ProjectInput → LayoutRequest adapter
→ Module_Size_Rules-backed layout runtime
→ approved recipe resolver
→ exact quantity engine
→ published Pricebook_Versions + Prices resolver
→ exact cost engine
→ calculation-result-v1 (runtime memory)
```

The Apps Script modules separate input, master-data, layout, recipe, quantity,
decimal, pricebook, and orchestration boundaries. Stage 8 contains no OpenRouter
transport call and creates no calculation/offer persistence.

## Project Input readiness

Hard facts must be `KNOWN`. `INFERRED` produces `NEEDS_CONFIRMATION`; `UNKNOWN` and
`CONFLICT` produce explicit blockers. Non-straight geometry produces
`NOT_SUPPORTED`. No missing value is replaced with a market default.

## Adapter

The adapter reads only canonical Stage 7 fields. Role mapping is exact and versioned
as `project-input-role-map-v1`; unknown aliases block and no fuzzy matching exists.
Required module role, class, width, and quantity must all be known. Stage 7 constraints
that cannot be represented by the accepted Stage 3 `LayoutRequest` block instead of
being silently dropped. Because project-input-v1 has no filler fact, the adapter keeps
filler disabled rather than inventing an allowance.

## Layout parity

`layout_runtime.gs` ports the Stage 3 Python priorities and hard constraints: A/B/C
automatic ranks, D specialized/explicit only, E not automatic, exact widths only,
separate filler, deterministic ordering, and explicit unsupported/no-layout states.
The shared generated golden fixture covers rational selection, dishwasher position,
specialized width exclusion, explicit cargo, no valid layout, and repeatability.

## Module-size master data

`generate_module_size_rules.py` derives only the linear-configurator class/width
subset from accepted PRIMARY exact rows in
`source-materials/kitchen-module-reference-comparison.csv`. The generated rows retain
MKT IDs, ranks, source records, and provenance. `setupSystem()` and
`syncStage8ModuleSizeRules()` append/verify managed rows idempotently and preserve
unknown non-managed rows. No `STUDIO_STANDARD` or second hand-maintained source exists.

Confirmed executable Stage 3 quantity/cost rule metadata is generated from the Python
`RULE_REGISTRY` into `Calculation_Rules` with exact code bindings. The accepted
`MODULE_TO_PARTS_V1:1` remains `DRAFT / REQUIRES_EXPERT / BLOCKING_STATUS`.

## Recipe resolver / expert debt

Resolution uses exact `module_class + module_role`, approved status, lifecycle, and
effective period. Ambiguity or malformed items is `MASTER_DATA_INVALID`. When no
approved recipe exists, exactly one accepted blocking `MODULE_TO_PARTS_V1` is required
and the result is `REQUIRES_EXPERT` with zero fabricated items. Test-only approved
recipes exist only in memory; no production recipe/BOM row is seeded.

## Quantity engine

Only accepted Stage 3 bindings execute:

- `QTY_AREA_MM_V1`;
- `QTY_EDGE_LENGTH_V1`;
- `QTY_BASIS_ORDER_V1`;
- `QTY_EXPLICIT_SOURCE_V1`;
- `COST_UNIT_PRICE_V1`.

Recipe items pin exact rule versions and active catalog IDs/codes/units. No waste,
sheet rounding, hidden Medvedev quantities, alternative auto-selection, or new
manufacturing formula was added.

## Decimal strategy

All quantity, price, cost, and total values are canonical decimal strings. A
dependency-free digit-string implementation performs non-negative base-10 addition,
multiplication, and exact power-of-ten scaling. There is no implicit currency rounding
or IEEE-754 accumulation. Local parity includes `0.1 × 0.2 = 0.02`,
`0.1 + 0.2 = 0.3`, and item totals derived only from exact item costs.

## Pricebook resolver

Official resolution reads only `Pricebook_Versions` and `Prices`. Exactly one ACTIVE
`production_pricebook` version must cover `[effective_from, effective_to)`. Prices
must match exact version, `price_code`, catalog item, unit, and currency. Missing,
overlap, duplicate, unit, and malformed decimal states are typed. `Custom_Price`,
`spr_price`, and `GOOGLEFINANCE` are not fallback sources. Publication and
`CURRENT_REPRICE` remain deferred.

## Calculation Result contract

Canonical files:

```text
docs/stage-8-calculation-kernel/calculation-result.schema.json
docs/stage-8-calculation-kernel/calculation-contract.md
```

`calculation-result-v1` preserves input reference, blockers/warnings, layout and
module-size version, approved recipe snapshot, calculation rule versions, quantity
items, immutable pricebook ID, exact item costs/total/currency, and timestamp. SUCCESS
and blocker runtime outputs validate against the Draft 2020-12 schema with additional
properties forbidden. The result remains in runtime memory.

The `calculation-result-v1` version remains unchanged. `DecimalString` now enforces
the canonical decimal representation: zero is `"0"`, integers have no decimal point,
and a non-empty fractional part ends in a non-zero digit, without rounding. `SUCCESS`
requires no blockers and requires completed `layout`, `pricebook_version_id`, `total`,
and `currency` fields. Every non-`SUCCESS` business status requires at least one
blocker.

## Tests / parity

Current local checkpoint:

```text
Stage 8 Node:            10 / 10 PASS
Stage 7 Node:            19 / 19 PASS
Stage 6 Node:            11 / 11 PASS
Python regressions:      77 / 77 PASS
Stage 5/4/3/Human UX:    PASS inside Python regression suite
generated artifacts:     CURRENT
Sheets schema:           11 sheets / 136 columns VALID
Apps Script syntax:      PASS
py_compile:              PASS
secret scan:             PASS
git diff --check:        PASS
```

The local full path uses explicitly test-only in-memory approved recipes, catalog,
rule versions, and published pricebook rows. It proves area, edge, explicit quantity,
price separation, exact cost, and total without writing any fixture to DEV.

## Google DEV verification

`runStage8DevSmoke()` was executed in the existing bound DEV Apps Script editor. It
first ran the idempotent workbook setup, synchronized only canonical module-size rows,
repeated the sync, and calculated a synthetic non-sensitive validated Project Input.
The safe execution log reported:

```text
status:                  PASS
setupStatus:             PASS
resultStatus:            REQUIRES_EXPERT
layoutStatus:            VALID
layoutItems:             1
blockerCode:             APPROVED_RECIPE_REQUIRED
module-size version:     module-size-rules-stage3-linear-v1
managed module rows:     59
sync idempotent:         true
recipes created:         0
prices created:          0
OpenRouter called:       false
```

Execution completed without exception. The real-data blocker is accepted expert debt,
not a kernel failure. No fake recipe, catalog, or price row was written.

## Clasp verification

The fresh preflight snapshot used the existing bound DEV target suffix `...HvYv52`.
Unknown remote files were zero and the exact deploy allowlist contained 19 files. The
first controlled push completed remotely even though its local process did not return;
an isolated snapshot proved `SAME 19/19`. After adding only a safe smoke-summary log,
a second fresh preflight passed and normal (non-force) `clasp push` reported 19 files
pushed. The final isolated round-trip reported:

```text
SAME:          19 / 19
REMOTE_ONLY:    0
LOCAL_ONLY:     0
DIFFERENT:      0
unknown files:  0
```

No force push, new Apps Script project, deployment, Web App, or API Executable was
used or created.

## Deferred scope

Recipe expert authoring, pricebook publication, CURRENT_REPRICE, Web App, physical
Calculations/Offer sheets, quote database, dashboard, PDF/XLSX, CRM, and Stage 9 are
not implemented.

## Git

```text
branch: main
implementation commit: 4fc8f76
safe smoke summary: bfcffc1
corrective contract patch: dd5b5a9
completion report: this report's final local commit
Git push: NO
working tree: clean after final report commit
Stage 9: not started
```
