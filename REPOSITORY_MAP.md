# Repository Map

Operational reference for canonical paths in the ai-furniture-estimator repository after restructuring to role-based organization. This map reflects the tracked tree from `git ls-files`.

## Project control

- `AI_FURNITURE_EXECUTION.md` — execution status and charter
- `PROJECT_CONTEXT.md` — project context and overview
- `REPOSITORY_MAP.md` — this file
- `package.json` — Node.js test and deployment scripts
- `package-lock.json` — locked Node.js dependency versions
- `.clasp.example.json` — safe clasp configuration example
- `.claspignore` — Apps Script deployment whitelist
- `.gitignore` — repository ignore rules

## Active runtime

- `src/input-understanding/` — Stage 10 input understanding runtime
  - `index.js` — public API
  - `pipeline.js` — local E2E pipeline orchestrator
  - `vision.js` — vision adapter and normalizer
  - `fusion.js` — evidence fusion engine
  - `confirmation.js` — dynamic brief confirmation cycle
  - `construction_adapter.js` — Stage 10 → Construction Core adapter
  - `construction_defaults.js` — Construction Defaults resolver
- `src/construction-core/` — Construction Core calculation engine
  - `index.js` — calculateConstructionCore entry point
- `src/costing/` — deterministic costing and BOM runtime
  - `index.js` — price snapshot, costing, and Sheets V1 bundle APIs
- `src/runtime/` — deployment/runtime orchestration
  - `predeployment_pipeline_v1.js` — full pre-deployment E2E pipeline
- `apps-script/` — Google Apps Script deployment package (Stage 6–9 legacy runtime and Sheets V1 adapters)

## Contracts

Machine-readable schemas for runtime validation and Sheets V1 deployment.

- `contracts/input-understanding/`
  - `INPUT_EVIDENCE_V1.schema.json` — evidence items schema
  - `DRAFT_CONFIGURATION_V1.schema.json` — draft configuration schema
- `contracts/construction/`
  - `CONFIRMED_CONFIGURATION_V1.schema.json` — confirmed configuration schema
- `contracts/sheets/`
  - `SHEETS_V1.json` — five-sheet target manifest contract
  - `PRICES_V1.json` — Prices sheet contract
  - `CONSTRUCTION_DEFAULTS_V1.json` — Construction Defaults sheet contract
  - `BOM_LAST_V1.json` — latest BOM sheet contract
  - `CALC_LOG_V1.json` — calculation history sheet contract
  - `SYSTEM_V1.json` — system state sheet contract
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
- `fixtures/e2e/` — Stage 10 and pre-deployment end-to-end fixtures
  - `scenario_a_draft.json`, `scenario_a_vision_observation.json`
  - `scenario_b_draft.json`, `scenario_b_vision_observation.json`
  - `scenario_c_draft.json`, `scenario_c_vision_observation.json`
  - `construction_defaults_v1.json` — deterministic Construction Defaults fixture
  - `prices_v1.json` — deterministic E2E Prices fixture
  - `prices_v1_demo_web.csv` — deployment demo price fixture
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
- `tests/costing/` — deterministic costing tests
  - `test_costing_v1.mjs`
- `tests/input-understanding/` — Stage 10 input understanding tests
  - `test_stage10_input_understanding.mjs`
  - `test_stage10_clarification.mjs`
  - `test_stage10_vision.mjs`
  - `test_stage10_evidence_fusion.mjs`
  - `test_stage10_confirmation.mjs`
  - `test_stage10_construction_adapter.mjs`
- `tests/e2e/` — end-to-end integration tests
  - `test_stage10_e2e.mjs`
  - `test_predeployment_pipeline_v1.mjs`
- `tests/apps-script/` — Apps Script runtime and Sheets adapter tests (Stage 6–9 and Active V1)
  - `test_active_v1_deployment.mjs` — Active V1 deployment and runtime tests
  - `test_stage6_apps_script.mjs`
  - `test_stage7_openrouter_parser.mjs`
  - `test_stage8_calculation_kernel.mjs`
  - `test_stage9_web_app.mjs`
  - `test_sheets_v1_setup.mjs`
  - `test_sheets_v1_result_writer.mjs`
- `tests/sheets/` — Google Sheets schema and generator tests
  - `test_sheets_schema.py`
  - `test_setup_schema.py`
  - `test_human_ux_patch.py`
  - `test_sheets_v1_generator.py`
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
  - `SHEETS_DEPENDENCY_AUDIT.md` — Sheets dependency audit
  - `SHEETS_MIGRATION_DECISIONS_V1.md` — Sheets migration decisions
  - `HIDDEN_CONSTRUCTION_DEFAULTS_V0_1.md` — approved hidden defaults policy
  - `sheet-dependency-map.csv` — Sheets dependency map
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

