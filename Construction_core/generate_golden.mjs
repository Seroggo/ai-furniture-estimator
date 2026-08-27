import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import core from './index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const taskRoot = resolve(root, '_tasks/alpha-construction-core');
const input = JSON.parse(await readFile(resolve(taskRoot, 'GOLDEN_INPUT_KITCHEN_2025-04-01.json'), 'utf8'));
const profile = JSON.parse(await readFile(resolve(taskRoot, 'ALPHA_CONSTRUCTION_PROFILE_V1.json'), 'utf8'));
const benchmarkReference = JSON.parse(await readFile(resolve(taskRoot, 'BENCHMARK_REFERENCE_BASIS_KITCHEN_V1.json'), 'utf8'));
const result = core.calculateConstructionCore(input, profile, benchmarkReference);
await mkdir(resolve(root, 'Construction_core/generated'), { recursive: true });
await writeFile(resolve(root, 'Construction_core/generated/golden_kitchen_result.json'), JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log('Generated Construction_core/generated/golden_kitchen_result.json');
