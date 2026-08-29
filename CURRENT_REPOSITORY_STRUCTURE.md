# Current Repository Structure

Snapshot of the tracked filesystem of the working repository at the time of audit. The inventory below is generated exclusively from `git ls-files` and contains only paths currently tracked by Git. No untracked files, no `.git/` internals, no build artifacts.

## 1. Metadata

| Field | Value |
|---|---|
| Repository | `ai-furniture-estimator` |
| Working tree | `C:\Project_all\ai-furniture-estimator` |
| Branch | `main` |
| HEAD commit | `0b112b3e1f3f689f2cb6b2ad06a7a6947cd9860b` (`0b112b3`) |
| HEAD subject | `Define target sheets architecture v1` |
| HEAD author | Serge Goobeen |
| HEAD date | `2026-08-29 12:04:49 +0500` |
| Audit date | `2026-08-29` |
| Tracked file count | `150` |
| Top-level directory count | `10` |
| Top-level tracked root files | `11` |

The tracked inventory was captured before creating this audit document. `CURRENT_REPOSITORY_STRUCTURE.md` is the audit artifact and is intentionally not included in the snapshot tree, so the snapshot remains a non-self-referential record of the pre-audit repository state.

Source of inventory: `git ls-files` (full output, no truncation, no exclusion by extension).

## 2. Current top-level structure

```
/
├── .clasp.example.json
├── .claspignore
├── .gitignore
├── AI_FURNITURE_EXECUTION.md
├── ALPHA_CONSTRUCTION_CORE_CORRECTIVE_REPORT.md
├── ALPHA_CONSTRUCTION_CORE_DEBUG_REVIEW.md
├── ALPHA_CONSTRUCTION_CORE_REPORT.md
├── PROJECT_CONTEXT.md
├── STAGE_10_LOCAL_E2E_REPORT.md
├── package-lock.json
├── package.json
├── _tasks/
├── apps-script/
├── calculation_model/
├── Construction_core/
├── docs/
├── source-materials/
├── Stage_10_input_understanding/
├── stages/
├── tests/
└── tools/
```

All paths above are taken verbatim from `git ls-files` output; no path is invented.

## 3. Full tracked-file tree

Grouped by top-level folder, alphabetical/path order inside each group. Every path is a real tracked file (each appears exactly once).

### _tasks/

```
_tasks/alpha-construction-core/ALPHA_CONSTRUCTION_PROFILE_V1.json
_tasks/alpha-construction-core/BASIS_GOLDEN_BENCHMARK.md
_tasks/alpha-construction-core/BENCHMARK_REFERENCE_BASIS_KITCHEN_V1.json
_tasks/alpha-construction-core/CONFIRMED_CONFIGURATION_V1.schema.json
_tasks/alpha-construction-core/GOLDEN_INPUT_KITCHEN_2025-04-01.json
_tasks/pre-deployment-sheets-architecture/TARGET_SHEETS_ARCHITECTURE_V1.md
_tasks/stage-10-input-understanding/DRAFT_CONFIGURATION_V1.schema.json
_tasks/stage-10-input-understanding/INPUT_EVIDENCE_V1.schema.json
_tasks/stage-10-input-understanding/STAGE_10_1_INPUT_EVIDENCE_CONTRACT.md
_tasks/stage-10-input-understanding/STAGE_10_2_CLARIFICATION_ENGINE.md
_tasks/stage-10-input-understanding/STAGE_10_3_VISION_RECOGNITION_MVP.md
_tasks/stage-10-input-understanding/STAGE_10_4_EVIDENCE_FUSION.md
_tasks/stage-10-input-understanding/STAGE_10_5_DYNAMIC_BRIEF_CONFIRMATION.md
_tasks/stage-10-input-understanding/STAGE_10_6_CONFIRMED_TO_CONSTRUCTION_CORE.md
_tasks/stage-10-input-understanding/STAGE_10_7_LOCAL_E2E_ALPHA.md
_tasks/stage-10-input-understanding/STAGE_10_CONTEXT.md
```

