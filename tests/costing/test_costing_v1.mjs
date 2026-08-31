import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import CostingV1 from '../../src/costing/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const contractsRoot = resolve(root, 'contracts', 'sheets');
const goldenResultPath = resolve(root, 'fixtures/construction/golden_kitchen_result.json');

const pricesContract = JSON.parse(readFileSync(resolve(contractsRoot, 'PRICES_V1.json'), 'utf8'));
const bomLastContract = JSON.parse(readFileSync(resolve(contractsRoot, 'BOM_LAST_V1.json'), 'utf8'));
const calcLogContract = JSON.parse(readFileSync(resolve(contractsRoot, 'CALC_LOG_V1.json'), 'utf8'));
const systemContract = JSON.parse(readFileSync(resolve(contractsRoot, 'SYSTEM_V1.json'), 'utf8'));

const goldenResult = JSON.parse(readFileSync(goldenResultPath, 'utf8'));

function makeTestPriceRows() {
  return [
    {
      category: 'MATERIALS',
      name: 'LDSP 16mm White Alpha',
      unit: 'm2',
      price: 650,
      currency: 'RUB',
      vendor: 'Egger',
      article: 'LDSP_16_ALPHA',
      active: true,
      notes: 'Standard white carcass board',
      updated_at: '2026-08-31T00:00:00.000Z',
      item_id: 'MAT_LDSP_16_ALPHA'
    },
    {
      category: 'MATERIALS',
      name: 'LHDF 3mm White Alpha',
      unit: 'm2',
      price: 220,
      currency: 'RUB',
      vendor: 'Kronospan',
      article: 'LHDF_3_ALPHA',
      active: true,
      notes: 'Back panel material',
      updated_at: '2026-08-31T00:00:00.000Z',
      item_id: 'MAT_LHDF_3_ALPHA'
    },
    {
      category: 'EDGE',
      name: 'Edge 19x1mm White Alpha',
      unit: 'm',
      price: 45,
      currency: 'RUB',
      vendor: 'Rehau',
      article: 'EDGE_19x1_ALPHA',
      active: true,
      notes: 'Carcass front edge',
      updated_at: '2026-08-31T00:00:00.000Z',
      item_id: 'EDGE_19x1_ALPHA'
    },
    {
      category: 'HARDWARE',
      name: 'Standard Clip-on Hinge',
      unit: 'pcs',
      price: 180,
      currency: 'RUB',
      vendor: 'Blum',
      article: 'HINGES',
      active: true,
      notes: '',
      updated_at: '2026-08-31T00:00:00.000Z',
      item_id: 'HW_HINGES'
    },
    {
      category: 'HARDWARE',
      name: 'Hinge Mounting Plate',
      unit: 'pcs',
      price: 40,
      currency: 'RUB',
      vendor: 'Blum',
      article: 'MOUNTING_PLATES',
      active: true,
      notes: '',
      updated_at: '2026-08-31T00:00:00.000Z',
      item_id: 'HW_MOUNTING_PLATES'
    },
    {
      category: 'HARDWARE',
      name: 'Adjustable Leg 100mm',
      unit: 'pcs',
      price: 35,
      currency: 'RUB',
      vendor: 'Volpato',
      article: 'LEGS',
      active: true,
      notes: '',
      updated_at: '2026-08-31T00:00:00.000Z',
      item_id: 'HW_LEGS'
    },
    {
      category: 'HARDWARE',
      name: 'Plinth Clip',
      unit: 'pcs',
      price: 15,
      currency: 'RUB',
      vendor: 'Volpato',
      article: 'PLINTH_CLIPS',
      active: true,
      notes: '',
      updated_at: '2026-08-31T00:00:00.000Z',
      item_id: 'HW_PLINTH_CLIPS'
    },
    {
      category: 'HARDWARE',
      name: 'Wooden Dowel 8x30',
      unit: 'pcs',
      price: 2.5,
      currency: 'RUB',
      vendor: 'Generic',
      article: 'DOWELS_8x30',
      active: true,
      notes: '',
      updated_at: '2026-08-31T00:00:00.000Z',
      item_id: 'HW_DOWELS_8x30'
    },
    {
      category: 'HARDWARE',
      name: 'Confirmat Screw 7x50',
      unit: 'pcs',
      price: 3.0,
      currency: 'RUB',
      vendor: 'Generic',
      article: 'CONFIRMATS_7x50',
      active: true,
      notes: '',
      updated_at: '2026-08-31T00:00:00.000Z',
      item_id: 'HW_CONFIRMATS_7x50'
    },
    {
      category: 'HARDWARE',
      name: 'Drawer Mechanism Tandembox',
      unit: 'sets',
      price: 2500,
      currency: 'RUB',
      vendor: 'Blum',
      article: 'DRAWER_MECHANISMS',
      active: false, // Inactive test item
      notes: 'Disabled test row',
      updated_at: '2026-08-31T00:00:00.000Z',
      item_id: 'HW_DRAWER_MECHANISMS'
    }
  ];
}

