# TARGET_REPOSITORY_STRUCTURE_V1

## Статус

**APPROVED TARGET FOR RESTRUCTURING — BASED ON CURRENT REPOSITORY AUDIT**

Основание: `CURRENT_REPOSITORY_STRUCTURE.md`, созданный после snapshot из `git ls-files`.

Цель: после одноразовой реструктуризации Штаб должен иметь возможность указывать исполнителю точные canonical paths без повторного repo-wide поиска.

---

## 0. Важное различие: EXISTING / MOVE / CREATE

Этот документ описывает **целевое** состояние, поэтому в нём встречаются пути, которых ещё нет в текущем репозитории.

Исполнитель не должен искать отсутствующие файлы.

Операции разделяются строго:

```text
KEEP   — файл уже существует и остаётся по текущему пути;
MOVE   — файл уже существует и переносится из current_path в target_path;
CREATE — файла сейчас нет; он создаётся как новый артефакт реструктуризации.
```

### Новые файлы, которых нет в current snapshot и которые нужно СОЗДАТЬ

```text
REPOSITORY_MAP.md
```

`REPOSITORY_MAP.md` создаётся только после фактической реструктуризации и фиксирует итоговые canonical paths.

### Файл целевой архитектуры репозитория

```text
TARGET_REPOSITORY_STRUCTURE_V1.md
```

этого файла также не было в current snapshot. Он создаётся Штабом **до** запуска исполнительной реструктуризации, затем Kilo переносит его в:

```text
docs/architecture/repository/TARGET_REPOSITORY_STRUCTURE_V1.md
```

### Файл `TARGET_SHEETS_ARCHITECTURE_V1.md`

Он **уже существует** в current repository snapshot по пути:

```text
_tasks/pre-deployment-sheets-architecture/TARGET_SHEETS_ARCHITECTURE_V1.md
```

Его операция:

```text
MOVE
→ docs/architecture/sheets/TARGET_SHEETS_ARCHITECTURE_V1.md
```

### Новые директории

Такие пути как:

```text
src/
contracts/
config/
fixtures/
archive/
legacy/
docs/architecture/
docs/reports/
docs/reference/
```

могут отсутствовать сейчас. Это **целевые директории**, которые создаются автоматически как часть `git mv` / `mkdir` для существующих файлов. Они не являются файлами, которые нужно искать.

---

## 1. Архитектурный принцип

Репозиторий разделяется по роли файла, а не по номеру исторического этапа:

```text
runtime code        → src/ и apps-script/
machine contracts   → contracts/
runtime config      → config/
fixtures            → fixtures/
tests               → tests/
current docs        → docs/
history             → archive/
legacy runtime      → legacy/
source inputs       → source-materials/
utilities           → tools/
```

`_tasks/` не является постоянным хранилищем принятых contracts, schemas, fixtures или архитектуры. После завершения задачи её принятый результат переносится в canonical directory, а task-spec при необходимости архивируется.

---

## 2. Что остаётся в корне

В корне остаются только project-level entry points и служебные файлы:

```text
AI_FURNITURE_EXECUTION.md
PROJECT_CONTEXT.md
REPOSITORY_MAP.md
package.json
package-lock.json
.clasp.example.json
.claspignore
.gitignore
```

`REPOSITORY_MAP.md` создаётся в ходе реструктуризации и становится единой картой canonical paths для Штаба и агентов.

---

## 3. Особое решение по Apps Script

`apps-script/` **не переносится в `src/`**.

Причина: это отдельный deployment package Google Apps Script / clasp. Его физическая граница уже понятна и полезна.

Реструктуризация репозитория не должна сама по себе менять Apps Script runtime behavior.

Внутренняя логика старого Apps Script (`recipe_resolver`, `pricebook_resolver`, Stage 7–9 и т. п.) будет пересмотрена отдельным этапом после repository cleanup.

---

## 4. Active vs legacy calculation

Новый активный расчётный слой:

```text
src/construction-core/
```

Старый Python calculation model сохраняется для regression/history, но явно маркируется:

```text
legacy/calculation_model/
```

Это позволяет не путать старое recipe/layout ядро с текущим Construction Core.

---

## 5. Current documentation vs history

В `docs/` остаются только действующие архитектурные документы, reference и принятые reports.

Исторические stage 1–9 материалы переходят в:

```text
archive/stages/
```

Stage 10 task-specs переходят в:

```text
archive/tasks/stage-10-input-understanding/
```

Принятый Stage 10 context становится current architecture:

```text
docs/architecture/input-understanding/STAGE_10_CONTEXT.md
```

Целевая Sheets architecture становится:

```text
docs/architecture/sheets/TARGET_SHEETS_ARCHITECTURE_V1.md
```

---

## 6. Contracts

Принятые machine-readable schemas больше не хранятся в `_tasks` или stage-doc folders.

Текущие contracts:

```text
contracts/input-understanding/
contracts/construction/
```

Старые Apps Script schemas, которые могут ещё быть нужны текущему legacy runtime/generators, отделяются явно:

```text
contracts/legacy-apps-script/
```

Это не делает их новой архитектурой; это только даёт им однозначное место до Stage 11 migration.

---

## 7. Fixtures и tests

Fixtures физически отделяются от runtime.

```text
fixtures/construction/
fixtures/input-understanding/
fixtures/e2e/
fixtures/legacy/
```

Tests группируются по домену:

```text
tests/construction/
tests/input-understanding/
tests/e2e/
tests/apps-script/
tests/sheets/
tests/legacy-calculation/
```

После перемещения полный regression suite обязан оставаться green.