### apps-script/

```
apps-script/appsscript.json
apps-script/calculation_orchestrator.gs
apps-script/custom_price.gs
apps-script/decimal_math.gs
apps-script/generated/calculation_result_schema.gs
apps-script/generated/human_ux_manifest.gs
apps-script/generated/module_size_rules.gs
apps-script/generated/project_input_schema.gs
apps-script/generated/schema_manifest.gs
apps-script/layout_runtime.gs
apps-script/master_data_loader.gs
apps-script/openrouter_client.gs
apps-script/pricebook_resolver.gs
apps-script/project_input_adapter.gs
apps-script/project_parser.gs
apps-script/prompts/project_parser_prompt.gs
apps-script/quantity_engine.gs
apps-script/recipe_resolver.gs
apps-script/setup_system.gs
apps-script/stage9_server.gs
apps-script/web_app.html
```

### calculation_model/

```
calculation_model/__init__.py
calculation_model/calculation_engine.py
calculation_model/layout_configurator.py
```

### Construction_core/

```
Construction_core/generate_golden.mjs
Construction_core/generated/golden_kitchen_result.json
Construction_core/index.js
Construction_core/tests/construction_core.test.mjs
```

### docs/

```
docs/human-ux-patch/calculations-ux-contract.md
docs/human-ux-patch/custom-price-schema.json
docs/human-ux-patch/human-ux-contract.md
docs/human-ux-patch/human-ux-patch-report.md
docs/human-ux-patch/offer-ux-contract.md
docs/stage-3-calculation-model/stage-3.2-report.md
docs/stage-3-calculation-model/stage-3.3-context.md
docs/stage-3-calculation-model/stage-3.3-report.md
docs/stage-3-calculation-model/stage-3.4-context.md
docs/stage-3-calculation-model/stage-3.4-report.md
docs/stage-3-calculation-model/studio-module-analysis.md
docs/stage-3-calculation-model/studio-module-comparison.csv
docs/stage-3-calculation-model/studio-module-visual-evidence.csv
docs/stage-4-google-sheets/google-sheets-schema.md
docs/stage-4-google-sheets/sheets-columns.csv
docs/stage-4-google-sheets/sheets-relations.csv
docs/stage-4-google-sheets/stage-4-context.md
docs/stage-4-google-sheets/stage-4-price-patch-context.md
docs/stage-4-google-sheets/stage-4-price-patch-report.md
docs/stage-4-google-sheets/stage-4-report.md
docs/stage-5-setup-system/google-run-checklist.md
docs/stage-5-setup-system/stage-5-context.md
docs/stage-5-setup-system/stage-5-google-verification.md
docs/stage-5-setup-system/stage-5-locale-validation-fix-report.md
docs/stage-5-setup-system/stage-5-report.md
docs/stage-6-apps-script-baseline/apps-script-development.md
docs/stage-6-apps-script-baseline/stage-6-context.md
docs/stage-6-apps-script-baseline/stage-6-report.md
docs/stage-7-openrouter-parser/parser-contract.md
docs/stage-7-openrouter-parser/project-input.schema.json
docs/stage-7-openrouter-parser/stage-7-context.md
docs/stage-7-openrouter-parser/stage-7-report.md
docs/stage-8-calculation-kernel/calculation-contract.md
docs/stage-8-calculation-kernel/calculation-result.schema.json
docs/stage-8-calculation-kernel/stage-8-context.md
docs/stage-8-calculation-kernel/stage-8-report.md
docs/stage-9-web-app/stage-9-context.md
docs/stage-9-web-app/stage-9-report.md
docs/stage-9-web-app/web-app-contract.md
```

### source-materials/

```
source-materials/Medvedev.Works.Calc.zip
source-materials/kitchen-module-reference-comparison.csv
```

