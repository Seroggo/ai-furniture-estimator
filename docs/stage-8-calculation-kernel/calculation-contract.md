# Stage 8 — Calculation Result contract

## Canonical boundary

`calculation-result-v1` is the sole Stage 8 output contract. Its machine-readable
source is `calculation-result.schema.json`; runtime code and tests may derive artifacts
from it but must not maintain a second result shape.

```text
validated project-input-v1
→ deterministic Stage 8 kernel
→ calculation-result-v1 (runtime memory only)
```

Stage 8 does not persist a calculation, create a quote database, or produce an offer.
`created_at` records execution time; it is not a persistence identity.

## Status and diagnostics

`SUCCESS` is returned only when layout, approved recipe resolution, quantity
calculation, published price resolution, and exact cost aggregation all complete.
Every business stop is a typed status and at least one blocker, not an exception:

| Status | Boundary |
|---|---|
| `INPUT_NOT_READY` | required fact is unknown, conflicting, inferred but unconfirmed, or not exactly mappable |
| `NOT_SUPPORTED` | geometry or semantics are outside the accepted automatic scope |
| `NO_VALID_LAYOUT` | Stage 3 constraints have no valid deterministic layout |
| `REQUIRES_EXPERT` | no applicable expert-approved module recipe exists |
| `PRICEBOOK_NOT_AVAILABLE` | no applicable ACTIVE published version exists |
| `PRICE_NOT_FOUND` | version exists but has no enabled exact `price_code` row |
| `UNIT_MISMATCH` | published price unit differs from the calculated quantity unit |
| `MASTER_DATA_INVALID` | master data is ambiguous, overlapping, malformed, or internally inconsistent |

`blockers[].stage`, `code`, `field_path`, and `provenance` identify the failed
boundary. Internal programming errors remain exceptions and are not disguised as
business blockers.

## Snapshots and provenance

The result preserves:

- the Project Input request/schema/parser reference, without copying user content;
- the accepted module-size source/version and exact rule sources used by layout;
- the exact approved recipe IDs, versions, variants, statuses, and approval provenance;
- exact calculation rule versions and execution modes;
- recipe, catalog, quantity, and price provenance on each item;
- the immutable `pricebook_version_id` used for cost.

Display names are never relationship keys. Runtime joins use stable IDs and codes.

## Exact decimals

All quantities, unit prices, item costs, and totals are canonical non-negative decimal
strings. Exponent notation, `NaN`, infinity, binary-float arithmetic, and implicit
rounding are forbidden. Stage 8 performs exact base-10 addition, multiplication, and
the already-confirmed millimetre-to-metre scale shifts. It does not invent currency
rounding, waste, sheet rounding, or manufacturing rules.

## Null and empty semantics

Blocked results keep the same top-level shape as successful results. A boundary that
was not reached is represented by empty item arrays and nullable `layout`, pricebook,
total, and currency fields. `null` never means zero and never supplies a default.

## Price truth

Official cost resolution accepts only `Pricebook_Versions` and `Prices`. The result
cannot cite `Custom_Price`, `spr_price`, or `GOOGLEFINANCE` as a price source. Exactly
one ACTIVE version must cover the calculation instant under `[effective_from,
effective_to)`, and every item must have exactly one compatible ENABLED price row.

## Recipe debt

An absent exact approved recipe returns `REQUIRES_EXPERT` with no fabricated
calculation items. The accepted blocking `MODULE_TO_PARTS_V1` debt is preserved until
an explicit, applicable, expert-approved recipe supplies the mapping; generic or
placeholder BOM generation is prohibited.