---

## 8. Целевая структура

```text
├── .clasp.example.json
├── .claspignore
├── .gitignore
├── AI_FURNITURE_EXECUTION.md
├── PROJECT_CONTEXT.md
├── REPOSITORY_MAP.md
├── apps-script
│   ├── appsscript.json
│   ├── calculation_orchestrator.gs
│   ├── custom_price.gs
│   ├── decimal_math.gs
│   ├── generated
│   │   ├── calculation_result_schema.gs
│   │   ├── human_ux_manifest.gs
│   │   ├── module_size_rules.gs
│   │   ├── project_input_schema.gs
│   │   └── schema_manifest.gs
│   ├── layout_runtime.gs
│   ├── master_data_loader.gs
│   ├── openrouter_client.gs
│   ├── pricebook_resolver.gs
│   ├── project_input_adapter.gs
│   ├── project_parser.gs
│   ├── prompts
│   │   └── project_parser_prompt.gs
│   ├── quantity_engine.gs
│   ├── recipe_resolver.gs
│   ├── setup_system.gs
│   ├── stage9_server.gs
│   └── web_app.html
├── archive
│   ├── repository
│   │   └── CURRENT_REPOSITORY_STRUCTURE.md
│   ├── stages
│   │   ├── 01-audit
│   │   │   ├── data-map.csv
│   │   │   ├── file-inventory.csv
│   │   │   ├── issues-register.md
│   │   │   ├── project-register.csv
│   │   │   └── source-audit.md
│   │   ├── 02-normalization
│   │   │   ├── components.csv
│   │   │   ├── exceptions.csv
│   │   │   ├── normalization-spec.md
│   │   │   ├── normalized-items.csv
│   │   │   ├── projects.csv
│   │   │   └── validation-report.md
│   │   ├── human-ux-patch
│   │   │   ├── calculations-ux-contract.md
│   │   │   ├── human-ux-contract.md
│   │   │   ├── human-ux-patch-report.md
│   │   │   └── offer-ux-contract.md
│   │   ├── stage-3-calculation-model
│   │   │   ├── stage-3.2-report.md
│   │   │   ├── stage-3.3-context.md
│   │   │   ├── stage-3.3-report.md
│   │   │   ├── stage-3.4-context.md
│   │   │   ├── stage-3.4-report.md
│   │   │   ├── studio-module-analysis.md
│   │   │   ├── studio-module-comparison.csv
│   │   │   └── studio-module-visual-evidence.csv
│   │   ├── stage-4-google-sheets
│   │   │   ├── google-sheets-schema.md
│   │   │   ├── sheets-columns.csv
│   │   │   ├── sheets-relations.csv
│   │   │   ├── stage-4-context.md
│   │   │   ├── stage-4-price-patch-context.md
│   │   │   ├── stage-4-price-patch-report.md
│   │   │   └── stage-4-report.md
│   │   ├── stage-5-setup-system
│   │   │   ├── google-run-checklist.md
│   │   │   ├── stage-5-context.md
│   │   │   ├── stage-5-google-verification.md
│   │   │   ├── stage-5-locale-validation-fix-report.md
│   │   │   └── stage-5-report.md
│   │   ├── stage-6-apps-script-baseline
│   │   │   ├── apps-script-development.md
│   │   │   ├── stage-6-context.md
│   │   │   └── stage-6-report.md
│   │   ├── stage-7-openrouter-parser
│   │   │   ├── parser-contract.md
│   │   │   ├── stage-7-context.md
│   │   │   └── stage-7-report.md
│   │   ├── stage-8-calculation-kernel
│   │   │   ├── calculation-contract.md
│   │   │   ├── stage-8-context.md
│   │   │   └── stage-8-report.md
│   │   └── stage-9-web-app
│   │       ├── stage-9-context.md
│   │       ├── stage-9-report.md
│   │       └── web-app-contract.md
│   └── tasks
│       └── stage-10-input-understanding
│           ├── STAGE_10_1_INPUT_EVIDENCE_CONTRACT.md
│           ├── STAGE_10_2_CLARIFICATION_ENGINE.md
│           ├── STAGE_10_3_VISION_RECOGNITION_MVP.md
│           ├── STAGE_10_4_EVIDENCE_FUSION.md
│           ├── STAGE_10_5_DYNAMIC_BRIEF_CONFIRMATION.md
│           ├── STAGE_10_6_CONFIRMED_TO_CONSTRUCTION_CORE.md
│           └── STAGE_10_7_LOCAL_E2E_ALPHA.md
├── config
│   └── construction
│       └── ALPHA_CONSTRUCTION_PROFILE_V1.json
├── contracts
│   ├── construction
│   │   └── CONFIRMED_CONFIGURATION_V1.schema.json
│   ├── input-understanding
│   │   ├── DRAFT_CONFIGURATION_V1.schema.json
│   │   └── INPUT_EVIDENCE_V1.schema.json
│   └── legacy-apps-script
│       ├── calculation-result.schema.json
│       ├── custom-price-schema.json
│       └── project-input.schema.json
├── docs
│   ├── architecture
│   │   ├── input-understanding
│   │   │   └── STAGE_10_CONTEXT.md
│   │   ├── repository
│   │   │   └── TARGET_REPOSITORY_STRUCTURE_V1.md
│   │   └── sheets
│   │       └── TARGET_SHEETS_ARCHITECTURE_V1.md
│   ├── reference
│   │   └── construction
│   │       └── BASIS_GOLDEN_BENCHMARK.md
│   └── reports
│       ├── construction-core
│       │   ├── ALPHA_CONSTRUCTION_CORE_CORRECTIVE_REPORT.md
│       │   ├── ALPHA_CONSTRUCTION_CORE_DEBUG_REVIEW.md
│       │   └── ALPHA_CONSTRUCTION_CORE_REPORT.md
│       └── input-understanding
│           └── STAGE_10_LOCAL_E2E_REPORT.md
├── fixtures
│   ├── construction
│   │   ├── BENCHMARK_REFERENCE_BASIS_KITCHEN_V1.json
│   │   ├── GOLDEN_INPUT_KITCHEN_2025-04-01.json
│   │   └── golden_kitchen_result.json
│   ├── e2e
│   │   ├── scenario_a_draft.json
│   │   ├── scenario_a_vision_observation.json
│   │   ├── scenario_b_draft.json
│   │   ├── scenario_b_vision_observation.json
│   │   ├── scenario_c_draft.json
│   │   └── scenario_c_vision_observation.json
│   ├── input-understanding
│   │   ├── mini_kitchen_draft_733.json
│   │   └── vision
│   │       ├── kitchen_entities.json
│   │       └── kitchen_with_visible_dimensions.json
│   └── legacy
│       ├── stage8-layout-golden.json
│       └── stage9-live-project-input-v2.json
├── legacy
│   └── calculation_model
│       ├── __init__.py
│       ├── calculation_engine.py
│       └── layout_configurator.py
├── package-lock.json
├── package.json
├── source-materials
│   ├── Medvedev.Works.Calc.zip
│   └── kitchen-module-reference-comparison.csv
├── src
│   ├── construction-core
│   │   └── index.js
│   └── input-understanding
│       ├── confirmation.js
│       ├── construction_adapter.js
│       ├── fusion.js
│       ├── index.js
│       ├── pipeline.js
│       └── vision.js
├── tests
│   ├── apps-script
│   │   ├── test_stage6_apps_script.mjs
│   │   ├── test_stage7_openrouter_parser.mjs
│   │   ├── test_stage8_calculation_kernel.mjs
│   │   └── test_stage9_web_app.mjs
│   ├── construction
│   │   └── construction_core.test.mjs
│   ├── e2e
│   │   └── test_stage10_e2e.mjs
│   ├── input-understanding
│   │   ├── test_stage10_clarification.mjs
│   │   ├── test_stage10_confirmation.mjs
│   │   ├── test_stage10_construction_adapter.mjs
│   │   ├── test_stage10_evidence_fusion.mjs
│   │   ├── test_stage10_input_understanding.mjs
│   │   └── test_stage10_vision.mjs
│   ├── legacy-calculation
│   │   ├── test_calculation_engine.py
│   │   ├── test_layout_configurator.py
│   │   └── test_stage8_contract.py
│   └── sheets
│       ├── test_human_ux_patch.py
│       ├── test_setup_schema.py
│       └── test_sheets_schema.py
└── tools
    ├── check_clasp_preflight.mjs
    ├── clasp_checkpoint.mjs
    ├── generate_calculation_result_schema.py
    ├── generate_construction_golden.mjs
    ├── generate_human_ux_manifest.py
    ├── generate_module_size_rules.py
    ├── generate_project_input_schema.py
    ├── generate_setup_schema.py
    ├── generate_stage8_layout_golden.py
    └── validate_sheets_schema.py
```

