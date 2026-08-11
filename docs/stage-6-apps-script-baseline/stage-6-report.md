# Stage 6 — Report

## Status

```text
PARTIAL — READY_FOR_CLASP_CHECKPOINT
```

Локальная подготовка, remote preflight, первый controlled push и round-trip
verification завершены. Clasp auth и link с существующим bound DEV project
подтверждены. Новый Apps Script project не создавался. Для COMPLETE ожидается
только ручной post-sync `setupSystem()` smoke на DEV workbook.

## Toolchain

```text
Node:          v24.16.0
npm:           11.13.0
@google/clasp: 3.3.0 exact-pinned devDependency
clasp engine:  Node >=20
compatibility: PASS
```

PowerShell execution policy блокирует `npm.ps1`, поэтому документированные
Windows-команды используют `npm.cmd` / `npx.cmd`.

## Local Apps Script baseline

Canonical root подготовлен как `apps-script/`:

```text
apps-script/
├── appsscript.json
├── setup_system.gs
└── generated/
    └── schema_manifest.gs
```

`apps-script/appsscript.json` получен из remote snapshot и сохранён как
canonical baseline.

Generated manifest CURRENT и содержит 11 sheets, 136 columns, 9 relations,
79 enum reference seeds и один accepted blocking calculation rule.

## Remote target / preflight

Target workbook подтверждён по accepted Stage 5 baseline и read-only открытию:

```text
AI Furniture Calculation Base — DEV
spreadsheet_id: 1begIbLngVMshpAmnn142TozbHWgIAD-QBvKX6y8NNvs
```

Clasp OAuth: `loggedIn=true`. User-supplied Script ID существующего bound project
привязан только в ignored `.clasp.json`; suffix target: `...HvYv52`.

До первого push выполнен isolated pull в `.clasp-snapshots/preflight/`.
Canonical local files не перезаписывались. Snapshot содержал:

```text
appsscript.json
setup_system.js
schema_manifest.js
Код.js
```

После нормализации clasp extension/path representation:

```text
appsscript.json                       SAME
setup_system.js → setup_system.gs     SAME
schema_manifest.js
  → generated/schema_manifest.gs     SAME
```

`Код.js` проинспектирован: только стандартный пустой `myFunction()`, business
logic отсутствует. Файл осознанно approved для удаления первым canonical push;
approval хранится только в ignored preflight audit location.

## Manifest reconciliation

```text
remote appsscript.json: ACQUIRED
local appsscript.json:  ADOPTED
reconciliation:         SAME / PASS
```

Manifest baseline:

```text
timeZone:        Asia/Yekaterinburg
runtimeVersion:  V8
exceptionLogging: STACKDRIVER
dependencies:    empty
oauthScopes:      not explicitly set
webapp/executionApi: absent
```

OAuth scopes и deployment config не расширялись.

## Clasp configuration / security

- `.clasp.example.json` фиксирует `rootDir: apps-script` без реального Script ID;
- ignored `.clasp.json` связан с подтверждённым existing bound DEV Script ID;
- `.clasp.json`, `.clasprc.json`, snapshots и credential patterns исключены Git;
- `.claspignore` — deny-all с allowlist только canonical Apps Script files;
- `clasp status --json` на safe example выбирает только файлы внутри
  `apps-script/`;
- `gas:push` всегда запускает strict preflight и не использует `--force`;
- install/test/commit не выполняют remote write.

## First controlled push

```text
PASS
files pushed: 3
appsscript.json
generated/schema_manifest.gs
setup_system.gs
```

Обычный non-interactive `clasp push` дважды вернул `Skipping push`, потому что
clasp 3.3.0 требовал interactive подтверждение manifest overwrite. Remote write
в этих попытках не выполнялся. После инспекции pinned clasp source и повторного
clean preflight использован один обоснованный `clasp push --force`:

- force относился к remote-derived manifest confirmation;
- manifest values совпадали с preflight snapshot;
- scopes/deployments не добавлялись;
- push отправил ровно три reviewed canonical files.

Apps Script API был включён пользователем перед успешной попыткой.

## Round-trip verification

```text
PASS
```

Post-push isolated snapshot:

```text
appsscript.json                    SAME
generated/schema_manifest.js
  → generated/schema_manifest.gs  SAME
setup_system.js
  → setup_system.gs                SAME
unknown remote files:             0
missing remote files:             0
```

Approved default `Код.js` отсутствует remote после push.

## Post-sync setupSystem smoke

```text
NOT RUN — MANUAL CHECKPOINT REQUIRED
```

`clasp run setupSystem` проверен и вернул `Script function not found. Please make
sure script is deployed as API executable.` Новый API Executable/deployment не
создавался. Требуется один ручной `setupSystem()` run в bound editor с проверкой
отсутствия duplicate sheets, data loss и schema drift.

## Tests

Локально до remote checkpoint:

```text
Stage 6 Node checks:        9 / 9 PASS
Stage 5 setup tests:        PASS
Stage 4 schema tests:       PASS
Stage 3 calculation tests:  PASS
Stage 3 layout tests:       PASS
Python regression total:    60 / 60 PASS
schema manifest:            CURRENT
Apps Script syntax:         PASS
push-scope selection:       PASS
py_compile:                 PASS
git diff --check:           PASS
```

`appsscript.json` validation, remote preflight, controlled push и round-trip
PASS. Post-sync smoke ожидает manual checkpoint.

## Developer workflow

Воспроизводимый safe workflow описан в
`docs/stage-6-apps-script-baseline/apps-script-development.md`. Добавлены npm
commands для login/status/open, isolated snapshots, comparisons, tests,
preflight и controlled push.

## Deferred scope

Не начинались OpenRouter parser, Web App, publication runtime,
`CURRENT_REPRICE`, `GOOGLEFINANCE` automation, CI/CD и Stage 7.

## Git

```text
branch: main
baseline: 894cf92
Git push: NO
```

Stage 6 local artifacts должны быть committed и working tree должен быть clean
перед возвратом checkpoint. Remote write разрешён только в следующем checkpoint
после выполнения всех gates.

Local commits:

```text
1622ed4 docs: define stage 6 clasp baseline
a0bb0d0 build: establish safe clasp development workflow
59f0f44 docs: record stage 6 clasp checkpoint
b23be70 build: reconcile bound Apps Script preflight
b571078 chore: mark Git as Apps Script source of truth
post-push checkpoint: current HEAD after commit
```