test('buildPriceSnapshot includes only active price rows', () => {
  const rows = makeTestPriceRows();
  const snapshot = CostingV1.buildPriceSnapshot(rows, { created_at: '2026-08-31T12:00:00.000Z' });

  assert.equal(snapshot.items.length, 9);
  assert.ok(snapshot.items.every((it) => it.active === true));
  assert.equal(snapshot.items.some((it) => it.item_id === 'HW_DRAWER_MECHANISMS'), false);
});

test('buildPriceSnapshot does not mutate input and produces an immutable snapshot', () => {
  const rows = makeTestPriceRows();
  const originalJson = JSON.stringify(rows);
  const snapshot = CostingV1.buildPriceSnapshot(rows, { created_at: '2026-08-31T12:00:00.000Z' });

  assert.equal(JSON.stringify(rows), originalJson);
  assert.ok(Object.isFrozen(snapshot));
  assert.ok(Object.isFrozen(snapshot.items));
  assert.ok(Object.isFrozen(snapshot.items[0]));
  assert.throws(() => { snapshot.created_at = 'mutated'; });
  assert.throws(() => { snapshot.items[0].price = 9999; });
});

test('buildPriceSnapshot applies same-currency fx = 1', () => {
  const rows = makeTestPriceRows();
  const snapshot = CostingV1.buildPriceSnapshot(rows, {
    TargetCurrency: 'RUB',
    created_at: '2026-08-31T12:00:00.000Z'
  });

  for (const it of snapshot.items) {
    assert.equal(it.fx_rate_used, 1.0);
    assert.equal(it.converted_price, it.price);
  }
});

test('buildPriceSnapshot converts foreign currency with supplied rate', () => {
  const rows = [
    {
      category: 'HARDWARE',
      name: 'European Hinge',
      unit: 'pcs',
      price: 2.0,
      currency: 'EUR',
      article: 'HINGES_EUR',
      active: true,
      item_id: 'HW_HINGES_EUR'
    }
  ];
  const snapshot = CostingV1.buildPriceSnapshot(rows, {
    TargetCurrency: 'RUB',
    FxRates: { 'EUR/RUB': 100.0 },
    created_at: '2026-08-31T12:00:00.000Z'
  });

  assert.equal(snapshot.items[0].fx_rate_used, 100.0);
  assert.equal(snapshot.items[0].converted_price, 200.0);
});

test('buildPriceSnapshot throws Error when required FX rate is missing', () => {
  const rows = [
    {
      category: 'HARDWARE',
      name: 'Dollar Hinge',
      unit: 'pcs',
      price: 5.0,
      currency: 'USD',
      article: 'HINGES_USD',
      active: true,
      item_id: 'HW_HINGES_USD'
    }
  ];
  assert.throws(() => {
    CostingV1.buildPriceSnapshot(rows, {
      TargetCurrency: 'RUB',
      FxRates: { 'EUR/RUB': 100.0 }
    });
  }, /Missing FX rate for USD\/RUB/);
});

test('calculateCosting matches price items deterministically by id and article', () => {
  const rows = makeTestPriceRows();
  const snapshot = CostingV1.buildPriceSnapshot(rows, {
    TargetCurrency: 'RUB',
    created_at: '2026-08-31T12:00:00.000Z'
  });
  const costing = CostingV1.calculateCosting(goldenResult, snapshot);

  assert.ok(costing.Priced_lines.length > 0);
  const ldspLine = costing.Priced_lines.find((l) => l.Material_code === 'LDSP_16_ALPHA');
  assert.ok(ldspLine);
  assert.equal(ldspLine.Section, 'MATERIALS');
  assert.equal(ldspLine.Unit_price, 650);
  assert.equal(ldspLine.Quantity, 17.40464);
  assert.equal(ldspLine.Total, Math.round(17.40464 * 650 * 100) / 100);
});