---

## 9. Canonical paths после реструктуризации

Штаб должен использовать эти пути в будущих промтах.

| Назначение | Canonical path |
|---|---|
| Статус исполнения проекта | `AI_FURNITURE_EXECUTION.md` |
| Контекст проекта | `PROJECT_CONTEXT.md` |
| Карта репозитория | `REPOSITORY_MAP.md` |
| Целевая Sheets architecture | `docs/architecture/sheets/TARGET_SHEETS_ARCHITECTURE_V1.md` |
| Stage 10 architecture/context | `docs/architecture/input-understanding/STAGE_10_CONTEXT.md` |
| Evidence schema | `contracts/input-understanding/INPUT_EVIDENCE_V1.schema.json` |
| Draft schema | `contracts/input-understanding/DRAFT_CONFIGURATION_V1.schema.json` |
| Confirmed Configuration schema | `contracts/construction/CONFIRMED_CONFIGURATION_V1.schema.json` |
| Input-understanding public API | `src/input-understanding/index.js` |
| Stage 10 E2E pipeline | `src/input-understanding/pipeline.js` |
| Vision adapter/normalizer | `src/input-understanding/vision.js` |
| Evidence fusion | `src/input-understanding/fusion.js` |
| Confirmation cycle | `src/input-understanding/confirmation.js` |
| Construction adapter | `src/input-understanding/construction_adapter.js` |
| Construction Core | `src/construction-core/index.js` |
| Construction profile | `config/construction/ALPHA_CONSTRUCTION_PROFILE_V1.json` |
| Golden construction input | `fixtures/construction/GOLDEN_INPUT_KITCHEN_2025-04-01.json` |
| Benchmark reference | `fixtures/construction/BENCHMARK_REFERENCE_BASIS_KITCHEN_V1.json` |
| Apps Script package | `apps-script/` |
| Source materials | `source-materials/` |
| Historical stages | `archive/stages/` |
| Historical task specs | `archive/tasks/` |

---

## 10. REPOSITORY_MAP.md — обязательный результат реструктуризации

После физических перемещений Kilo должен создать в корне `REPOSITORY_MAP.md`.

Он должен быть коротким operational map, а не ещё одним отчётом.

Минимальная структура:

```text
# Repository Map

## Project control
AI_FURNITURE_EXECUTION.md
PROJECT_CONTEXT.md

## Active runtime
src/input-understanding/
src/construction-core/
apps-script/

## Contracts
contracts/input-understanding/
contracts/construction/

## Config
config/construction/

## Fixtures
fixtures/

## Tests
tests/

## Current architecture
docs/architecture/

## Reports/reference
docs/reports/
docs/reference/

## Legacy/history
legacy/
archive/

## Source materials
source-materials/

## Tools
tools/
```

Также в нём должны быть перечислены точные entry-point files из таблицы canonical paths выше.

---

## 10.1. CREATE operations

До физической реструктуризации Штаб должен положить в корень:

```text
TARGET_REPOSITORY_STRUCTURE_V1.md
```

Во время реструктуризации Kilo должен создать новый файл:

```text
REPOSITORY_MAP.md
```

Никаких других новых content-файлов эта реструктуризация не требует. Все остальные target files должны происходить из существующих tracked files через `KEEP` или `MOVE`.

После переноса:

```text
TARGET_REPOSITORY_STRUCTURE_V1.md
→ docs/architecture/repository/TARGET_REPOSITORY_STRUCTURE_V1.md
```

`REPOSITORY_MAP.md` остаётся в корне.

---

## 11. Exact migration map

Ниже приведено целевое место **каждого файла текущего tracked snapshot**, плюс `CURRENT_REPOSITORY_STRUCTURE.md`.

`KEEP` означает, что путь не меняется. `MOVE` означает `git mv` с последующим обновлением ссылок/imports/scripts.

### (root)

| Current path | Action | Target path |
|---|---|---|
| `.clasp.example.json` | KEEP | `.clasp.example.json` |
| `.claspignore` | KEEP | `.claspignore` |
| `.gitignore` | KEEP | `.gitignore` |
| `AI_FURNITURE_EXECUTION.md` | KEEP | `AI_FURNITURE_EXECUTION.md` |
| `ALPHA_CONSTRUCTION_CORE_CORRECTIVE_REPORT.md` | MOVE | `docs/reports/construction-core/ALPHA_CONSTRUCTION_CORE_CORRECTIVE_REPORT.md` |
| `ALPHA_CONSTRUCTION_CORE_DEBUG_REVIEW.md` | MOVE | `docs/reports/construction-core/ALPHA_CONSTRUCTION_CORE_DEBUG_REVIEW.md` |
| `ALPHA_CONSTRUCTION_CORE_REPORT.md` | MOVE | `docs/reports/construction-core/ALPHA_CONSTRUCTION_CORE_REPORT.md` |
| `PROJECT_CONTEXT.md` | KEEP | `PROJECT_CONTEXT.md` |
| `STAGE_10_LOCAL_E2E_REPORT.md` | MOVE | `docs/reports/input-understanding/STAGE_10_LOCAL_E2E_REPORT.md` |
| `package-lock.json` | KEEP | `package-lock.json` |
| `package.json` | KEEP | `package.json` |
| `CURRENT_REPOSITORY_STRUCTURE.md` | MOVE | `archive/repository/CURRENT_REPOSITORY_STRUCTURE.md` |

### _tasks

| Current path | Action | Target path |
|---|---|---|
| `_tasks/alpha-construction-core/ALPHA_CONSTRUCTION_PROFILE_V1.json` | MOVE | `config/construction/ALPHA_CONSTRUCTION_PROFILE_V1.json` |
| `_tasks/alpha-construction-core/BASIS_GOLDEN_BENCHMARK.md` | MOVE | `docs/reference/construction/BASIS_GOLDEN_BENCHMARK.md` |
| `_tasks/alpha-construction-core/BENCHMARK_REFERENCE_BASIS_KITCHEN_V1.json` | MOVE | `fixtures/construction/BENCHMARK_REFERENCE_BASIS_KITCHEN_V1.json` |
| `_tasks/alpha-construction-core/CONFIRMED_CONFIGURATION_V1.schema.json` | MOVE | `contracts/construction/CONFIRMED_CONFIGURATION_V1.schema.json` |
| `_tasks/alpha-construction-core/GOLDEN_INPUT_KITCHEN_2025-04-01.json` | MOVE | `fixtures/construction/GOLDEN_INPUT_KITCHEN_2025-04-01.json` |
| `_tasks/pre-deployment-sheets-architecture/TARGET_SHEETS_ARCHITECTURE_V1.md` | MOVE | `docs/architecture/sheets/TARGET_SHEETS_ARCHITECTURE_V1.md` |
| `_tasks/stage-10-input-understanding/DRAFT_CONFIGURATION_V1.schema.json` | MOVE | `contracts/input-understanding/DRAFT_CONFIGURATION_V1.schema.json` |
| `_tasks/stage-10-input-understanding/INPUT_EVIDENCE_V1.schema.json` | MOVE | `contracts/input-understanding/INPUT_EVIDENCE_V1.schema.json` |
| `_tasks/stage-10-input-understanding/STAGE_10_1_INPUT_EVIDENCE_CONTRACT.md` | MOVE | `archive/tasks/stage-10-input-understanding/STAGE_10_1_INPUT_EVIDENCE_CONTRACT.md` |
| `_tasks/stage-10-input-understanding/STAGE_10_2_CLARIFICATION_ENGINE.md` | MOVE | `archive/tasks/stage-10-input-understanding/STAGE_10_2_CLARIFICATION_ENGINE.md` |
| `_tasks/stage-10-input-understanding/STAGE_10_3_VISION_RECOGNITION_MVP.md` | MOVE | `archive/tasks/stage-10-input-understanding/STAGE_10_3_VISION_RECOGNITION_MVP.md` |
| `_tasks/stage-10-input-understanding/STAGE_10_4_EVIDENCE_FUSION.md` | MOVE | `archive/tasks/stage-10-input-understanding/STAGE_10_4_EVIDENCE_FUSION.md` |
| `_tasks/stage-10-input-understanding/STAGE_10_5_DYNAMIC_BRIEF_CONFIRMATION.md` | MOVE | `archive/tasks/stage-10-input-understanding/STAGE_10_5_DYNAMIC_BRIEF_CONFIRMATION.md` |
| `_tasks/stage-10-input-understanding/STAGE_10_6_CONFIRMED_TO_CONSTRUCTION_CORE.md` | MOVE | `archive/tasks/stage-10-input-understanding/STAGE_10_6_CONFIRMED_TO_CONSTRUCTION_CORE.md` |
| `_tasks/stage-10-input-understanding/STAGE_10_7_LOCAL_E2E_ALPHA.md` | MOVE | `archive/tasks/stage-10-input-understanding/STAGE_10_7_LOCAL_E2E_ALPHA.md` |
| `_tasks/stage-10-input-understanding/STAGE_10_CONTEXT.md` | MOVE | `docs/architecture/input-understanding/STAGE_10_CONTEXT.md` |

