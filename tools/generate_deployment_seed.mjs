import {createHash} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'apps-script/generated/deployment_seed.gs');
const check = process.argv.includes('--check');

function parseCsv(text) {
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { value += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(value); value = ''; }
    else if (char === '\n') { row.push(value.replace(/\r$/, '')); rows.push(row); row = []; value = ''; }
    else value += char;
  }
  if (value.length || row.length) { row.push(value.replace(/\r$/, '')); rows.push(row); }
  if (quoted) throw new Error('Unterminated quoted CSV value.');
  const headers = rows.shift();
  return rows.filter((cells) => cells.some((cell) => cell !== '')).map((cells, rowIndex) => {
    if (cells.length !== headers.length) throw new Error('Invalid CSV row ' + (rowIndex + 2) + '.');
    const record = {};
    headers.forEach((header, column) => {
      let cell = cells[column];
      if (header === 'price') cell = Number(cell);
      if (header === 'active') cell = String(cell).toLowerCase() === 'true';
      record[header] = cell;
    });
    return record;
  });
}

const defaults = JSON.parse(readFileSync(resolve(root, 'fixtures/e2e/construction_defaults_v1.json'), 'utf8'));
const prices = parseCsv(readFileSync(resolve(root, 'fixtures/e2e/prices_v1_demo_web.csv'), 'utf8'));
const serialized = JSON.stringify({Prices: prices, Construction_Defaults: defaults}, null, 2);
const build = createHash('sha256').update(serialized).digest('hex');
const generated = '/** GENERATED deployment seed. Build: ' + build + ' */\n' +
  'var SHEETS_V1_DEPLOYMENT_SEED = Object.freeze(' + serialized + ');\n';

if (check) {
  if (!existsSync(output) || readFileSync(output, 'utf8').replace(/\r\n/g, '\n') !== generated) {
    console.error('Stale generated artifact: ' + relative(root, output));
    process.exit(1);
  }
} else {
  writeFileSync(output, generated, 'utf8');
  console.log('Generated ' + relative(root, output) + ' (' + prices.length + ' prices, ' + defaults.length + ' defaults)');
}