## Apps Script package

Tracked Google Apps Script runtime files and generated deployment artifacts.

- `apps-script/`
  - `active_v1_server.gs` — Active V1 Web App server boundary
  - `appsscript.json` — Apps Script project manifest
  - `calculation_orchestrator.gs` — calculation orchestration
  - `custom_price.gs` — custom price handling
  - `decimal_math.gs` — decimal arithmetic helpers
  - `layout_runtime.gs` — layout runtime
  - `master_data_loader.gs` — master data loading
  - `openrouter_client.gs` — OpenRouter client with Vision support
  - `pricebook_resolver.gs` — pricebook resolution
  - `project_input_adapter.gs` — project input adapter
  - `project_parser.gs` — project parser
  - `prompts/project_parser_prompt.gs` — parser prompt
  - `quantity_engine.gs` — quantity engine
  - `recipe_resolver.gs` — recipe resolver
  - `setup_system.gs` — system setup
  - `sheets_v1_setup.gs` — Sheets V1 setup and seed adapter
  - `sheets_v1_result_writer.gs` — Sheets V1 result writer
  - `stage9_server.gs` — Stage 9 server
  - `web_app.html` — web application
- `apps-script/generated/`
  - `active_v1_config.gs` — frozen ALPHA_CONSTRUCTION_PROFILE_V1 for Active V1
  - `active_v1_runtime.gs` — bundled Active V1 pipeline runtime
  - `calculation_result_schema.gs`
  - `deployment_seed.gs` — Prices and Construction_Defaults seed
  - `human_ux_manifest.gs`
  - `module_size_rules.gs`
  - `project_input_schema.gs`
  - `schema_manifest.gs`
  - `sheets_v1_manifest.gs`

## Tools

Build utilities, generators, and validation scripts.

- `tools/check_clasp_preflight.mjs` — clasp deployment preflight check
- `tools/clasp_checkpoint.mjs` — clasp deployment checkpoint manager
- `tools/generate_apps_script_runtime.mjs` — Active V1 runtime bundler
- `tools/generate_calculation_result_schema.py` — Apps Script calculation result schema generator
- `tools/generate_construction_golden.mjs` — Construction Core golden result generator
- `tools/generate_deployment_seed.mjs` — Prices and Construction_Defaults seed generator
- `tools/generate_human_ux_manifest.py` — Human UX manifest generator
- `tools/generate_module_size_rules.py` — Module size rules generator
- `tools/generate_project_input_schema.py` — Project input schema generator
- `tools/generate_setup_schema.py` — Setup schema generator
- `tools/generate_sheets_v1_manifest.py` — Sheets V1 manifest generator
- `tools/generate_stage8_layout_golden.py` — Stage 8 layout golden fixture generator
- `tools/validate_sheets_schema.py` — Sheets schema validator

## Canonical entry points

Use these paths in prompts and documentation.

| Purpose | Path |
|---------|------|
| Input understanding public API | `src/input-understanding/index.js` |
| Stage 10 E2E pipeline | `src/input-understanding/pipeline.js` |
| Vision adapter | `src/input-understanding/vision.js` |
| Evidence fusion | `src/input-understanding/fusion.js` |
| Confirmation cycle | `src/input-understanding/confirmation.js` |
| Construction Defaults resolver | `src/input-understanding/construction_defaults.js` |
| Construction adapter | `src/input-understanding/construction_adapter.js` |
| Construction Core | `src/construction-core/index.js` |
| Costing and BOM bundle | `src/costing/index.js` |
| Active V1 pre-deployment pipeline | `src/runtime/predeployment_pipeline_v1.js` |
| Active V1 server boundary | `apps-script/active_v1_server.gs` |
| Active V1 runtime bundle | `apps-script/generated/active_v1_runtime.gs` |
| Construction profile | `config/construction/ALPHA_CONSTRUCTION_PROFILE_V1.json` |
| Evidence schema | `contracts/input-understanding/INPUT_EVIDENCE_V1.schema.json` |
| Draft schema | `contracts/input-understanding/DRAFT_CONFIGURATION_V1.schema.json` |
| Confirmed schema | `contracts/construction/CONFIRMED_CONFIGURATION_V1.schema.json` |
| Sheets V1 contract | `contracts/sheets/SHEETS_V1.json` |
| Prices contract | `contracts/sheets/PRICES_V1.json` |
| Construction Defaults contract | `contracts/sheets/CONSTRUCTION_DEFAULTS_V1.json` |
| Golden input | `fixtures/construction/GOLDEN_INPUT_KITCHEN_2025-04-01.json` |
| Benchmark reference | `fixtures/construction/BENCHMARK_REFERENCE_BASIS_KITCHEN_V1.json` |
| Apps Script package | `apps-script/` |
| Source materials | `source-materials/` |