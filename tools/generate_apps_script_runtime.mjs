import {createHash} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, extname, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = resolve(root, 'src');
const entry = resolve(srcRoot, 'runtime/predeployment_pipeline_v1.js');
const runtimeOut = resolve(root, 'apps-script/generated/active_v1_runtime.gs');
const configOut = resolve(root, 'apps-script/generated/active_v1_config.gs');
const check = process.argv.includes('--check');

const id = (path) => '/' + relative(root, path).replaceAll('\\', '/');
function dependency(from, request) {
  if (!request.startsWith('.')) throw new Error('External dependency: ' + request);
  const raw = resolve(dirname(from), request);
  const path = extname(raw) ? raw : raw + '.js';
  if (!path.startsWith(srcRoot + '\\') || !existsSync(path)) throw new Error('Missing canonical dependency: ' + request);
  return path;
}
function collect(path, modules = new Map()) {
  if (modules.has(path)) return modules;
  const source = readFileSync(path, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  modules.set(path, source);
  for (const match of source.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)) collect(dependency(path, match[1]), modules);
  return modules;
}
function buildRuntime() {
  const modules = [...collect(entry)].sort((a, b) => id(a[0]).localeCompare(id(b[0])));
  const hash = createHash('sha256');
  modules.forEach(([path, source]) => hash.update(id(path)).update('\0').update(source).update('\0'));
  const build = hash.digest('hex');
  const definitions = modules.map(([path, source]) =>
    '  define_(' + JSON.stringify(id(path)) + ', function(module, exports, require) {\n' +
    source.split('\n').map((line) => '    ' + line).join('\n') + '\n  });'
  ).join('\n\n');
  return '/** GENERATED from canonical active V1 require graph. Build: ' + build + ' */\n' +
    "var ACTIVE_V1_RUNTIME_BUILD = '" + build + "';\n" +
    'var ACTIVE_V1_RUNTIME = (function(){\n' +
    '  var factories_ = {}, cache_ = {};\n' +
    '  function define_(id, factory){ factories_[id] = factory; }\n' +
    '  function resolve_(from, request){\n' +
    "    var parts = from.split('/'); parts.pop();\n" +
    "    request.split('/').forEach(function(part){ if (!part || part === '.') return; if (part === '..') parts.pop(); else parts.push(part); });\n" +
    "    var value = parts.join('/'); if (value.slice(-3) !== '.js') value += '.js'; return value.charAt(0) === '/' ? value : '/' + value;\n" +
    '  }\n' +
    '  function require_(id){\n' +
    "    if (cache_[id]) return cache_[id].exports; if (!factories_[id]) throw new Error('Module not bundled: ' + id);\n" +
    '    var module = {exports:{}}; cache_[id] = module; factories_[id](module, module.exports, function(request){ return require_(resolve_(id, request)); }); return module.exports;\n' +
    '  }\n\n' + definitions + "\n\n  return require_('/src/runtime/predeployment_pipeline_v1.js');\n" +
    '})();\nfunction runActiveV1Pipeline(input, options){ return ACTIVE_V1_RUNTIME.runPredeploymentPipelineV1(input, options); }\n';
}
function buildConfig() {
  const path = resolve(root, 'config/construction/ALPHA_CONSTRUCTION_PROFILE_V1.json');
  const value = JSON.stringify(JSON.parse(readFileSync(path, 'utf8')), null, 2);
  const hash = createHash('sha256').update(value).digest('hex');
  return '/** GENERATED from ALPHA_CONSTRUCTION_PROFILE_V1.json. Build: ' + hash + ' */\nvar ACTIVE_V1_PROFILE = Object.freeze(' + value + ');\n';
}
function emit(path, value) {
  if (check) {
    if (!existsSync(path) || readFileSync(path, 'utf8').replace(/\r\n/g, '\n') !== value) {
      console.error('Stale generated artifact: ' + relative(root, path)); process.exitCode = 1;
    }
  } else { writeFileSync(path, value, 'utf8'); console.log('Generated ' + relative(root, path)); }
}
emit(runtimeOut, buildRuntime());
emit(configOut, buildConfig());
