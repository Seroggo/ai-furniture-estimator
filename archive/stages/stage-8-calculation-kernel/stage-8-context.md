# AI Мебельщик — Stage 8
## Детерминированное расчётное ядро

## 1. Режим

```text
Управление: NORMAL
Рекомендуемый Codex: GPT-5.6 Sol
Reasoning: HIGH
```

Stage 8 затрагивает критическую бизнес-логику. Stage 3 behavior является reference
baseline. Недоказанные производственные правила нельзя восстанавливать догадкой.

## 2. Цель

Реализовать production-oriented Apps Script calculation kernel:

```text
validated Project Input JSON
→ input readiness gate
→ deterministic adapter
→ layout
→ recipe resolution
→ quantity calculation
→ published pricebook resolution
→ cost calculation
→ Calculation Result
```

Stage 8 соединяет принятые Stage 3, Stage 4/5 и Stage 7 contracts.

## 3. Обязательный baseline

Изучи:

```text
AI_FURNITURE_EXECUTION.md
PROJECT_CONTEXT.md

docs/stage-7-openrouter-parser/project-input.schema.json
docs/stage-7-openrouter-parser/parser-contract.md
docs/stage-7-openrouter-parser/stage-7-report.md

docs/stage-3-calculation-model/stage-3.3-report.md
docs/stage-3-calculation-model/stage-3.4-report.md
calculation_model/layout_configurator.py
calculation_model/calculation_engine.py
tests/test_layout_configurator.py
tests/test_calculation_engine.py

docs/stage-4-google-sheets/google-sheets-schema.md
docs/stage-4-google-sheets/sheets-columns.csv
docs/stage-4-google-sheets/sheets-relations.csv
docs/stage-4-google-sheets/stage-4-price-patch-report.md

docs/stage-5-setup-system/stage-5-report.md
docs/stage-5-setup-system/stage-5-google-verification.md

docs/stage-6-apps-script-baseline/apps-script-development.md
docs/stage-6-apps-script-baseline/stage-6-report.md

docs/human-ux-patch/human-ux-contract.md

apps-script/
tests/
tools/
```

Не создавать duplicate files только из-за примерных имён.

## 4. Git baseline

Expected before context commit:

```text
branch: main
HEAD: ff5560a
working tree: clean
Git push: NO
```

Проверить фактический state:

```text
git status --short
git branch --show-current
git log -1 --oneline
```

## 5. Stage boundary

```text
Stage 7 = probabilistic understanding
Stage 8 = deterministic calculation
```

Stage 8 НЕ вызывает OpenRouter и не делает новых LLM decisions.

## 6. Project Input readiness gate

Schema-valid input не всегда calculation-ready.

Default fact-state policy:

```text
KNOWN → допустим
INFERRED → не считать confirmed hard input автоматически
UNKNOWN → blocker, если поле требуется
CONFLICT → blocker
NOT_APPLICABLE → только где семантически допустимо
```

Input gate возвращает typed blockers/questions и не:

- подставляет market default;
- выбирает одно значение из conflict;
- повышает INFERRED до KNOWN;
- придумывает constraint.

Для automatic linear layout нужны по смыслу:

```text
project_type = KITCHEN
supported straight run shape
KNOWN positive run_length_mm
deterministically mappable required functional constraints
```

Unsupported L/U/corner geometry → `NOT_SUPPORTED`.

Unknown/conflicting/unconfirmed required hard facts →
`INPUT_NOT_READY` / `NEEDS_CONFIRMATION` или эквивалент.

## 7. ProjectInput → LayoutRequest adapter

Создать отдельную deterministic boundary.

Adapter:

- читает только canonical Stage 7 fields;
- применяет readiness policy;
- нормализует только deterministic representation;
- использует explicit supported role/class mappings;
- не использует fuzzy/LLM matching;
- неизвестный alias → blocker;
- сохраняет provenance для объяснения blocker.

Если human role/name требует alias mapping, mapping должен быть versioned, explicit и tested.

## 8. Layout runtime parity

Reference:

```text
calculation_model/layout_configurator.py
```

Apps Script/runtime behavior должен сохранять:

```text
hard constraints > optimisation
A/B/C generic
D specialized-only
E not automatic
filler separate
no arbitrary widths
NO_VALID_LAYOUT explicit
determinism
unsupported geometry explicit
```

Создать golden/shared fixtures для Python ↔ Apps Script parity.

## 9. Module_Size_Rules runtime data

Accepted architecture:

```text
Module_Size_Rules → configurator
```

DEV sheet сейчас пуст.

Если runtime layout должен читать правила из Sheets, Stage 8 реализует минимальный
controlled import/sync из:

```text
source-materials/kitchen-module-reference-comparison.csv
```

Требования:

- deterministic mapping;
- provenance preserved;
- stable IDs;
- idempotent;
- no duplicate business rules;
- no invented STUDIO_STANDARD;
- no hand-maintained second source of truth;
- импортировать только нужный accepted subset для linear configurator.

