import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const canonicalRoot = resolve(repositoryRoot, 'apps-script');
const snapshotsRoot = resolve(repositoryRoot, '.clasp-snapshots');
const expectedFiles = [
  'appsscript.json',
  'calculation_orchestrator.gs',
  'custom_price.gs',
  'decimal_math.gs',
  'generated/calculation_result_schema.gs',
  'generated/human_ux_manifest.gs',
  'generated/module_size_rules.gs',
  'generated/project_input_schema.gs',
  'generated/sheets_v1_manifest.gs',
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
  'sheets_v1_setup.gs',
  'stage9_server.gs',
  'web_app.html',
];

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`${label} is missing or invalid JSON: ${error.message}`);
  }
}

function validateLink() {
  const configPath = resolve(repositoryRoot, '.clasp.json');
  const config = readJson(configPath, '.clasp.json');
  if (!config.scriptId || config.scriptId.includes('PASTE_')) {
    fail('.clasp.json must contain the existing bound DEV Script ID.');
  }
  if (config.rootDir !== 'apps-script') {
    fail('.clasp.json rootDir must be exactly "apps-script".');
  }
  return { config, configPath };
}

function walkFiles(root, current = root) {
  if (!existsSync(current)) return [];
  const result = [];
  for (const name of readdirSync(current)) {
    const path = resolve(current, name);
    if (statSync(path).isDirectory()) result.push(...walkFiles(root, path));
    else if (name !== '.clasp.json') result.push(relative(root, path).replaceAll('\\', '/'));
  }
  return result.sort();
}

function hash(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function normalized(path) {
  return readFileSync(path, 'utf8')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\s+$/u, '') + '\n';
}

function canonicalRemoteFile(file) {
  const normalizedFile = file.replaceAll('\\', '/');
  if (normalizedFile === 'appsscript.json') return 'appsscript.json';
  if (/^(?:.*\/)?calculation_orchestrator\.(?:js|gs)$/.test(normalizedFile)) return 'calculation_orchestrator.gs';
  if (/^(?:.*\/)?custom_price\.(?:js|gs)$/.test(normalizedFile)) return 'custom_price.gs';
  if (/^(?:.*\/)?decimal_math\.(?:js|gs)$/.test(normalizedFile)) return 'decimal_math.gs';
  if (/^(?:.*\/)?layout_runtime\.(?:js|gs)$/.test(normalizedFile)) return 'layout_runtime.gs';
  if (/^(?:.*\/)?master_data_loader\.(?:js|gs)$/.test(normalizedFile)) return 'master_data_loader.gs';
  if (/^(?:.*\/)?setup_system\.(?:js|gs)$/.test(normalizedFile)) return 'setup_system.gs';
  if (/^(?:.*\/)?sheets_v1_setup\.(?:js|gs)$/.test(normalizedFile)) return 'sheets_v1_setup.gs';
  if (/^(?:.*\/)?stage9_server\.(?:js|gs)$/.test(normalizedFile)) return 'stage9_server.gs';
  if (/^(?:.*\/)?web_app\.html$/.test(normalizedFile)) return 'web_app.html';
  if (/^(?:.*\/)?openrouter_client\.(?:js|gs)$/.test(normalizedFile)) return 'openrouter_client.gs';
  if (/^(?:.*\/)?pricebook_resolver\.(?:js|gs)$/.test(normalizedFile)) return 'pricebook_resolver.gs';
  if (/^(?:.*\/)?project_input_adapter\.(?:js|gs)$/.test(normalizedFile)) return 'project_input_adapter.gs';
  if (/^(?:.*\/)?project_parser\.(?:js|gs)$/.test(normalizedFile)) return 'project_parser.gs';
  if (/^(?:.*\/)?quantity_engine\.(?:js|gs)$/.test(normalizedFile)) return 'quantity_engine.gs';
  if (/^(?:.*\/)?recipe_resolver\.(?:js|gs)$/.test(normalizedFile)) return 'recipe_resolver.gs';
  if (/^(?:prompts\/)?project_parser_prompt\.(?:js|gs)$/.test(normalizedFile)) {
    return 'prompts/project_parser_prompt.gs';
  }
  if (/^(?:generated\/)?human_ux_manifest\.(?:js|gs)$/.test(normalizedFile)) {
    return 'generated/human_ux_manifest.gs';
  }
  if (/^(?:generated\/)?sheets_v1_manifest\.(?:js|gs)$/.test(normalizedFile)) {
    return 'generated/sheets_v1_manifest.gs';
  }
  if (/^(?:generated\/)?schema_manifest\.(?:js|gs)$/.test(normalizedFile)) {
    return 'generated/schema_manifest.gs';
  }
  if (/^(?:generated\/)?project_input_schema\.(?:js|gs)$/.test(normalizedFile)) {
    return 'generated/project_input_schema.gs';
  }
  if (/^(?:generated\/)?calculation_result_schema\.(?:js|gs)$/.test(normalizedFile)) {
    return 'generated/calculation_result_schema.gs';
  }
  if (/^(?:generated\/)?module_size_rules\.(?:js|gs)$/.test(normalizedFile)) {
    return 'generated/module_size_rules.gs';
  }
  return null;
}

