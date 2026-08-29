# AI Мебельщик — Stage 6
## Apps Script baseline + clasp

## 1. Режим

```text
Управление: NORMAL
Рекомендуемый Codex: GPT-5.6 Sol
Reasoning: Medium
```

Постоянные правила:

```text
AI_FURNITURE_EXECUTION.md
```

Stage 6 работает с внешним изменяемым Apps Script DEV project. Первый remote write через clasp допускается только после строгого preflight.

---

## 2. Цель

Перевести Apps Script development из ручного copy/paste в контролируемый workflow:

```text
Git repository
(source of truth)
        ↕
clasp
        ↕
существующий bound Apps Script DEV project
        ↕
AI Furniture Calculation Base — DEV
```

После Stage 6:

- Apps Script code редактируется локально;
- Git хранит source code и safe manifest;
- clasp синхронизирует только разрешённый Apps Script source;
- remote DEV project соответствует локальному baseline;
- manual remote editing после этого — исключение, а не нормальный workflow.

---

## 3. Обязательный контекст

Изучить:

```text
AI_FURNITURE_EXECUTION.md
PROJECT_CONTEXT.md

docs/stage-5-setup-system/stage-5-context.md
docs/stage-5-setup-system/stage-5-report.md
docs/stage-5-setup-system/stage-5-google-verification.md

docs/stage-4-google-sheets/google-sheets-schema.md
docs/stage-4-google-sheets/sheets-columns.csv
docs/stage-4-google-sheets/sheets-relations.csv

apps-script/setup_system.gs
apps-script/generated/schema_manifest.gs

tools/generate_setup_schema.py
tools/validate_sheets_schema.py

актуальные Stage 5/4/3 tests
```

Если имена test files отличаются — найти фактические, а не создавать дубликаты по имени из этого документа.

Git baseline после Stage 5:

```text
branch: main
HEAD: 894cf92
working tree: clean
push: NO
```

Перед изменениями проверить фактический Git state.

---

## 4. Target

Работать только с существующим DEV workbook и его bound Apps Script project:

```text
AI Furniture Calculation Base — DEV
```

НЕ создавать новый Apps Script project, если существующий bound project доступен.

Для clasp нужен Apps Script **Script ID**, а не Spreadsheet ID.

Если Script ID неизвестен или недоступен автоматически — закончить локальную подготовку и остановиться на точном auth/link checkpoint, запросив у пользователя только Script ID из Apps Script → Project Settings.

Не просить доступ ко всему Google Drive.

---

## 5. Toolchain

Использовать современный `@google/clasp` 3.x.

Предпочтительно:

```text
local devDependency
exact pinned version
package-lock.json
npx clasp ...
```

Не полагаться только на случайно установленный global clasp.

Проверить:

```text
node --version
npm --version
```

Если Node несовместим с выбранным clasp — остановиться с точной инструкцией. Не выполнять разрушительное системное обновление Node без необходимости.

Stage 6 не внедряет CI/CD.

---

## 6. Security / local environment config

Нельзя коммитить:

```text
.clasprc.json
.clasp.json
OAuth refresh/access tokens
service-account credentials
client_secret.json
cookies
другие Google credentials
```

Проверить `.gitignore` и при необходимости расширить.

`.clasp.json` считать environment config и не коммитить.

Допустим safe example без реального Script ID, если полезен:

```text
.clasp.example.json
```

Не просить пользователя присылать содержимое `.clasprc.json` или OAuth tokens.

---

## 7. Local Apps Script root

Использовать существующую папку:

```text
apps-script/
```

как clasp `rootDir`, если фактическая структура не даёт сильной причины иначе.

Минимально ожидается:

```text
apps-script/
├── appsscript.json
├── setup_system.gs
└── generated/
    └── schema_manifest.gs
```

Stage 6 может добавить минимальные technical baseline/helper files только при реальной необходимости.

Business logic Stage 7+ не создавать.

---

## 8. appsscript.json

Не изобретать manifest вслепую.

До первого push получить фактический remote manifest существующего bound project и использовать его как baseline, если он совместим.

Проверить минимум:

```text
timeZone
runtimeVersion
oauthScopes, если явно заданы
exceptionLogging
dependencies/services, если есть
```

Не расширять OAuth scopes без необходимости Stage 6.
Не добавлять Web App deployment config.

---

## 9. Critical preflight before first push

```text
НЕ выполнять первый clasp push,
пока не получен remote snapshot и не выполнено сравнение.
```

До первого push:

1. подготовить/проверить clasp auth;
2. связать local environment config с существующим Script ID;
3. получить remote Apps Script source в отдельную temporary/ignored location;
4. сравнить remote:
   - `setup_system.gs`;
   - `generated/schema_manifest.gs`;
   - `appsscript.json`;
   - любые другие remote source files;
5. убедиться, что remote не содержит неизвестной business logic;
6. сохранить краткий локальный audit результата сравнения.

Нельзя выполнять `clasp pull` поверх canonical local source до сравнения.

Temporary remote snapshot не коммитить, если это только staging.

---

## 10. clasp config and push scope

Environment config должна указывать по смыслу:

```text
scriptId: existing bound DEV Apps Script project
rootDir: apps-script
```

или эквивалентную корректную конфигурацию текущей версии clasp.

Push scope ограничить так, чтобы remote НЕ получал:

- Python;
- docs;
- tests;
- source-materials;
- node_modules;
- Git files;
- credentials;
- любые файлы вне Apps Script source.

Использовать `rootDir` / `.claspignore` безопасно и минимально.

Перед push выполнить доступный в текущем clasp file/status inspection.

---

## 11. Repository as source of truth

После успешного controlled sync policy:

```text
локальный Git repository = canonical Apps Script source
remote Apps Script editor = execution/debug target
```

Manual remote edit после Stage 6:

```text
remote snapshot/pull to safe location
→ diff
→ осознанное принятие локально
→ tests
→ commit
→ push
```

Нельзя автоматически pull поверх local uncommitted work.

---

## 12. Safe first push

Первый push допускается только после preflight comparison.

Перед write:

```text
git status clean
local tests PASS
schema manifest CURRENT
correct Script ID target confirmed
push file set inspected
remote snapshot reviewed
```

Не использовать destructive/force mode автоматически.

Если текущая версия clasp требует/предлагает `--force`, Codex должен объяснить необходимость и безопасность после preflight.

---

## 13. Round-trip verification

После controlled push доказать remote/local equivalence.

Предпочтительно:

```text
remote pull/snapshot to temporary location
→ normalize clasp representation if necessary
→ compare with local canonical source
```

Проверить минимум:

```text
setup_system.gs
generated/schema_manifest.gs
appsscript.json
```

Remote source не должен содержать лишних неизвестных файлов.

---

## 14. Stage 5 regression after sync

После controlled push выполнить smoke на DEV:

```text
setupSystem()
```

Один post-sync run достаточно, поскольку idempotency уже доказана Stage 5.

Ожидается:

```text
PASS
no duplicate sheets
no data loss
no schema drift
```

Если remote execution через clasp требует API Executable/deployment setup — НЕ расширять scope ради `clasp run`.

Допустим ручной `setupSystem()` в bound Apps Script editor как checkpoint.

Не создавать API Executable deployment только ради Stage 6 smoke test.

---

## 15. Development commands

Добавить минимальные воспроизводимые npm commands/scripts по смыслу, например:

```text
gas:status
gas:push
gas:open
test
```

Точные имена определяет Codex.

Не делать automatic remote push при install/test/commit.
Не добавлять pre-commit hooks, меняющие remote state.

---

## 16. Documentation

Создать:

```text
docs/stage-6-apps-script-baseline/apps-script-development.md
```

Документ должен кратко описывать:

- installation/dependencies;
- clasp login;
- где взять Script ID;
- как создать local `.clasp.json`;
- как проверить target;
- безопасный push;
- remote verification;
- действия при manual remote edit;
- что запрещено коммитить;
- восстановление auth на втором компьютере без копирования OAuth tokens.

---

## 17. Local checks

Проверить минимум:

1. clasp dependency/version pinned;
2. `apps-script/appsscript.json` valid;
3. Apps Script root содержит только допустимый deployable source;
4. generated schema manifest CURRENT;
5. `.clasp.json` / `.clasprc.json` / secret patterns исключены из Git;
6. push scope не может отправить весь repository;
7. Apps Script JS syntax PASS;
8. Stage 5 tests PASS;
9. Stage 4 schema tests PASS;
10. Stage 3 regressions PASS;
11. `git diff --check` PASS.

Не строить тяжёлый deployment framework.

---

## 18. User/auth checkpoint

Codex сначала выполняет всю возможную локальную работу.

Если требуется действие пользователя, допустимы только точечные запросы:

```text
1. Enable Apps Script API в Google account settings.
2. Пройти browser OAuth для clasp login.
3. Сообщить Script ID существующего bound Apps Script project.
4. При необходимости вручную запустить post-sync setupSystem smoke.
```

Запрашивать только фактически возникший blocker.

---

## 19. Acceptance criteria

Stage 6 = `COMPLETE`, если:

1. Используется существующий bound DEV Apps Script project.
2. Новый remote project не создан.
3. `@google/clasp` установлен воспроизводимо и version pinned.
4. Node/clasp compatibility проверена.
5. `apps-script/` является явным clasp root.
6. `appsscript.json` получен/сверен с existing remote project.
7. `.clasp.json` и auth credentials не коммитятся.
8. Push scope ограничен Apps Script source.
9. Remote snapshot получен до первого push.
10. Unknown remote source отсутствует либо осознанно reconciled.
11. Первый controlled clasp push успешен.
12. Remote source после push соответствует local canonical source.
13. Generated schema manifest остаётся CURRENT.
14. Stage 5/4/3 tests остаются PASS.
15. Post-sync `setupSystem()` smoke на DEV = PASS.
16. DEV workbook не получил schema/data damage.
17. Git repo зафиксирован как Apps Script source of truth.
18. Development workflow документирован.
19. Secrets отсутствуют в Git.
20. `git diff --check` PASS.
21. `stage-6-report.md` создан.
22. Working tree после итогового commit clean.
23. Git push не выполнялся.
24. Stage 7 не начат.

Если auth/Script ID/manual smoke ожидаются:

```text
PARTIAL — READY_FOR_CLASP_CHECKPOINT
```

а не `COMPLETE`.

---

## 20. Не делать

Не выполнять:

- создание нового Apps Script project без эскалации;
- изменение Stage 4 schema;
- production data population;
- pricebook publication runtime;
- `CURRENT_REPRICE`;
- GOOGLEFINANCE automation;
- OpenRouter parser;
- Web App UI;
- calculation runtime port;
- API Executable deployment только ради `clasp run`;
- CI/CD;
- production deployment;
- Stage 7.

---

## 21. Ожидаемые артефакты

Минимально:

```text
apps-script/appsscript.json
package.json / package-lock.json
safe clasp/gitignore config

docs/stage-6-apps-script-baseline/
├── stage-6-context.md
├── apps-script-development.md
└── stage-6-report.md
```

Дополнительные helper/test files — только при необходимости.

Не коммитить `.clasp.json`.

---

## 22. Report

Создать:

```text
docs/stage-6-apps-script-baseline/stage-6-report.md
```

Минимально:

```markdown
# Stage 6 — Report

## Status
COMPLETE / PARTIAL / BLOCKED

## Toolchain
## Local Apps Script baseline
## Remote target / preflight
## Manifest reconciliation
## Clasp configuration / security
## First controlled push
## Round-trip verification
## Post-sync setupSystem smoke
## Tests
## Developer workflow
## Deferred scope
## Git
```

Не включать OAuth tokens или полный `.clasp.json`.

---

## 23. Git

Перед работой:

```text
git status --short
git branch --show-current
git log -1 --oneline
```

Git push не делать.

Перед remote clasp push отдельно проверить:

```text
git status clean
tests PASS
correct Script ID target
remote snapshot reviewed
```

После Stage 6 остановиться.
Stage 7 не начинать.