test('calculateCosting marks items without price or quantity as UNRESOLVED_PRICE', () => {
  const rows = makeTestPriceRows();
  const snapshot = CostingV1.buildPriceSnapshot(rows, {
    TargetCurrency: 'RUB',
    created_at: '2026-08-31T12:00:00.000Z'
  });
  const costing = CostingV1.calculateCosting(goldenResult, snapshot);

  // In goldenResult, DRAWER_MECHANISMS has quantity: null
  assert.equal(costing.Status, 'PARTIAL');
  assert.ok(costing.Unresolved_lines.length > 0);
  const drawerGap = costing.Unresolved_lines.find((l) => l.Item_name === 'DRAWER_MECHANISMS');
  assert.ok(drawerGap);
  assert.equal(drawerGap.Status, 'UNRESOLVED_PRICE');
  assert.equal(drawerGap.Reason, 'QUANTITY_NULL');
});

test('calculateCosting returns COMPLETE when all positions are priced', () => {
  const fullConstruction = {
    Materials: [{ material_code: 'LDSP_16_ALPHA', area_m2: 10.0 }],
    Edge: [{ material_code: 'EDGE_19x1_ALPHA', length_m: 20.0 }],
    Hardware: [{ item: 'HINGES', quantity: 4, unit: 'pcs' }]
  };
  const snapshot = CostingV1.buildPriceSnapshot(makeTestPriceRows(), {
    TargetCurrency: 'RUB',
    created_at: '2026-08-31T12:00:00.000Z'
  });
  const costing = CostingV1.calculateCosting(fullConstruction, snapshot);

  assert.equal(costing.Status, 'COMPLETE');
  assert.equal(costing.Unresolved_lines.length, 0);
  assert.equal(costing.Totals.Material_total, 6500); // 10 * 650
  assert.equal(costing.Totals.Edge_total, 900); // 20 * 45
  assert.equal(costing.Totals.Hardware_total, 720); // 4 * 180
  assert.equal(costing.Totals.Work_total, 0);
  assert.equal(costing.Totals.Grand_total, 6500 + 900 + 720);
});

test('calculateCosting Grand_total equals sum of sections', () => {
  const snapshot = CostingV1.buildPriceSnapshot(makeTestPriceRows(), {
    TargetCurrency: 'RUB',
    created_at: '2026-08-31T12:00:00.000Z'
  });
  const costing = CostingV1.calculateCosting(goldenResult, snapshot);

  const sumSections = Math.round(
    (costing.Totals.Material_total +
      costing.Totals.Edge_total +
      costing.Totals.Hardware_total +
      costing.Totals.Work_total) * 100
  ) / 100;
  assert.equal(costing.Totals.Grand_total, sumSections);
});

test('calculateCosting is deterministic: same input -> same output', () => {
  const snapshot = CostingV1.buildPriceSnapshot(makeTestPriceRows(), {
    TargetCurrency: 'RUB',
    created_at: '2026-08-31T12:00:00.000Z'
  });
  const run1 = CostingV1.calculateCosting(goldenResult, snapshot);
  const run2 = CostingV1.calculateCosting(goldenResult, snapshot);

  assert.deepEqual(run1, run2);
});

test('calculateCosting processes golden Construction Core result without mutation', () => {
  const snapshot = CostingV1.buildPriceSnapshot(makeTestPriceRows(), {
    TargetCurrency: 'RUB',
    created_at: '2026-08-31T12:00:00.000Z'
  });
  const beforeJson = JSON.stringify(goldenResult);
  const costing = CostingV1.calculateCosting(goldenResult, snapshot);

  assert.equal(JSON.stringify(goldenResult), beforeJson);
  assert.ok(costing);
});

test('buildSheetsV1Bundle produces BOM_LAST rows conforming to contract', () => {
  const snapshot = CostingV1.buildPriceSnapshot(makeTestPriceRows(), {
    TargetCurrency: 'RUB',
    created_at: '2026-08-31T12:00:00.000Z'
  });
  const costing = CostingV1.calculateCosting(goldenResult, snapshot);
  const context = {
    calculation_id: 'CALC_GOLDEN_001',
    timestamp: '2026-08-31T12:00:00.000Z',
    project_name: 'Golden Kitchen',
    manager: 'Lead Estimator',
    vision_model: 'gpt-4o-2024-08-06'
  };
  const bundle = CostingV1.buildSheetsV1Bundle(context, costing, snapshot);

  assert.ok(Array.isArray(bundle.BOM_LAST));
  assert.ok(bundle.BOM_LAST.length > 0);

  const bomColumns = bomLastContract.columns.map((c) => c.name);
  const allowedSections = bomLastContract.sections;

  for (const row of bundle.BOM_LAST) {
    assert.ok(allowedSections.includes(row.section), `invalid section: ${row.section}`);
    assert.equal(typeof row.item_name, 'string');
    assert.equal(typeof row.quantity, 'number');
    assert.equal(typeof row.unit_price, 'number');
    assert.equal(typeof row.total, 'number');
    assert.equal(row.calculation_id, 'CALC_GOLDEN_001');

    for (const colName of bomColumns) {
      assert.ok(colName in row, `missing column ${colName} in BOM row`);
    }
  }

  // Ensure TOTALS rows exist
  const totalsSectionRows = bundle.BOM_LAST.filter((r) => r.section === 'TOTALS');
  assert.ok(totalsSectionRows.length >= 4);
  assert.ok(totalsSectionRows.some((r) => r.item_id === 'TOTAL_MATERIALS'));
  assert.ok(totalsSectionRows.some((r) => r.item_id === 'TOTAL_HARDWARE'));
  assert.ok(totalsSectionRows.some((r) => r.item_id === 'TOTAL_WORKS'));
  assert.ok(totalsSectionRows.some((r) => r.item_id === 'TOTAL_GRAND'));
});