Предпочтительно:

```text
canonical CSV
→ generated artifact
→ controlled sync
→ Module_Size_Rules
→ runtime read
```

Unknown non-managed rows нельзя destructively overwrite.

## 10. Recipe/BOM boundary

Accepted state:

```text
MODULE_TO_PARTS_V1 = REQUIRES_EXPERT
Module_Recipes = no approved production recipes
Module_Recipe_Items = no approved production items
```

Stage 8 реализует recipe resolver contract:

```text
LayoutItem
→ applicable approved recipe?
→ no → REQUIRES_EXPERT
```

Запрещено создавать synthetic carcass panels, facade dimensions, edge, hardware,
works или placeholder recipes.

A real DEV calculation may legitimately stop at `REQUIRES_EXPERT`.

## 11. Calculation rule registry

Preserve statuses:

```text
CONFIRMED
DERIVED
PROVISIONAL
REQUIRES_EXPERT
NOT_SUPPORTED
```

Execution modes:

```text
CODE_BINDING
METADATA_ONLY
BLOCKING_STATUS
```

Executable formulas remain in code, never in cells/JSON.

Если runtime требует accepted Stage 3 rule metadata in `Calculation_Rules`, sync must
be deterministic and derived from accepted rule registry rather than hand-maintained.

## 12. Quantity engine parity

Reference:

```text
calculation_model/calculation_engine.py
```

Preserve accepted rules only:

```text
area_m2
edge_length_m
explicit quantity
quantity × price
```

and other already-confirmed Stage 3 behavior.

Do NOT add universal waste, sheet rounding, hidden Medvedev quantities, Basis alternative
auto-selection or new manufacturing formulas.

## 13. Decimal / money correctness

Python uses Decimal semantics.

Apps Script must not introduce uncontrolled IEEE-754 money drift.

Use minimal exact strategy:

- fixed-point;
- decimal-string arithmetic;
- or equivalent dependency-light exact representation.

Requirements:

- deterministic;
- explicit scale;
- no invented rounding policy;
- parity-tested against Python;
- totals derived from exact item results.

## 14. Published pricebook resolver

Official Stage 8 reads only:

```text
Pricebook_Versions
Prices
```

Never:

```text
Custom_Price
spr_price
GOOGLEFINANCE
```

Resolve exactly one applicable ACTIVE version under:

```text
[effective_from, effective_to)
```

No applicable version → `PRICEBOOK_NOT_AVAILABLE`.

More than one applicable ACTIVE → `MASTER_DATA_INVALID`.

Each calculation item:

```text
price_code + unit
→ exactly one compatible published price
```

Missing price → `PRICE_NOT_FOUND`.

Unit mismatch → `UNIT_MISMATCH`.

Stage 8 does not implement price publication or CURRENT_REPRICE.

## 15. Calculation Result contract

Create one canonical versioned machine-readable result contract, preferably:

```text
docs/stage-8-calculation-kernel/calculation-result.schema.json
```

It should express:

```text
result_schema_version
calculation_model_version
status
project/input reference
input_schema_version
blockers
warnings
layout snapshot
rule/version snapshot
calculation items
cost results
pricebook_version_id
total
currency
created_at
```

Expected distinguishable statuses may include equivalents of:

```text
SUCCESS
INPUT_NOT_READY
NOT_SUPPORTED
NO_VALID_LAYOUT
REQUIRES_EXPERT
PRICEBOOK_NOT_AVAILABLE
PRICE_NOT_FOUND
UNIT_MISMATCH
MASTER_DATA_INVALID
```

Business blockers must be distinguishable from internal exceptions.

## 16. No result persistence

Stage 8 returns Calculation Result in runtime memory.

Do NOT create:

```text
Calculations
Offer
Quote DB
dashboard
PDF
CRM workflow
```

## 17. Tests

### A. Readiness

At minimum:

1. KNOWN straight run → adapter-ready;
2. UNKNOWN run length → INPUT_NOT_READY;
3. CONFLICT run length → INPUT_NOT_READY;
4. INFERRED hard dimension not silently accepted;
5. L/U/corner → NOT_SUPPORTED;
6. unknown role alias → blocker.

### B. Layout parity

Cover accepted Stage 3 scenarios:

- rational combination;
- mandatory dishwasher slot;
- specialized width not generic;
- explicit specialized/cargo role;
- NO_VALID_LAYOUT;
- determinism.

Compare runtime with Python reference/golden results.

### C. Recipe boundary

- no approved recipe → REQUIRES_EXPERT;
- blocking `MODULE_TO_PARTS_V1` cannot be bypassed;
- no synthetic BOM.

### D. Quantity/cost parity

With test-only in-memory approved fixtures:

- area;
- edge;
- explicit quantity;
- changing price changes cost, not quantity;
- price_code mismatch rejected;
- unit mismatch rejected;
- exact decimal parity.