### Stage_10_input_understanding/

```
Stage_10_input_understanding/confirmation.js
Stage_10_input_understanding/construction_adapter.js
Stage_10_input_understanding/fixtures/e2e/scenario_a_draft.json
Stage_10_input_understanding/fixtures/e2e/scenario_a_vision_observation.json
Stage_10_input_understanding/fixtures/e2e/scenario_b_draft.json
Stage_10_input_understanding/fixtures/e2e/scenario_b_vision_observation.json
Stage_10_input_understanding/fixtures/e2e/scenario_c_draft.json
Stage_10_input_understanding/fixtures/e2e/scenario_c_vision_observation.json
Stage_10_input_understanding/fixtures/mini_kitchen_draft_733.json
Stage_10_input_understanding/fixtures/vision/Kitchen_entities.json
Stage_10_input_understanding/fixtures/vision/Kitchen_with_visible_dimensions.json
Stage_10_input_understanding/fusion.js
Stage_10_input_understanding/index.js
Stage_10_input_understanding/pipeline.js
Stage_10_input_understanding/vision.js
```

### stages/

```
stages/01-audit/data-map.csv
stages/01-audit/file-inventory.csv
stages/01-audit/issues-register.md
stages/01-audit/project-register.csv
stages/01-audit/source-audit.md
stages/02-normalization/components.csv
stages/02-normalization/exceptions.csv
stages/02-normalization/normalization-spec.md
stages/02-normalization/normalized-items.csv
stages/02-normalization/projects.csv
stages/02-normalization/validation-report.md
```

### tests/

```
tests/fixtures/stage8-layout-golden.json
tests/fixtures/stage9-live-project-input-v2.json
tests/test_calculation_engine.py
tests/test_human_ux_patch.py
tests/test_layout_configurator.py
tests/test_setup_schema.py
tests/test_sheets_schema.py
tests/test_stage10_clarification.mjs
tests/test_stage10_confirmation.mjs
tests/test_stage10_construction_adapter.mjs
tests/test_stage10_e2e.mjs
tests/test_stage10_evidence_fusion.mjs
tests/test_stage10_input_understanding.mjs
tests/test_stage10_vision.mjs
tests/test_stage6_apps_script.mjs
tests/test_stage7_openrouter_parser.mjs
tests/test_stage8_calculation_kernel.mjs
tests/test_stage8_contract.py
tests/test_stage9_web_app.mjs
```

### tools/

```
tools/check_clasp_preflight.mjs
tools/clasp_checkpoint.mjs
tools/generate_calculation_result_schema.py
tools/generate_human_ux_manifest.py
tools/generate_module_size_rules.py
tools/generate_project_input_schema.py
tools/generate_setup_schema.py
tools/generate_stage8_layout_golden.py
tools/validate_sheets_schema.py
```

### Repository root (11 tracked files in snapshot)

```
.clasp.example.json
.claspignore
.gitignore
AI_FURNITURE_EXECUTION.md
ALPHA_CONSTRUCTION_CORE_CORRECTIVE_REPORT.md
ALPHA_CONSTRUCTION_CORE_DEBUG_REVIEW.md
ALPHA_CONSTRUCTION_CORE_REPORT.md
PROJECT_CONTEXT.md
STAGE_10_LOCAL_E2E_REPORT.md
package-lock.json
package.json
```

Note: `CURRENT_REPOSITORY_STRUCTURE.md` (this audit document) is intentionally excluded from the snapshot so the inventory remains a record of the pre-audit tracked state.

Total tracked files (snapshot): 150.

## 4. Directory summary