function snapshot(label) {
  const { config } = validateLink();
  const directory = resolve(snapshotsRoot, label);
  if (!directory.startsWith(snapshotsRoot + '\\') && directory !== snapshotsRoot) {
    fail('Snapshot label resolves outside .clasp-snapshots.');
  }
  if (existsSync(directory) && walkFiles(directory).length) {
    fail(`Snapshot already contains files: ${relative(repositoryRoot, directory)}.`);
  }
  mkdirSync(directory, { recursive: true });
  const snapshotConfig = resolve(directory, '.clasp.json');
  writeFileSync(snapshotConfig, JSON.stringify({ scriptId: config.scriptId, rootDir: '.' }, null, 2) + '\n');

  const claspEntry = resolve(repositoryRoot, 'node_modules', '@google', 'clasp', 'build', 'src', 'index.js');
  const result = spawnSync(process.execPath, [claspEntry, '--project', snapshotConfig, 'pull'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (result.status !== 0) fail(`clasp pull failed for ${label}.`);
  console.log(`SNAPSHOT: ${relative(repositoryRoot, directory)}`);
  console.log(`FILES: ${walkFiles(directory).join(', ') || '(none)'}`);
}

function compare(label) {
  const directory = resolve(snapshotsRoot, label);
  if (!existsSync(directory)) fail(`Snapshot does not exist: ${relative(repositoryRoot, directory)}.`);
  const remoteFiles = walkFiles(directory);
  const localFiles = walkFiles(canonicalRoot);
  const remoteByCanonical = new Map();
  for (const remoteFile of remoteFiles) {
    const canonicalFile = canonicalRemoteFile(remoteFile);
    if (!canonicalFile) continue;
    if (remoteByCanonical.has(canonicalFile)) {
      fail(`Multiple remote files map to ${canonicalFile}.`);
    }
    remoteByCanonical.set(canonicalFile, remoteFile);
  }
  const allFiles = [...new Set([...remoteByCanonical.keys(), ...localFiles])].sort();
  const rows = allFiles.map((file) => {
    const localPath = resolve(canonicalRoot, file);
    const remoteFile = remoteByCanonical.get(file) || null;
    const remotePath = remoteFile ? resolve(directory, remoteFile) : null;
    let status = 'SAME';
    if (!existsSync(localPath)) status = 'REMOTE_ONLY';
    else if (!remotePath || !existsSync(remotePath)) status = 'LOCAL_ONLY';
    else if (normalized(localPath) !== normalized(remotePath)) status = 'DIFFERENT';
    return {
      file,
      remoteFile,
      status,
      localSha256: existsSync(localPath) ? hash(localPath) : null,
      remoteSha256: remotePath && existsSync(remotePath) ? hash(remotePath) : null,
    };
  });
  const audit = {
    snapshot: label,
    comparedAt: new Date().toISOString(),
    expectedFiles,
    localFiles,
    remoteFiles,
    normalizedRemoteFiles: [...remoteByCanonical.keys()].sort(),
    unknownRemoteFiles: remoteFiles.filter((file) => !canonicalRemoteFile(file)),
    missingRemoteFiles: expectedFiles.filter((file) => !remoteByCanonical.has(file)),
    files: rows,
  };
  const auditPath = resolve(snapshotsRoot, `${label}-audit.json`);
  writeFileSync(auditPath, JSON.stringify(audit, null, 2) + '\n');
  for (const row of rows) console.log(`${row.status.padEnd(11)} ${row.file}`);
  console.log(`AUDIT: ${relative(repositoryRoot, auditPath)}`);
  if (audit.unknownRemoteFiles.length) {
    console.log(`UNKNOWN_REMOTE: ${audit.unknownRemoteFiles.join(', ')}`);
  }
}

const [command, label] = process.argv.slice(2);
if (!['snapshot', 'compare'].includes(command) || !label || !/^[A-Za-z0-9_-]+$/.test(label)) {
  fail('Usage: node tools/clasp_checkpoint.mjs <snapshot|compare> <safe-label>');
}
if (command === 'snapshot') snapshot(label);
else compare(label);