### apps-script

| Current path | Action | Target path |
|---|---|---|
| `apps-script/appsscript.json` | KEEP | `apps-script/appsscript.json` |
| `apps-script/calculation_orchestrator.gs` | KEEP | `apps-script/calculation_orchestrator.gs` |
| `apps-script/custom_price.gs` | KEEP | `apps-script/custom_price.gs` |
| `apps-script/decimal_math.gs` | KEEP | `apps-script/decimal_math.gs` |
| `apps-script/generated/calculation_result_schema.gs` | KEEP | `apps-script/generated/calculation_result_schema.gs` |
| `apps-script/generated/human_ux_manifest.gs` | KEEP | `apps-script/generated/human_ux_manifest.gs` |
| `apps-script/generated/module_size_rules.gs` | KEEP | `apps-script/generated/module_size_rules.gs` |
| `apps-script/generated/project_input_schema.gs` | KEEP | `apps-script/generated/project_input_schema.gs` |
| `apps-script/generated/schema_manifest.gs` | KEEP | `apps-script/generated/schema_manifest.gs` |
| `apps-script/layout_runtime.gs` | KEEP | `apps-script/layout_runtime.gs` |
| `apps-script/master_data_loader.gs` | KEEP | `apps-script/master_data_loader.gs` |
| `apps-script/openrouter_client.gs` | KEEP | `apps-script/openrouter_client.gs` |
| `apps-script/pricebook_resolver.gs` | KEEP | `apps-script/pricebook_resolver.gs` |
| `apps-script/project_input_adapter.gs` | KEEP | `apps-script/project_input_adapter.gs` |
| `apps-script/project_parser.gs` | KEEP | `apps-script/project_parser.gs` |
| `apps-script/prompts/project_parser_prompt.gs` | KEEP | `apps-script/prompts/project_parser_prompt.gs` |
| `apps-script/quantity_engine.gs` | KEEP | `apps-script/quantity_engine.gs` |
| `apps-script/recipe_resolver.gs` | KEEP | `apps-script/recipe_resolver.gs` |
| `apps-script/setup_system.gs` | KEEP | `apps-script/setup_system.gs` |
| `apps-script/stage9_server.gs` | KEEP | `apps-script/stage9_server.gs` |
| `apps-script/web_app.html` | KEEP | `apps-script/web_app.html` |

### calculation_model

| Current path | Action | Target path |
|---|---|---|
| `calculation_model/__init__.py` | MOVE | `legacy/calculation_model/__init__.py` |
| `calculation_model/calculation_engine.py` | MOVE | `legacy/calculation_model/calculation_engine.py` |
| `calculation_model/layout_configurator.py` | MOVE | `legacy/calculation_model/layout_configurator.py` |

### Construction_core

| Current path | Action | Target path |
|---|---|---|
| `Construction_core/generate_golden.mjs` | MOVE | `tools/generate_construction_golden.mjs` |
| `Construction_core/generated/golden_kitchen_result.json` | MOVE | `fixtures/construction/golden_kitchen_result.json` |
| `Construction_core/index.js` | MOVE | `src/construction-core/index.js` |
| `Construction_core/tests/construction_core.test.mjs` | MOVE | `tests/construction/construction_core.test.mjs` |

### docs

