import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appsRoot = resolve(root, 'apps-script');
const claspEntry = resolve(root, 'node_modules', '@google', 'clasp', 'build', 'src', 'index.js');
const allowedSource = new Set([
  'appsscript.json',
  'calculation_orchestrator.gs',
  'custom_price.gs',
  'decimal_math.gs',
  'generated/calculation_result_schema.gs',
  'generated/human_ux_manifest.gs',
  'generated/module_size_rules.gs',
  'generated/project_input_schema.gs',
  'generated/schema_manifest.gs',
  'layout_runtime.gs',
  'master_data_loader.gs',
  'openrouter_client.gs',
  'pricebook_resolver.gs',
  'project_input_adapter.gs',
  'project_parser.gs',
  'prompts/project_parser_prompt.gs',
  'quantity_engine.gs',
  'recipe_resolver.gs',
  'setup_system.gs',
  'web_app.gs',
  'web_app.html',
]);

function walk(current = appsRoot) {
  const files = [];
  for (const name of readdirSync(current)) {
    const path = resolve(current, name);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else files.push(relative(appsRoot, path).replaceAll('\\', '/'));
  }
  return files.sort();
}

function run(command, args, input) {
  if (command === 'git') args = ['-c', `safe.directory=${root.replaceAll('\\', '/')}`, ...args];
  return spawnSync(command, args, { cwd: root, encoding: 'utf8', input });
}

test('clasp is exact-pinned in package and lockfile', () => {
  const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  const lock = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8'));
  assert.equal(packageJson.devDependencies['@google/clasp'], '3.3.0');
  assert.equal(lock.packages['node_modules/@google/clasp'].version, '3.3.0');
  assert.equal(lock.packages[''].devDependencies['@google/clasp'], '3.3.0');
});

test('safe clasp example targets only apps-script root', () => {
  const example = JSON.parse(readFileSync(resolve(root, '.clasp.example.json'), 'utf8'));
  assert.equal(example.rootDir, 'apps-script');
  assert.match(example.scriptId, /^PASTE_EXISTING_BOUND_DEV_SCRIPT_ID_HERE$/);
});

test('clasp ignore is an exact deploy whitelist', () => {
  const rules = readFileSync(resolve(root, '.claspignore'), 'utf8')
    .split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
  assert.deepEqual(rules, [
    '**/**',
    '!appsscript.json',
    '!custom_price.gs',
    '!decimal_math.gs',
    '!project_input_adapter.gs',
    '!master_data_loader.gs',
    '!layout_runtime.gs',
    '!recipe_resolver.gs',
    '!quantity_engine.gs',
    '!pricebook_resolver.gs',
    '!calculation_orchestrator.gs',
    '!setup_system.gs',
    '!web_app.gs',
    '!web_app.html',
    '!openrouter_client.gs',
    '!project_parser.gs',
    '!prompts/project_parser_prompt.gs',
    '!generated/human_ux_manifest.gs',
    '!generated/schema_manifest.gs',
    '!generated/project_input_schema.gs',
    '!generated/calculation_result_schema.gs',
    '!generated/module_size_rules.gs',
  ]);
  for (const file of walk()) assert.ok(allowedSource.has(file), `unexpected deployable source: ${file}`);
});

test('clasp status cannot select files outside the canonical Apps Script root', () => {
  const result = run(process.execPath, [claspEntry, '--project', '.clasp.example.json', 'status', '--json']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const status = JSON.parse(result.stdout);
  const actual = status.filesToPush.map((file) => file.replaceAll('\\', '/').replace(/^apps-script\//, '')).sort();
  const expected = walk().filter((file) => allowedSource.has(file)).sort();
  assert.deepEqual(actual, expected);
  assert.ok(status.filesToPush.every((file) => file.replaceAll('\\', '/').startsWith('apps-script/')));
});

test('secret and snapshot paths are ignored while the safe example is tracked-capable', () => {
  for (const path of ['.clasp.json', '.clasprc.json', '.clasp-snapshots/preflight/appsscript.json', 'client_secret.json', 'credentials.json']) {
    const result = run('git', ['check-ignore', '-q', path]);
    assert.equal(result.status, 0, `${path} must be ignored`);
  }
  assert.notEqual(run('git', ['check-ignore', '-q', '.clasp.example.json']).status, 0);
});

test('all Apps Script gs files pass JavaScript syntax check', () => {
  for (const file of walk().filter((path) => path.endsWith('.gs'))) {
    const result = run('node', ['--check'], readFileSync(resolve(appsRoot, file), 'utf8'));
    assert.equal(result.status, 0, `${file}: ${result.stderr}`);
  }
});

test('remote-derived appsscript manifest is valid when checkpoint has supplied it', () => {
  const path = resolve(appsRoot, 'appsscript.json');
  if (!existsSync(path)) return;
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(typeof manifest.timeZone, 'string');
  assert.ok(manifest.timeZone.length > 0);
  assert.equal(manifest.runtimeVersion, 'V8');
  assert.equal(typeof manifest.exceptionLogging, 'string');
  assert.deepEqual(manifest.oauthScopes, [
    'https://www.googleapis.com/auth/spreadsheets.currentonly',
    'https://www.googleapis.com/auth/script.external_request',
  ]);
  assert.equal('webapp' in manifest, false);
  assert.equal('executionApi' in manifest, false);
});

test('generated schema manifest is current', () => {
  const result = run('python', ['tools/generate_setup_schema.py', '--check']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('generated project input schema is current', () => {
  const result = run('python', ['tools/generate_project_input_schema.py', '--check']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('generated Stage 8 artifacts are current', () => {
  for (const tool of ['generate_calculation_result_schema.py', 'generate_module_size_rules.py', 'generate_stage8_layout_golden.py']) {
    const result = run('python', [`tools/${tool}`, '--check']);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  }
});

test('checkpoint comparison normalizes clasp pull representation and gates remote removals', () => {
  const checkpoint = readFileSync(resolve(root, 'tools/clasp_checkpoint.mjs'), 'utf8');
  const preflight = readFileSync(resolve(root, 'tools/check_clasp_preflight.mjs'), 'utf8');
  assert.match(checkpoint, /schema_manifest\\\.\(\?:js\|gs\)/);
  assert.match(checkpoint, /setup_system\\\.\(\?:js\|gs\)/);
  assert.match(checkpoint, /generated\/schema_manifest\.gs/);
  assert.match(checkpoint, /generated\/calculation_result_schema\.gs/);
  assert.match(checkpoint, /generated\/module_size_rules\.gs/);
  assert.match(checkpoint, /web_app\\\.\(\?:js\|gs\)/);
  assert.match(checkpoint, /web_app\\\.html/);
  assert.match(preflight, /preflight-approved-removals\.json/);
  assert.match(preflight, /must exactly match unknown remote files/);
  assert.match(preflight, /safe\.directory=/);
});
