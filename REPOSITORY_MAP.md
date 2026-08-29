# Repository Map

Operational reference for canonical paths in the ai-furniture-estimator repository after restructuring to role-based organization.

## Project control

- `AI_FURNITURE_EXECUTION.md` — execution status and charter
- `PROJECT_CONTEXT.md` — project context and overview
- `REPOSITORY_MAP.md` — this file

## Active runtime

- `src/input-understanding/` — Stage 10 input understanding runtime
  - `index.js` — public API
  - `pipeline.js` — local E2E pipeline orchestrator
  - `vision.js` — vision adapter and normalizer
  - `fusion.js` — evidence fusion engine
  - `confirmation.js` — dynamic brief confirmation cycle
  - `construction_adapter.js` — Stage 10 → Construction Core adapter
- `src/construction-core/` — Construction Core calculation engine
  - `index.js` — calculateConstructionCore entry point
- `apps-script/` — Google Apps Script deployment package (Stage 6–9 legacy runtime)

## Contracts

Machine-readable schemas for runtime validation.

- `contracts/input-understanding/`
  - `INPUT_EVIDENCE_V1.schema.json` — evidence items schema
  - `DRAFT_CONFIGURATION_V1.schema.json` — draft configuration schema
- `contracts/construction/`
  - `CONFIRMED_CONFIGURATION_V1.schema.json` — confirmed configuration schema
- `contracts/legacy-apps-script/` — legacy Apps Script schemas (until Stage 11 migration)
  - `project-input.schema.json` — Stage 7 project input schema
  - `calculation-result.schema.json` — Stage 8 calculation result schema
  - `custom-price-schema.json` — Human UX custom price schema

## Config

Runtime configuration files.

- `config/construction/`
  - `ALPHA_CONSTRUCTION_PROFILE_V1.json` — alpha construction profile

## Fixtures

Test fixtures and golden data, organized by domain.

- `fixtures/construction/`
  - `GOLDEN_INPUT_KITCHEN_2025-04-01.json` — golden construction input
  - `BENCHMARK_REFERENCE_BASIS_KITCHEN_V1.json` — benchmark reference
  - `golden_kitchen_result.json` — generated golden result
- `fixtures/e2e/` — Stage 10 end-to-end scenario fixtures
  - `scenario_a_draft.json`, `scenario_a_vision_observation.json`
  - `scenario_b_draft.json`, `scenario_b_vision_observation.json`
  - `scenario_c_draft.json`, `scenario_c_vision_observation.json`
- `fixtures/input-understanding/`
  - `mini_kitchen_draft_733.json` — minimal kitchen draft
  - `vision/kitchen_entities.json` — vision entity fixture
  - `vision/kitchen_with_visible_dimensions.json` — vision with dimensions
- `fixtures/legacy/` — legacy Stage 8–9 fixtures
  - `stage8-layout-golden.json` — Python layout golden
  - `stage9-live-project-input-v2.json` — Stage 9 live regression fixture

## Tests

Test suites organized by domain.

- `tests/construction/` — Construction Core tests
  - `construction_core.test.mjs`
- `tests/input-understanding/` — Stage 10 input understanding tests
  - `test_stage10_input_understanding.mjs`
  - `test_stage10_clarification.mjs`
  - `test_stage10_vision.mjs`
  - `test_stage10_evidence_fusion.mjs`
  - `test_stage10_confirmation.mjs`
  - `test_stage10_construction_adapter.mjs`
- `tests/e2e/` — End-to-end integration tests
  - `test_stage10_e2e.mjs`
- `tests/apps-script/` — Apps Script runtime tests (Stage 6–9)
  - `test_stage6_apps_script.mjs`
  - `test_stage7_openrouter_parser.mjs`
  - `test_stage8_calculation_kernel.mjs`
  - `test_stage9_web_app.mjs`
- `tests/sheets/` — Google Sheets schema tests
  - `test_sheets_schema.py`
  - `test_setup_schema.py`
  - `test_human_ux_patch.py`
- `tests/legacy-calculation/` — Legacy Python calculation model tests
  - `test_calculation_engine.py`
  - `test_layout_configurator.py`
  - `test_stage8_contract.py`

## Current architecture

Active architectural documentation and design decisions.

- `docs/architecture/input-understanding/`
  - `STAGE_10_CONTEXT.md` — Stage 10 architecture and context