Never write fake production recipes/prices into DEV merely for tests.

### E. Pricebook resolver

- one applicable ACTIVE → accepted;
- none → PRICEBOOK_NOT_AVAILABLE;
- overlap → MASTER_DATA_INVALID;
- no fallback to spr_price.

### F. Result contract

- success result valid;
- blocker result valid;
- versions/provenance present;
- no undocumented fields.

## 18. Real DEV checkpoint

Stage 8 COMPLETE requires real bound DEV verification.

### Smoke A — runtime/master data

- load/verify master data;
- if Stage 8 adds controlled Module_Size_Rules sync, run and verify idempotency;
- no synthetic recipe/catalog/price rows;
- blocking Calculation_Rules preserved.

### Smoke B — deterministic calculation blocker

Use synthetic/non-sensitive validated Project Input.

Expected current DEV path may be:

```text
layout succeeds
→ recipe resolution
→ REQUIRES_EXPERT
```

This is an acceptable live PASS because it reflects accepted missing expert data.

Do NOT seed fake recipe/price rows to force SUCCESS.

Full-path SUCCESS is proven locally with explicitly test-only in-memory fixtures.

## 19. Apps Script / clasp

Use accepted Stage 6 workflow.

Before remote write:

```text
tests PASS
Git clean
correct bound DEV target
fresh remote snapshot
exact diff reviewed
exact allowlist
```

Then controlled push and isolated round-trip.

No new Apps Script project or deployment.

If manual execution is needed, request exactly one concrete action.

## 20. Expected artifacts

Minimum:

```text
docs/stage-8-calculation-kernel/
├── stage-8-context.md
├── calculation-result.schema.json
├── calculation-contract.md
└── stage-8-report.md
```

Apps Script modules should cover coherent semantic areas such as:

```text
project input adapter
layout runtime
master-data loader
recipe resolver
quantity/cost engine
pricebook resolver
calculation orchestrator
```

Generated artifacts only when derived from canonical sources and freshness-checkable.

## 21. Acceptance criteria

Stage 8 = COMPLETE when:

1. Validated Project Input is the business input.
2. Stage 8 never calls OpenRouter.
3. Deterministic readiness gate exists.
4. INFERRED is not silently confirmed.
5. UNKNOWN/CONFLICT blockers are explicit.
6. Explicit tested ProjectInput → LayoutRequest adapter exists.
7. No fuzzy role matching.
8. Layout runtime proves Stage 3 parity.
9. No arbitrary widths or STUDIO_STANDARD.
10. Unsupported geometry remains explicit.
11. Module-size runtime data source is deterministic/provenanced.
12. Any Module_Size_Rules sync is idempotent/non-destructive.
13. Recipe resolver exists.
14. Missing approved recipe → REQUIRES_EXPERT.
15. MODULE_TO_PARTS_V1 cannot be bypassed.
16. No synthetic BOM.
17. Quantity rules prove reference parity.
18. Decimal arithmetic is deterministic/parity-tested.
19. Official calculation uses only published pricebook.
20. No direct spr_price/GOOGLEFINANCE dependency.
21. Effective-period pricebook selection deterministic.
22. Invalid/missing price states explicit.
23. unit/price_code compatibility enforced.
24. One canonical versioned Calculation Result contract exists.
25. Success and blocker results validate.
26. No quote persistence.
27. Stage 8 tests PASS.
28. Stage 7 tests PASS.
29. Stage 6 checks PASS.
30. Stage 5/4/3/Human UX regressions PASS.
31. Generated artifacts CURRENT.
32. Apps Script syntax/static PASS.
33. py_compile/checks PASS.
34. secret scan PASS.
35. git diff --check PASS.
36. controlled clasp verification PASS.
37. real DEV checkpoint reflects real data without fake rows.
38. stage-8-report.md exists.
39. working tree clean.
40. Git push NO.
41. Stage 9 not started.

`REQUIRES_EXPERT` in real DEV does not make Stage 8 PARTIAL if the kernel is correct,
the blocker is accepted missing production recipe data, full path is proven with
test-only fixtures, and no production data is fabricated.

## 22. Do not do

Do NOT implement:

- new LLM calls;
- synthetic BOM/recipes;
- historical prices as production;
- pricebook publication from spr_price;
- CURRENT_REPRICE;
- Web App;
- physical Calculations/Offer;
- Quote DB;
- PDF/XLSX;
- full ±10% backtest;
- Stage 9;
- Git push.

## 23. Report

Create:

```text
docs/stage-8-calculation-kernel/stage-8-report.md
```

Include:

```text
Status
Runtime architecture
Project Input readiness
Adapter
Layout parity
Module-size master data
Recipe resolver / expert debt
Quantity engine
Decimal strategy
Pricebook resolver
Calculation Result contract
Tests / parity
Google DEV verification
Clasp verification
Deferred scope
Git
```

After Stage 8 stop. Stage 9 requires HQ acceptance.