| Directory | Tracked file count | Main file types | Short purpose (inferred from paths / file names) |
|---|---|---|---|
| `_tasks/` | 16 | `.md`, `.json` | Spec/contract packs grouped per work-stream (`alpha-construction-core`, `stage-10-input-understanding`, `pre-deployment-sheets-architecture`). Holds accepted schemas and stage definitions. |
| `apps-script/` | 21 | `.gs`, `.html`, `.json` | Google Apps Script runtime (parsers, engines, adapters, web app, generated schema modules). |
| `calculation_model/` | 3 | `.py` | Python calculation kernel imported by stage-8 tests. |
| `Construction_core/` | 4 | `.js`, `.mjs`, `.json` | Construction Core runtime plus its golden generator and one test. |
| `docs/` | 39 | `.md`, `.csv`, `.json` | Per-stage reports, contracts, schemas, and supporting CSVs/evidence. |
| `source-materials/` | 2 | `.zip`, `.csv` | External reference inputs (legacy workbook + comparison CSV). |
| `Stage_10_input_understanding/` | 15 | `.js`, `.json` | Stage 10 input-understanding runtime modules with e2e/vision/mini fixtures. |
| `stages/` | 11 | `.csv`, `.md` | Early pipeline work artifacts (`01-audit`, `02-normalization`) — registers, maps, exceptions. |
| `tests/` | 19 | `.mjs`, `.py`, `.json` | Cross-stage test suite (Node + Python) with two shared fixtures. |
| `tools/` | 9 | `.mjs`, `.py` | Build/checkpoint utilities: schema generators, clasp preflight, golden generator, schema validator. |

## 5. Root files

| File | Extension / type | Likely role |
|---|---|---|
| `.clasp.example.json` | `.json` (dotfile) | clasp configuration template. |
| `.claspignore` | dotfile, no ext | clasp push ignore list. |
| `.gitignore` | dotfile, no ext | Git ignore patterns. |
| `AI_FURNITURE_EXECUTION.md` | `.md` | Top-level execution charter / mission doc. |
| `ALPHA_CONSTRUCTION_CORE_CORRECTIVE_REPORT.md` | `.md` | Report on corrective work for Construction Core alpha. |
| `ALPHA_CONSTRUCTION_CORE_DEBUG_REVIEW.md` | `.md` | Debug review report for Construction Core alpha. |
| `ALPHA_CONSTRUCTION_CORE_REPORT.md` | `.md` | Main Construction Core alpha report. |
| `PROJECT_CONTEXT.md` | `.md` | Top-level project context. |
| `STAGE_10_LOCAL_E2E_REPORT.md` | `.md` | Stage 10 local end-to-end run report. |
| `package-lock.json` | `.json` | npm lockfile (dependency state). |
| `package.json` | `.json` | npm manifest, scripts, devDependencies. |

## 6. Structural observations

Observed strictly from paths and file names. No architectural inference is added beyond what the tree shows.

- Tracked runtime code is split across at least four top-level folders: `apps-script/` (Apps Script `.gs`), `calculation_model/` (Python), `Construction_core/` (Node `.js`/`.mjs`), `Stage_10_input_understanding/` (Node `.js`).
- Stage-numbered docs are concentrated under `docs/stage-N-...` (stage 3 through stage 9, plus a `human-ux-patch` group); there is no `docs/stage-10-*` folder even though Stage 10 runtime code lives at the repo root.
- Accepted schemas live inside `_tasks/` (`_tasks/alpha-construction-core/*.json`, `_tasks/stage-10-input-understanding/*.json`), not in a dedicated `schemas/` folder.
- Stage 10 contracts/specs sit under `_tasks/stage-10-input-understanding/` while Stage 10 runtime code sits under `Stage_10_input_understanding/` — same domain, different casing, different parent.
- Top-level reports (`AI_FURNITURE_EXECUTION.md`, `ALPHA_CONSTRUCTION_CORE_*.md`, `PROJECT_CONTEXT.md`, `STAGE_10_LOCAL_E2E_REPORT.md`) sit directly at the repo root, outside any `docs/` or `reports/` folder.
- Tests live in two locations: `tests/` (cross-stage, including Stage 10) and `Construction_core/tests/` (Construction Core only). Shared JSON fixtures are inside `tests/fixtures/`.
- Fixtures are scattered across at least three folders: `Stage_10_input_understanding/fixtures/{e2e,vision}/`, `tests/fixtures/`, and `Construction_core/generated/`.
- Generated/schema modules are split: `apps-script/generated/` holds Apps Script generated files, `Construction_core/generated/` holds the Stage 8 golden result, while other schema-related generators live under `tools/`.
- Early pipeline artifacts sit under `stages/01-audit/` and `stages/02-normalization/`; downstream stages (3–10) are documented under `docs/stage-*-*` instead of under `stages/`.
- Source/reference materials are isolated under `source-materials/`, including a binary archive (`Medvedev.Works.Calc.zip`) and a comparison CSV.
- No `node_modules/`, `dist/`, `build/`, `out/`, `.clasp.json`, or similar non-tracked-only directories appear in `git ls-files`, so anything of that kind is either gitignored or absent.