- `docs/architecture/sheets/`
  - `TARGET_SHEETS_ARCHITECTURE_V1.md` — target Sheets architecture
- `docs/architecture/repository/`
  - `TARGET_REPOSITORY_STRUCTURE_V1.md` — this repository's target structure (archive of migration spec)

## Reports and reference

Current reports and reference documentation.

- `docs/reports/construction-core/`
  - `ALPHA_CONSTRUCTION_CORE_REPORT.md`
  - `ALPHA_CONSTRUCTION_CORE_CORRECTIVE_REPORT.md`
  - `ALPHA_CONSTRUCTION_CORE_DEBUG_REVIEW.md`
- `docs/reports/input-understanding/`
  - `STAGE_10_LOCAL_E2E_REPORT.md`
- `docs/reference/construction/`
  - `BASIS_GOLDEN_BENCHMARK.md` — basis golden benchmark reference

## Legacy and history

Historical materials and superseded implementations.

- `legacy/calculation_model/` — Stage 3 Python calculation engine (superseded by Construction Core)
  - `__init__.py`
  - `calculation_engine.py`
  - `layout_configurator.py`
- `archive/stages/` — historical stage 1–9 documentation and artifacts
  - `01-audit/`, `02-normalization/`, `human-ux-patch/`
  - `stage-3-calculation-model/`, `stage-4-google-sheets/`
  - `stage-5-setup-system/`, `stage-6-apps-script-baseline/`
  - `stage-7-openrouter-parser/`, `stage-8-calculation-kernel/`, `stage-9-web-app/`
- `archive/tasks/stage-10-input-understanding/` — Stage 10 task specifications
  - `STAGE_10_1_INPUT_EVIDENCE_CONTRACT.md` through `STAGE_10_7_LOCAL_E2E_ALPHA.md`
- `archive/repository/`
  - `CURRENT_REPOSITORY_STRUCTURE.md` — pre-restructure snapshot

## Source materials

External reference inputs and baseline data.

- `source-materials/`
  - `Medvedev.Works.Calc.zip` — legacy workbook archive
  - `kitchen-module-reference-comparison.csv` — market baseline data

## Tools

Build utilities, generators, and validation scripts.

- `tools/generate_calculation_result_schema.py` — Apps Script calculation result schema generator
- `tools/generate_construction_golden.mjs` — Construction Core golden result generator
- `tools/generate_human_ux_manifest.py` — Human UX manifest generator
- `tools/generate_module_size_rules.py` — Module size rules generator
- `tools/generate_project_input_schema.py` — Project input schema generator
- `tools/generate_setup_schema.py` — Setup schema generator
- `tools/generate_stage8_layout_golden.py` — Stage 8 layout golden fixture generator
- `tools/validate_sheets_schema.py` — Sheets schema validator
- `tools/check_clasp_preflight.mjs` — clasp deployment preflight check
- `tools/clasp_checkpoint.mjs` — clasp deployment checkpoint manager

## Canonical entry points

Use these paths in prompts and documentation.

| Purpose | Path |
|---------|------|
| Input understanding public API | `src/input-understanding/index.js` |
| Stage 10 E2E pipeline | `src/input-understanding/pipeline.js` |
| Vision adapter | `src/input-understanding/vision.js` |
| Evidence fusion | `src/input-understanding/fusion.js` |
| Confirmation cycle | `src/input-understanding/confirmation.js` |
| Construction adapter | `src/input-understanding/construction_adapter.js` |
| Construction Core | `src/construction-core/index.js` |
| Construction profile | `config/construction/ALPHA_CONSTRUCTION_PROFILE_V1.json` |
| Evidence schema | `contracts/input-understanding/INPUT_EVIDENCE_V1.schema.json` |
| Draft schema | `contracts/input-understanding/DRAFT_CONFIGURATION_V1.schema.json` |
| Confirmed schema | `contracts/construction/CONFIRMED_CONFIGURATION_V1.schema.json` |
| Golden input | `fixtures/construction/GOLDEN_INPUT_KITCHEN_2025-04-01.json` |
| Benchmark reference | `fixtures/construction/BENCHMARK_REFERENCE_BASIS_KITCHEN_V1.json` |
| Apps Script package | `apps-script/` |
| Source materials | `source-materials/` |