| Current path | Action | Target path |
|---|---|---|
| `docs/human-ux-patch/calculations-ux-contract.md` | MOVE | `archive/stages/human-ux-patch/calculations-ux-contract.md` |
| `docs/human-ux-patch/custom-price-schema.json` | MOVE | `contracts/legacy-apps-script/custom-price-schema.json` |
| `docs/human-ux-patch/human-ux-contract.md` | MOVE | `archive/stages/human-ux-patch/human-ux-contract.md` |
| `docs/human-ux-patch/human-ux-patch-report.md` | MOVE | `archive/stages/human-ux-patch/human-ux-patch-report.md` |
| `docs/human-ux-patch/offer-ux-contract.md` | MOVE | `archive/stages/human-ux-patch/offer-ux-contract.md` |
| `docs/stage-3-calculation-model/stage-3.2-report.md` | MOVE | `archive/stages/stage-3-calculation-model/stage-3.2-report.md` |
| `docs/stage-3-calculation-model/stage-3.3-context.md` | MOVE | `archive/stages/stage-3-calculation-model/stage-3.3-context.md` |
| `docs/stage-3-calculation-model/stage-3.3-report.md` | MOVE | `archive/stages/stage-3-calculation-model/stage-3.3-report.md` |
| `docs/stage-3-calculation-model/stage-3.4-context.md` | MOVE | `archive/stages/stage-3-calculation-model/stage-3.4-context.md` |
| `docs/stage-3-calculation-model/stage-3.4-report.md` | MOVE | `archive/stages/stage-3-calculation-model/stage-3.4-report.md` |
| `docs/stage-3-calculation-model/studio-module-analysis.md` | MOVE | `archive/stages/stage-3-calculation-model/studio-module-analysis.md` |
| `docs/stage-3-calculation-model/studio-module-comparison.csv` | MOVE | `archive/stages/stage-3-calculation-model/studio-module-comparison.csv` |
| `docs/stage-3-calculation-model/studio-module-visual-evidence.csv` | MOVE | `archive/stages/stage-3-calculation-model/studio-module-visual-evidence.csv` |
| `docs/stage-4-google-sheets/google-sheets-schema.md` | MOVE | `archive/stages/stage-4-google-sheets/google-sheets-schema.md` |
| `docs/stage-4-google-sheets/sheets-columns.csv` | MOVE | `archive/stages/stage-4-google-sheets/sheets-columns.csv` |
| `docs/stage-4-google-sheets/sheets-relations.csv` | MOVE | `archive/stages/stage-4-google-sheets/sheets-relations.csv` |
| `docs/stage-4-google-sheets/stage-4-context.md` | MOVE | `archive/stages/stage-4-google-sheets/stage-4-context.md` |
| `docs/stage-4-google-sheets/stage-4-price-patch-context.md` | MOVE | `archive/stages/stage-4-google-sheets/stage-4-price-patch-context.md` |
| `docs/stage-4-google-sheets/stage-4-price-patch-report.md` | MOVE | `archive/stages/stage-4-google-sheets/stage-4-price-patch-report.md` |
| `docs/stage-4-google-sheets/stage-4-report.md` | MOVE | `archive/stages/stage-4-google-sheets/stage-4-report.md` |
| `docs/stage-5-setup-system/google-run-checklist.md` | MOVE | `archive/stages/stage-5-setup-system/google-run-checklist.md` |
| `docs/stage-5-setup-system/stage-5-context.md` | MOVE | `archive/stages/stage-5-setup-system/stage-5-context.md` |
| `docs/stage-5-setup-system/stage-5-google-verification.md` | MOVE | `archive/stages/stage-5-setup-system/stage-5-google-verification.md` |
| `docs/stage-5-setup-system/stage-5-locale-validation-fix-report.md` | MOVE | `archive/stages/stage-5-setup-system/stage-5-locale-validation-fix-report.md` |
| `docs/stage-5-setup-system/stage-5-report.md` | MOVE | `archive/stages/stage-5-setup-system/stage-5-report.md` |
| `docs/stage-6-apps-script-baseline/apps-script-development.md` | MOVE | `archive/stages/stage-6-apps-script-baseline/apps-script-development.md` |
| `docs/stage-6-apps-script-baseline/stage-6-context.md` | MOVE | `archive/stages/stage-6-apps-script-baseline/stage-6-context.md` |
| `docs/stage-6-apps-script-baseline/stage-6-report.md` | MOVE | `archive/stages/stage-6-apps-script-baseline/stage-6-report.md` |
| `docs/stage-7-openrouter-parser/parser-contract.md` | MOVE | `archive/stages/stage-7-openrouter-parser/parser-contract.md` |
| `docs/stage-7-openrouter-parser/project-input.schema.json` | MOVE | `contracts/legacy-apps-script/project-input.schema.json` |
| `docs/stage-7-openrouter-parser/stage-7-context.md` | MOVE | `archive/stages/stage-7-openrouter-parser/stage-7-context.md` |
| `docs/stage-7-openrouter-parser/stage-7-report.md` | MOVE | `archive/stages/stage-7-openrouter-parser/stage-7-report.md` |
| `docs/stage-8-calculation-kernel/calculation-contract.md` | MOVE | `archive/stages/stage-8-calculation-kernel/calculation-contract.md` |
| `docs/stage-8-calculation-kernel/calculation-result.schema.json` | MOVE | `contracts/legacy-apps-script/calculation-result.schema.json` |
| `docs/stage-8-calculation-kernel/stage-8-context.md` | MOVE | `archive/stages/stage-8-calculation-kernel/stage-8-context.md` |
| `docs/stage-8-calculation-kernel/stage-8-report.md` | MOVE | `archive/stages/stage-8-calculation-kernel/stage-8-report.md` |
| `docs/stage-9-web-app/stage-9-context.md` | MOVE | `archive/stages/stage-9-web-app/stage-9-context.md` |
| `docs/stage-9-web-app/stage-9-report.md` | MOVE | `archive/stages/stage-9-web-app/stage-9-report.md` |
| `docs/stage-9-web-app/web-app-contract.md` | MOVE | `archive/stages/stage-9-web-app/web-app-contract.md` |

### source-materials

| Current path | Action | Target path |
|---|---|---|
| `source-materials/Medvedev.Works.Calc.zip` | KEEP | `source-materials/Medvedev.Works.Calc.zip` |
| `source-materials/kitchen-module-reference-comparison.csv` | KEEP | `source-materials/kitchen-module-reference-comparison.csv` |

### Stage_10_input_understanding