## 7. Files requiring semantic review

The following tracked paths cannot be reliably characterized from path/extension alone and warrant a later semantic review.

| Path | Why ambiguous |
|---|---|
| `stages/01-audit/file-inventory.csv` vs `stages/01-audit/source-audit.md` vs `stages/01-audit/project-register.csv` vs `stages/01-audit/issues-register.md` vs `stages/01-audit/data-map.csv` | Five sibling files in `stages/01-audit/` with overlapping "audit/inventory" naming — exact role and overlap cannot be told from names. |
| `stages/02-normalization/normalized-items.csv` vs `stages/02-normalization/components.csv` vs `stages/02-normalization/exceptions.csv` vs `stages/02-normalization/projects.csv` vs `stages/02-normalization/normalization-spec.md` vs `stages/02-normalization/validation-report.md` | Six sibling artifacts in `stages/02-normalization/` — relationship between spec, inputs, outputs, exceptions, and validation report is not derivable from names. |
| `source-materials/Medvedev.Works.Calc.zip` | Binary archive whose contents and intended role (reference? input? legacy?) cannot be determined from the filename. |
| `source-materials/kitchen-module-reference-comparison.csv` | Could be a reference input or a derived comparison; not clear from path. |
| `apps-script/prompts/project_parser_prompt.gs` | Lives under `prompts/` inside Apps Script — relationship to OpenRouter/inference wiring is not visible from path. |
| `apps-script/generated/*` | Five generated files whose canonical sources live under `tools/`; mapping is not derivable from filenames alone. |
| `Construction_core/generated/golden_kitchen_result.json` | Golden artifact whose authoring script is `Construction_core/generate_golden.mjs`; role as fixture vs expected-output needs review. |
| `docs/human-ux-patch/custom-price-schema.json` | Schema placed under a UX-patch docs folder — its authority vs `_tasks/` schemas is unclear from path. |
| `docs/stage-7-openrouter-parser/project-input.schema.json` vs `docs/stage-8-calculation-kernel/calculation-result.schema.json` | Multiple schemas live under per-stage doc folders instead of under `_tasks/`; relative precedence is not deducible from names. |
| `_tasks/pre-deployment-sheets-architecture/TARGET_SHEETS_ARCHITECTURE_V1.md` | Sole file in this `_tasks/` subfolder; whether it is a spec, a target definition, or a migration brief is unclear from path. |
| Root-level `ALPHA_CONSTRUCTION_CORE_REPORT.md` / `_CORRECTIVE_REPORT.md` / `_DEBUG_REVIEW.md` | Three root-level reports about the same subject; whether they supersede each other or cover different aspects is not visible from paths. |
| `AI_FURNITURE_EXECUTION.md` and `PROJECT_CONTEXT.md` at repo root | Top-level narrative docs; their relationship (charter vs context) cannot be determined without reading. |

---

End of snapshot.
