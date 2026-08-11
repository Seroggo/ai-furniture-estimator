# Apps Script development workflow

## Source of truth

После завершения remote checkpoint канонический Apps Script source находится в
Git:

```text
apps-script/
├── appsscript.json
├── setup_system.gs
└── generated/
    └── schema_manifest.gs
```

Remote bound Apps Script project используется только как DEV execution/debug
target. Новый Apps Script project для этого workflow не создаётся.

## Installation

Требуется Node.js 20 или новее. Зависимости устанавливаются из lockfile:

```powershell
npm.cmd ci
npx.cmd clasp --version
```

Проект фиксирует `@google/clasp` exact version в `package.json` и
`package-lock.json`. Global clasp не является частью воспроизводимого workflow.

## Login and existing target

На каждом компьютере выполнять собственный browser OAuth login:

```powershell
npm.cmd run gas:login
```

Не копировать `.clasprc.json`, refresh/access tokens или browser cookies между
компьютерами. Если Apps Script API выключен, включить его для того же Google
account и повторить login.

Script ID брать только у существующего bound project:

```text
AI Furniture Calculation Base — DEV
→ Extensions / Расширения
→ Apps Script
→ Project Settings
→ Script ID
```

Spreadsheet ID `1begIbLngVMshpAmnn142TozbHWgIAD-QBvKX6y8NNvs` не является
Script ID.

Создать локальный environment config из safe example:

```powershell
Copy-Item -LiteralPath .clasp.example.json -Destination .clasp.json
```

Заменить placeholder на Script ID существующего bound DEV project. Итоговый
смысл конфигурации:

```json
{
  "scriptId": "existing-bound-dev-script-id",
  "rootDir": "apps-script"
}
```

`.clasp.json` игнорируется Git и не должен отправляться в сообщения или отчёты.
Проверить target можно по Project Settings и командам:

```powershell
npm.cmd run gas:status
npm.cmd run gas:open
```

Перед write сверить показанный project с bound project именно DEV workbook.

## Mandatory first-push preflight

Никогда не выполнять `clasp pull` поверх `apps-script/` для первичного
сравнения. Remote snapshot получает отдельный ignored root:

```powershell
npm.cmd run gas:snapshot:preflight
npm.cmd run gas:compare:preflight
```

Результаты находятся только в `.clasp-snapshots/` и не коммитятся. Проверить:

- remote file list и отсутствие неизвестной business logic;
- `setup_system.gs`;
- `generated/schema_manifest.gs`;
- фактический remote `appsscript.json`;
- любые remote-only файлы.

`apps-script/appsscript.json` принимается из remote snapshot только после этого
просмотра. Нужно сохранить remote `timeZone`, `runtimeVersion`,
`exceptionLogging`, explicit `oauthScopes` и dependencies/services, если они
есть и совместимы. Не добавлять новые OAuth scopes, Web App или execution API.
После принятия manifest повторно запустить comparison, tests и сделать commit,
чтобы working tree был clean.

Финальные gates:

```powershell
python tools/generate_setup_schema.py --check
npm.cmd test
npm.cmd run gas:status
git status --short
npm.cmd run gas:preflight
```

`gas:preflight` требует clean Git state, CURRENT schema manifest, PASS tests,
реальный `.clasp.json`, preflight audit без unknown remote files и точный push
file set:

```text
apps-script/appsscript.json
apps-script/setup_system.gs
apps-script/generated/schema_manifest.gs
```

`.claspignore` реализован как deny-all + exact allowlist. Python, docs, tests,
`node_modules`, Git metadata, snapshots и credentials не могут попасть в push.

## Controlled push

Только после успешного preflight:

```powershell
npm.cmd run gas:push
```

Команда намеренно не использует `--force`. Не добавлять `--force`
автоматически. Если clasp отказывается обновлять remote manifest, сначала снова
получить snapshot, понять конфликт и отдельно обосновать force-write.

## Round-trip verification

После push получить новый отдельный snapshot:

```powershell
npm.cmd run gas:snapshot:roundtrip
npm.cmd run gas:compare:roundtrip
```

Ожидается `SAME` для трёх canonical files, отсутствие `REMOTE_ONLY`,
`LOCAL_ONLY`, `DIFFERENT` и unknown remote files. Canonical local files при этом
не изменяются.

После equivalence вручную запустить `setupSystem()` один раз в bound Apps Script
editor, если `clasp run` требует API Executable deployment. Не создавать
deployment только ради smoke. Проверить на DEV workbook:

```text
PASS
11 sheets / 136 headers
no duplicate sheets
no data loss
no schema drift
```

## Manual remote edit recovery

Если кто-то изменил remote editor:

```text
remote snapshot в новый ignored label
→ diff с apps-script/
→ осознанно принять нужные изменения локально
→ schema/tests
→ commit
→ clean preflight
→ controlled push
```

Для произвольного безопасного snapshot label:

```powershell
node tools/clasp_checkpoint.mjs snapshot review-YYYYMMDD
node tools/clasp_checkpoint.mjs compare review-YYYYMMDD
```

Не выполнять pull поверх uncommitted local work.

## Secrets and environment files

Никогда не коммитить:

- `.clasp.json` и `.clasprc.json`;
- OAuth access/refresh tokens;
- `client_secret*.json`, credentials или service-account keys;
- cookies/session exports;
- `.clasp-snapshots/`.

На втором компьютере: clone repository, `npm.cmd ci`, новый `clasp login`, новый
локальный `.clasp.json` с тем же проверенным Script ID. OAuth tokens не
переносятся.