test('buildSheetsV1Bundle produces CALC_LOG row conforming to contract', () => {
  const snapshot = CostingV1.buildPriceSnapshot(makeTestPriceRows(), {
    TargetCurrency: 'RUB',
    created_at: '2026-08-31T12:00:00.000Z'
  });
  const costing = CostingV1.calculateCosting(goldenResult, snapshot);
  const context = {
    calculation_id: 'CALC_GOLDEN_001',
    timestamp: '2026-08-31T12:00:00.000Z',
    project_name: 'Golden Kitchen',
    manager: 'Lead Estimator',
    vision_model: 'gpt-4o-2024-08-06'
  };
  const bundle = CostingV1.buildSheetsV1Bundle(context, costing, snapshot);

  const calcLogRow = bundle.CALC_LOG;
  assert.ok(calcLogRow && typeof calcLogRow === 'object');
  const logColumns = calcLogContract.columns.map((c) => c.name);

  for (const colName of logColumns) {
    assert.ok(colName in calcLogRow, `missing column ${colName} in CALC_LOG row`);
  }

  const allowedStatuses = ['DRAFT', 'CONFIRMED', 'COMPLETED', 'FAILED', 'ARCHIVED'];
  assert.ok(allowedStatuses.includes(calcLogRow.status), `invalid status: ${calcLogRow.status}`);
  assert.equal(calcLogRow.calculation_id, 'CALC_GOLDEN_001');
  assert.equal(calcLogRow.project_name, 'Golden Kitchen');
  assert.equal(calcLogRow.currency, 'RUB');
  assert.equal(calcLogRow.grand_total, costing.Totals.Grand_total);
});

test('buildSheetsV1Bundle produces SYSTEM rows using only allowed keys', () => {
  const snapshot = CostingV1.buildPriceSnapshot(makeTestPriceRows(), {
    TargetCurrency: 'RUB',
    created_at: '2026-08-31T12:00:00.000Z'
  });
  const costing = CostingV1.calculateCosting(goldenResult, snapshot);
  const context = {
    calculation_id: 'CALC_GOLDEN_001',
    timestamp: '2026-08-31T12:00:00.000Z',
    project_name: 'Golden Kitchen',
    manager: 'Lead Estimator',
    vision_model: 'gpt-4o-2024-08-06',
    app_version: '1.0.0',
    schema_version: '1.0',
    construction_profile_version: 'alpha-basis-v1',
    confirmed_configuration: { modules: [] },
    construction_result: goldenResult
  };
  const bundle = CostingV1.buildSheetsV1Bundle(context, costing, snapshot);

  assert.ok(Array.isArray(bundle.SYSTEM));
  const allowedKeys = systemContract.allowed_keys.map((k) => k.key);
  const forbiddenKeys = systemContract.forbidden_keys;

  for (const sysRow of bundle.SYSTEM) {
    assert.ok(allowedKeys.includes(sysRow.Key), `unrecognized SYSTEM key: ${sysRow.Key}`);
    assert.ok(!forbiddenKeys.includes(sysRow.Key), `forbidden key present: ${sysRow.Key}`);
    assert.ok(['string', 'number', 'integer', 'boolean', 'json', 'null'].includes(sysRow.Value_type));
    assert.equal(sysRow.Updated_at, '2026-08-31T12:00:00.000Z');
  }

  // Check required system keys
  const keysPresent = bundle.SYSTEM.map((r) => r.Key);
  assert.ok(keysPresent.includes('Calculation_id'));
  assert.ok(keysPresent.includes('Timestamp'));
  assert.ok(keysPresent.includes('Status'));
  assert.ok(keysPresent.includes('Currency'));
  assert.ok(keysPresent.includes('Price_snapshot_json'));
  assert.ok(keysPresent.includes('Construction_result_json'));
});
