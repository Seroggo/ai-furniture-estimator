# Stage 6 — Report

## Status

```text
COMPLETE
```

Локальная подготовка, remote preflight, первый controlled push и round-trip
verification завершены. Clasp auth и link с существующим bound DEV project
подтверждены. Post-sync `setupSystem()` smoke и read-only workbook verification
PASS. Новый Apps Script project не создавался.

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
PASS
```

`clasp run setupSystem` проверен и вернул `Script function not found. Please make
sure script is deployed as API executable.` Новый API Executable/deployment не
создавался. Пользователь выполнил один ручной run в bound editor:

```text
started:  2026-08-11 17:21:49 +05:00
finished: 2026-08-11 17:22:13 +05:00
exception: none
```

Read-only connector verification после run:

```text
title: AI Furniture Calculation Base — DEV
locale: ru_RU
time zone: Asia/Yekaterinburg
canonical sheets/order: 11 / 11 PASS
frozen header rows: 11 / 11 PASS
exact headers: 136 / 136 PASS
strict validations row 2: 66 / 66 PASS
strict validations row 1000: 66 / 66 PASS
number formats row 2: 136 / 136 PASS
number formats row 1000: 136 / 136 PASS
Schema_Meta rows / unique IDs: 1 / 1
Calculation_Rules rows / unique IDs: 1 / 1
Reference_Values rows / unique IDs: 79 / 79
production/master-data sheets: 0 rows
duplicate sheets / IDs: none
schema drift: none
data loss: none
```

Accepted `SCHEMA_STAGE4_PRICE_PATCH_V1`, `MODULE_TO_PARTS_V1:1` и все 79
generated reference seed IDs точно совпадают с canonical manifest.

## Tests

Финальный локальный прогон:

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

`appsscript.json` validation, remote preflight, controlled push, round-trip и
post-sync smoke PASS.

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

Stage 6 завершён локальными commits. Working tree после финального commit clean.
Git push не выполнялся.

Local commits:

```text
1622ed4 docs: define stage 6 clasp baseline
a0bb0d0 build: establish safe clasp development workflow
59f0f44 docs: record stage 6 clasp checkpoint
b23be70 build: reconcile bound Apps Script preflight
b571078 chore: mark Git as Apps Script source of truth
29b412d docs: record controlled clasp round trip
completion report/context: current HEAD after final commit
```