| Current path | Action | Target path |
|---|---|---|
| `Stage_10_input_understanding/confirmation.js` | MOVE | `src/input-understanding/confirmation.js` |
| `Stage_10_input_understanding/construction_adapter.js` | MOVE | `src/input-understanding/construction_adapter.js` |
| `Stage_10_input_understanding/fixtures/e2e/scenario_a_draft.json` | MOVE | `fixtures/e2e/scenario_a_draft.json` |
| `Stage_10_input_understanding/fixtures/e2e/scenario_a_vision_observation.json` | MOVE | `fixtures/e2e/scenario_a_vision_observation.json` |
| `Stage_10_input_understanding/fixtures/e2e/scenario_b_draft.json` | MOVE | `fixtures/e2e/scenario_b_draft.json` |
| `Stage_10_input_understanding/fixtures/e2e/scenario_b_vision_observation.json` | MOVE | `fixtures/e2e/scenario_b_vision_observation.json` |
| `Stage_10_input_understanding/fixtures/e2e/scenario_c_draft.json` | MOVE | `fixtures/e2e/scenario_c_draft.json` |
| `Stage_10_input_understanding/fixtures/e2e/scenario_c_vision_observation.json` | MOVE | `fixtures/e2e/scenario_c_vision_observation.json` |
| `Stage_10_input_understanding/fixtures/mini_kitchen_draft_733.json` | MOVE | `fixtures/input-understanding/mini_kitchen_draft_733.json` |
| `Stage_10_input_understanding/fixtures/vision/Kitchen_entities.json` | MOVE | `fixtures/input-understanding/vision/kitchen_entities.json` |
| `Stage_10_input_understanding/fixtures/vision/Kitchen_with_visible_dimensions.json` | MOVE | `fixtures/input-understanding/vision/kitchen_with_visible_dimensions.json` |
| `Stage_10_input_understanding/fusion.js` | MOVE | `src/input-understanding/fusion.js` |
| `Stage_10_input_understanding/index.js` | MOVE | `src/input-understanding/index.js` |
| `Stage_10_input_understanding/pipeline.js` | MOVE | `src/input-understanding/pipeline.js` |
| `Stage_10_input_understanding/vision.js` | MOVE | `src/input-understanding/vision.js` |

### stages

| Current path | Action | Target path |
|---|---|---|
| `stages/01-audit/data-map.csv` | MOVE | `archive/stages/01-audit/data-map.csv` |
| `stages/01-audit/file-inventory.csv` | MOVE | `archive/stages/01-audit/file-inventory.csv` |
| `stages/01-audit/issues-register.md` | MOVE | `archive/stages/01-audit/issues-register.md` |
| `stages/01-audit/project-register.csv` | MOVE | `archive/stages/01-audit/project-register.csv` |
| `stages/01-audit/source-audit.md` | MOVE | `archive/stages/01-audit/source-audit.md` |
| `stages/02-normalization/components.csv` | MOVE | `archive/stages/02-normalization/components.csv` |
| `stages/02-normalization/exceptions.csv` | MOVE | `archive/stages/02-normalization/exceptions.csv` |
| `stages/02-normalization/normalization-spec.md` | MOVE | `archive/stages/02-normalization/normalization-spec.md` |
| `stages/02-normalization/normalized-items.csv` | MOVE | `archive/stages/02-normalization/normalized-items.csv` |
| `stages/02-normalization/projects.csv` | MOVE | `archive/stages/02-normalization/projects.csv` |
| `stages/02-normalization/validation-report.md` | MOVE | `archive/stages/02-normalization/validation-report.md` |

### tests

| Current path | Action | Target path |
|---|---|---|
| `tests/fixtures/stage8-layout-golden.json` | MOVE | `fixtures/legacy/stage8-layout-golden.json` |
| `tests/fixtures/stage9-live-project-input-v2.json` | MOVE | `fixtures/legacy/stage9-live-project-input-v2.json` |
| `tests/test_calculation_engine.py` | MOVE | `tests/legacy-calculation/test_calculation_engine.py` |
| `tests/test_human_ux_patch.py` | MOVE | `tests/sheets/test_human_ux_patch.py` |
| `tests/test_layout_configurator.py` | MOVE | `tests/legacy-calculation/test_layout_configurator.py` |
| `tests/test_setup_schema.py` | MOVE | `tests/sheets/test_setup_schema.py` |
| `tests/test_sheets_schema.py` | MOVE | `tests/sheets/test_sheets_schema.py` |
| `tests/test_stage10_clarification.mjs` | MOVE | `tests/input-understanding/test_stage10_clarification.mjs` |
| `tests/test_stage10_confirmation.mjs` | MOVE | `tests/input-understanding/test_stage10_confirmation.mjs` |
| `tests/test_stage10_construction_adapter.mjs` | MOVE | `tests/input-understanding/test_stage10_construction_adapter.mjs` |
| `tests/test_stage10_e2e.mjs` | MOVE | `tests/e2e/test_stage10_e2e.mjs` |
| `tests/test_stage10_evidence_fusion.mjs` | MOVE | `tests/input-understanding/test_stage10_evidence_fusion.mjs` |
| `tests/test_stage10_input_understanding.mjs` | MOVE | `tests/input-understanding/test_stage10_input_understanding.mjs` |
| `tests/test_stage10_vision.mjs` | MOVE | `tests/input-understanding/test_stage10_vision.mjs` |
| `tests/test_stage6_apps_script.mjs` | MOVE | `tests/apps-script/test_stage6_apps_script.mjs` |
| `tests/test_stage7_openrouter_parser.mjs` | MOVE | `tests/apps-script/test_stage7_openrouter_parser.mjs` |
| `tests/test_stage8_calculation_kernel.mjs` | MOVE | `tests/apps-script/test_stage8_calculation_kernel.mjs` |
| `tests/test_stage8_contract.py` | MOVE | `tests/legacy-calculation/test_stage8_contract.py` |
| `tests/test_stage9_web_app.mjs` | MOVE | `tests/apps-script/test_stage9_web_app.mjs` |

