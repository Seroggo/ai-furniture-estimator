import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const expected = ['appsscript.json', 'generated/schema_manifest.gs', 'setup_system.gs'];
const claspEntry = resolve(root, 'node_modules', '@google', 'clasp', 'build', 'src', 'index.js');

function fail(message) {
  console.error(`PREFLIGHT FAIL: ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    ...options,
  });
  if (result.status !== 0) fail(`${command} ${args.join(' ')} failed.\n${result.stdout || ''}${result.stderr || ''}`);
  return result.stdout.trim();
}

function hash(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

const gitState = run('git', ['status', '--porcelain']);
if (gitState) fail('Git working tree must be clean before a remote write.');

const configPath = resolve(root, '.clasp.json');
if (!existsSync(configPath)) fail('Create ignored .clasp.json from .clasp.example.json.');
const config = JSON.parse(readFileSync(configPath, 'utf8'));
if (!config.scriptId || config.scriptId.includes('PASTE_')) fail('Confirm the existing bound DEV Script ID.');
if (config.rootDir !== 'apps-script') fail('rootDir must be exactly apps-script.');

for (const file of expected) {
  if (!existsSync(resolve(root, 'apps-script', file))) fail(`Canonical source is missing ${file}.`);
}
JSON.parse(readFileSync(resolve(root, 'apps-script', 'appsscript.json'), 'utf8'));

run('python', ['tools/generate_setup_schema.py', '--check']);
run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['test'], {
  shell: process.platform === 'win32',
});

const auditPath = resolve(root, '.clasp-snapshots', 'preflight-audit.json');
if (!existsSync(auditPath)) fail('Run gas:snapshot:preflight and gas:compare:preflight first.');
const audit = JSON.parse(readFileSync(auditPath, 'utf8'));
const unknownRemoteFiles = audit.unknownRemoteFiles || [];
if (unknownRemoteFiles.length) {
  const approvalsPath = resolve(root, '.clasp-snapshots', 'preflight-approved-removals.json');
  if (!existsSync(approvalsPath)) {
    fail(`Reconcile unknown remote files: ${unknownRemoteFiles.join(', ')}.`);
  }
  const approvals = JSON.parse(readFileSync(approvalsPath, 'utf8'));
  const approved = [...new Set(approvals.remoteFiles || [])].sort();
  const unknown = [...unknownRemoteFiles].sort();
  if (!approvals.reason || JSON.stringify(approved) !== JSON.stringify(unknown)) {
    fail('Approved remote removals must exactly match unknown remote files and include a reason.');
  }
}
const snapshotConfigPath = resolve(root, '.clasp-snapshots', 'preflight', '.clasp.json');
if (!existsSync(snapshotConfigPath)) fail('Preflight snapshot link config is missing.');
const snapshotConfig = JSON.parse(readFileSync(snapshotConfigPath, 'utf8'));
if (snapshotConfig.scriptId !== config.scriptId) fail('Preflight snapshot belongs to a different Script ID.');
for (const row of audit.files || []) {
  const localPath = resolve(root, 'apps-script', row.file);
  const remotePath = row.remoteFile
    ? resolve(root, '.clasp-snapshots', 'preflight', row.remoteFile)
    : resolve(root, '.clasp-snapshots', 'preflight', row.file);
  const localHash = existsSync(localPath) ? hash(localPath) : null;
  const remoteHash = existsSync(remotePath) ? hash(remotePath) : null;
  if (localHash !== row.localSha256 || remoteHash !== row.remoteSha256) {
    fail('Preflight audit is stale; rerun gas:compare:preflight.');
  }
}

const status = run(process.execPath, [claspEntry, 'status', '--json']);
const statusJson = JSON.parse(status);
const pushed = (statusJson.filesToPush || statusJson).map((entry) =>
  (typeof entry === 'string' ? entry : String(entry.path || entry.name))
    .replaceAll('\\', '/')
    .replace(/^apps-script\//, '')
).sort();
if (JSON.stringify(pushed) !== JSON.stringify(expected)) {
  fail(`clasp status file set differs from whitelist: ${JSON.stringify(pushed)}.`);
}

console.log('PREFLIGHT PASS');
console.log(`TARGET SCRIPT ID SUFFIX: ...${config.scriptId.slice(-6)}`);
console.log(`PUSH FILES: ${pushed.join(', ')}`);
