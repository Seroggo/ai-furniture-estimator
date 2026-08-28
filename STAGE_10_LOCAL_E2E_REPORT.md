# Stage 10.7 — Local End-to-End Alpha Report

## Status

STAGE_10_LOCAL_E2E_COMPLETE

## Scope

Собрана локальная вертикаль Stage 10 целиком от пользовательского ввода до запуска
Construction Core. Pipeline только оркестрирует существующие API подэтапов 10.1–10.6
и не дублирует их логику.

Цепочка:

```text
Raw input
→ Vision Evidence
→ Evidence Fusion
→ Draft
→ Clarification
→ Dynamic Brief
→ Confirmation Answers
→ Updated Draft
→ Confirmed Configuration
→ Construction Core
```

## Реализация

- `Stage_10_input_understanding/pipeline.js` — экспортирует `runStage10Pipeline(input)`
  и алиас `RunStage10Pipeline`.
- Оркестрация: `recognizeImage` → слияние vision evidence с входным `Evidence[]` →
  `fuseEvidence` → `clarifyDraft` → `buildDynamicBrief` → `applyConfirmationAnswers`
  (если есть) → повторный `clarifyDraft` → `buildConfirmedConfiguration` →
  `runConstructionFromDraft` (если profile задан).
- Vision evidence, target_path которого не разрешается в существующую ячейку Draft
  (entity/text observations), сохраняется в возвращаемом снапшоте `Evidence`, но
  не передаётся в fusion, чтобы не блокировать pipeline ошибкой UNKNOWN_TARGET_PATH.
- Возвращается структурированный снапшот:
  `{ Ok, Evidence, Draft, Clarification, Brief, Confirmation_result,
     Confirmed_configuration, Construction_result, Issues }`.
- При невозможности сформировать Confirmed Configuration `Ok = false` и
  `Construction_result = null`, но промежуточные результаты доступны.
- Встроенная защита от мутации входа: сравнение `JSON.stringify(input)` до и после.

## API

`RunStage10Pipeline` доступен через основной Stage 10 API в
`Stage_10_input_understanding/index.js`. Существующие exports 10.1–10.6 сохранены.

## Сценарии

### Scenario A — image + dimensions + description

Fixture: `Stage_10_input_understanding/fixtures/e2e/scenario_a_*.json`.

Vision даёт явные width/height/depth; pipeline проходит Evidence → Draft →
минимальная clarification → Confirmed Configuration → Construction Core.

Результат: PASS. Construction Core отработал, канонические секции присутствуют.

### Scenario B — image + description, часть размеров отсутствует

Fixture: `Stage_10_input_understanding/fixtures/e2e/scenario_b_*.json`.

Width = DEFAULT_CANDIDATE (NEEDS_CONFIRMATION), height и depth приходят из vision.

Первый запуск:
- `Ok = false`
- Brief содержит questions/blockers по width (CONFIRMATION_REQUIRED)
- `Construction_result = null`

Результат: PASS.

Второй запуск с `confirmation_answers`:
- width подтверждён (600)
- Draft resolved → Confirmed Configuration → Construction Core

Результат: PASS.

### Scenario C — image only

Fixture: `Stage_10_input_understanding/fixtures/e2e/scenario_c_*.json`.

Только Vision observations, все размеры MISSING.

- Evidence создаётся
- Draft создаётся
- Clarification создаётся
- Brief содержит missing/questions/blockers (width — required MISSING)
- `Construction_result = null`

Результат: PASS (считается корректным результатом).

## Golden regression

Использован существующий fixture `_tasks/alpha-construction-core/GOLDEN_INPUT_KITCHEN_2025-04-01.json`.
Draft формируется детерминированно из confirmed configuration (helper
`draftFromConfirmed`), все dimension cells — KNOWN.

Pipeline → Confirmed Configuration → Construction Core сравнивается с прямым
вызовом `calculateConstructionCore(goldenConfirmed, profile, benchmarkReference)`.

Сравнение:
- Materials — совпадает
- Materials_by_component — совпадает
- Edge — совпадает
- Hardware — совпадает
- Benchmark — совпадает
- Parts — совпадает
- Полный Construction_result — byte-equivalent

Результат: PASS. Vision output под golden totals не подгонялся.

## Custom dimension preservation (733)

End-to-end регрессия: модуль с USER_DIMENSION width = 733.

- Fused Draft width = 733
- Confirmed width = 733
- BOTTOM part Length_mm = 733 − `RULES.dimensions.horizontal_width_reduction_mm`
- Независимое numeric assertion

Результат: PASS.

## Determinism

Один и тот же полный input (Draft, Evidence, Vision fixture, Profile,
Benchmark_reference) прогнан дважды. Результат pipeline byte-equivalent.

Результат: PASS.

## Input immutability

Pipeline не мутирует Draft, Evidence, Vision fixture, Confirmation_answers,
Profile, Benchmark_reference. Проверка через `JSON.stringify` до и после запуска
(включая сценарий с confirmation_answers).

Результат: PASS.

## Тесты

`tests/test_stage10_e2e.mjs` покрывает:

- A. Scenario reaches Construction Core
- B. Scenario B first pass returns brief/blockers and no construction result
- C. Scenario B after answers reaches Construction Core
- D. Scenario C produces structured brief and no construction result
- E. Golden regression matches canonical Construction Core output
- F. Width 733 preserved end-to-end
- G. Determinism
- H. Input immutability
- I. Existing Stage 10.1–10.6 APIs remain compatible
- J. Pipeline result contains all canonical intermediate sections

Результат: 11/11 PASS.

## Test integration

В `package.json` добавлены:
- `test:stage10:e2e` = `node --test tests/test_stage10_e2e.mjs`
- `test:stage10` chain включает e2e suite.

## Validation

| Проверка | Результат |
|---|---|
| `node --check Stage_10_input_understanding/pipeline.js` | PASS |
| `node --test tests/test_stage10_input_understanding.mjs` | PASS |
| `node --test tests/test_stage10_clarification.mjs` | PASS |
| `node --test tests/test_stage10_vision.mjs` | PASS |
| `node --test tests/test_stage10_evidence_fusion.mjs` | PASS |
| `node --test tests/test_stage10_confirmation.mjs` | PASS |
| `node --test tests/test_stage10_construction_adapter.mjs` | PASS |
| `node --test tests/test_stage10_e2e.mjs` | PASS |
| `npm test` | PASS (104 Node + 77 Python) |
| `git diff --check` | PASS |

## Remaining gaps

- Локальный pipeline не поддерживает асинхронные vision providers (возвращается
  issue `PIPELINE_VISION_ASYNC_UNSUPPORTED`). Это намеренно ограничение локального
  alpha; общая интеграция с Web/Apps и деплоем выполняется позднее единым пакетом.
- Vision evidence, не разрешимое в Draft cells (entity/text observations),
  сохраняется в снапшоте `Evidence`, но не влияет на Draft. Это соответствует
  границе Stage 10: распознавание не смешивается с расчётом.