### tools

| Current path | Action | Target path |
|---|---|---|
| `tools/check_clasp_preflight.mjs` | KEEP | `tools/check_clasp_preflight.mjs` |
| `tools/clasp_checkpoint.mjs` | KEEP | `tools/clasp_checkpoint.mjs` |
| `tools/generate_calculation_result_schema.py` | KEEP | `tools/generate_calculation_result_schema.py` |
| `tools/generate_human_ux_manifest.py` | KEEP | `tools/generate_human_ux_manifest.py` |
| `tools/generate_module_size_rules.py` | KEEP | `tools/generate_module_size_rules.py` |
| `tools/generate_project_input_schema.py` | KEEP | `tools/generate_project_input_schema.py` |
| `tools/generate_setup_schema.py` | KEEP | `tools/generate_setup_schema.py` |
| `tools/generate_stage8_layout_golden.py` | KEEP | `tools/generate_stage8_layout_golden.py` |
| `tools/validate_sheets_schema.py` | KEEP | `tools/validate_sheets_schema.py` |

---

## 12. Lifecycle файла целевой архитектуры

До запуска реструктуризации этот файл можно временно положить в корень:

```text
TARGET_REPOSITORY_STRUCTURE_V1.md
```

В ходе реструктуризации его final canonical path:

```text
docs/architecture/repository/TARGET_REPOSITORY_STRUCTURE_V1.md
```

Текущий audit snapshot:

```text
CURRENT_REPOSITORY_STRUCTURE.md
```

после реструктуризации переносится в:

```text
archive/repository/CURRENT_REPOSITORY_STRUCTURE.md
```

Таким образом после завершения cleanup в корне остаётся только operational `REPOSITORY_MAP.md`, а не оба migration-документа.

---

## 13. Поведение, которое реструктуризация НЕ должна менять

Repository cleanup является behavior-preserving operation.

Нельзя в рамках этого шага менять:

```text
Construction Core formulas
Stage 10 logic
Evidence priority
Clarification rules
Confirmation behavior
costing logic
Apps Script business behavior
Google Sheets physical schema
OpenRouter model/provider behavior
Web UI behavior
```

Разрешены только изменения, необходимые из-за перемещения файлов:

```text
imports / require paths
test paths
package.json scripts
generator input/output paths
documentation links
clasp/preflight path references
```

---

## 14. Migration validation

После всех `git mv` и обновления path references обязательно выполнить:

```text
npm test
git diff --check
git status --short
```

Также проверить:

```text
node --check
```

для перемещённых Node entry points, если это требуется текущими scripts/tests.

Все существующие regression tests должны пройти.

---

## 15. Контроль отсутствия старых путей

Перед commit нужно проверить, что в tracked code/config/scripts не осталось ссылок на старые canonical paths, кроме исторических документов в `archive/`, где старые пути могут упоминаться как история.

Особенно проверить старые prefixes:

```text
Construction_core/
Stage_10_input_understanding/
_tasks/alpha-construction-core/
_tasks/stage-10-input-understanding/
docs/stage-
docs/human-ux-patch/
stages/01-audit/
stages/02-normalization/
calculation_model/
```

Не исправлять исторический текст только ради отсутствия строкового совпадения; исправлять только active references.

---

## 16. Что НЕ создавать

При реструктуризации не создавать дополнительные дублирующие каталоги:

```text
schemas/
current/
new/
stage10/
construction_core_v2/
docs/current/
src/apps-script/
```

Целевая структура этого документа является единственной.

---

## 17. Что делать с `_tasks/`

После promotion текущих принятых материалов `_tasks/` может исчезнуть из tracked tree, если активной задачи в момент cleanup нет.

Для будущих задач разрешён только формат:

```text
_tasks/active/<task-name>/
```

После завершения задачи:

```text
accepted artifacts → canonical folders
task spec/context → archive/tasks/<task-name>/
```

---

## 18. Acceptance criteria

Реструктуризация принята, если:

1. Каждый файл из exact migration map находится в target path.
2. Старые runtime folders `Construction_core/` и `Stage_10_input_understanding/` отсутствуют.
3. Принятые schemas больше не лежат в `_tasks/`.
4. Исторические stage docs отделены в `archive/stages/`.
5. Stage 10 specs отделены в `archive/tasks/`.
6. `apps-script/` сохранён как deployment package.
7. `REPOSITORY_MAP.md` создан в корне.
8. Все active imports/scripts/path references обновлены.
9. Полный `npm test` PASS.
10. `git diff --check` PASS.
11. `git status --short` clean после commit.
12. Никакая предметная логика расчёта не была изменена.

---

## Итог

После cleanup репозиторий должен отвечать на вопрос «где лежит X?» без поиска:

```text
runtime?      → src/ или apps-script/
schema?       → contracts/
config?       → config/
fixture?      → fixtures/
test?         → tests/
current docs? → docs/
history?      → archive/
legacy code?  → legacy/
source input? → source-materials/
tool?         → tools/
```

Для каждой новой исполнительной задачи Штаб должен давать агенту точный список canonical paths из `REPOSITORY_MAP.md`, а repo-wide обзор должен стать исключением.
