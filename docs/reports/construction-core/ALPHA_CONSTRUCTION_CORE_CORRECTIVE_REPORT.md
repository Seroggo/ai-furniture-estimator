# ALPHA Construction Core — Corrective Report

## Status

`CORRECTIVE_PATCH_COMPLETE`

All mandatory validation checks passed before and after golden artifact regeneration.

## Fixed

- Benchmark API externalized to the supplied `benchmarkReference`; benchmark targets and material mappings are loaded from `BENCHMARK_REFERENCE_BASIS_KITCHEN_V1.json`.
- Benchmark absence is explicit: `Benchmark === null` when no reference is supplied; no input fallback is used.
- Drawer `front.count` now multiplies complete drawer box groups.
- Facade edge orientation now maps top/bottom to `Length_mm` and left/right to `Width_mm`.
- Facade benchmark classification returns `INPUT_GAP` only when dimensions are missing and a provisional classification for generated explicit facades.
- Fixed alpha assumptions use OUR provenance with null repository, commit, and source path fields.
- LDSP benchmark classification is `MATCH_ON_GOLDEN_CASE`, not `UNIVERSAL_GEOMETRY`.
- Construction Core tests are integrated into the main `npm test` chain through `test:core`.

## Tests

| Check | Result |
|---|---|
| `node --check Construction_core/index.js` | PASS |
| `node --test Construction_core/tests/construction_core.test.mjs` | PASS — 16 tests |
| `npm test` | PASS — all suites, including 77 Python regression tests |
| `git diff --check` | PASS |

The same checks passed again after golden artifact regeneration.

## Golden result

| Metric | Golden | Generated | Delta | Classification |
|---|---:|---:|---:|---|
| LDSP | 15.93 m² | 15.92528 m² | -0.00472 m² | `MATCH_ON_GOLDEN_CASE` |
| LHDF | 2.73 m² | 2.72699 m² | -0.00301 m² | `PROVISIONAL_ALPHA_RULE` |
| Edge | 105.23 m | 29.238 m | -75.992 m | `PROVISIONAL_ALPHA_RULE` |
| Facade | 14.80 m² | 0 m² | -14.80 m² | `INPUT_GAP` |

## Behavioral changes

Relative to `2f5f7cb12e86a53d10c5facded44811be8b6223e`, drawer box quantities now reflect `front.count`. The regenerated golden input therefore changes the `IS_BASE_02` drawer quantities from `DRAWER_SIDE 2 / DRAWER_FRONT_BOX 1 / DRAWER_BACK_BOX 1 / DRAWER_BOTTOM 1` to `4 / 2 / 2 / 2`. No facade geometry is synthesized for the existing golden input because its facade dimensions remain incomplete.

## Remaining gaps

- Production edge exposure and waste policy remain outside the alpha scope.
- Full back construction mode and shelf schedule remain unimplemented.
- Vendor drawer mechanism mapping and production fastener schedule require confirmed rules/data.
- Confirmed facade dimensions and facade material variants are required for a numeric facade benchmark on the golden input.
