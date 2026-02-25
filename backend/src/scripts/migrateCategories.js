/**
 * Data migration script: converts old category codes in data_json to new codes.
 * Maps old Variable Costs / Fixed Costs structure → new LPM / LBF / Insurance structure.
 *
 * Usage: node --experimental-specifier-resolution=node src/scripts/migrateCategories.js
 * (run from backend directory)
 */

import { PrismaClient } from '@prisma/client';
import { OLD_TO_NEW_CODE_MAP } from '../utils/defaultCategoryTemplate.js';

const prisma = new PrismaClient();

// Codes that should be summed (merged) into the target
const MERGE_CODES = {
  'input_fert': ['input_fert_n', 'input_fert_p', 'input_fert_k', 'input_fert_s'],
  'lpm_personnel': ['vc_variable_labour', 'fc_fixed_labour'],
};

function migrateDataJson(dataJson) {
  if (!dataJson || typeof dataJson !== 'object') return dataJson;

  const newData = {};

  // First, handle merges (sum multiple old codes into one new code)
  for (const [newCode, oldCodes] of Object.entries(MERGE_CODES)) {
    let sum = 0;
    for (const oldCode of oldCodes) {
      if (dataJson[oldCode] !== undefined) {
        sum += dataJson[oldCode] || 0;
      }
    }
    if (sum !== 0) {
      newData[newCode] = (newData[newCode] || 0) + sum;
    }
  }

  // Then map individual codes
  for (const [oldCode, value] of Object.entries(dataJson)) {
    // Skip codes that were already handled via merge
    const wasMerged = Object.values(MERGE_CODES).flat().includes(oldCode);
    if (wasMerged) continue;

    const newCode = OLD_TO_NEW_CODE_MAP[oldCode];
    if (newCode === undefined) {
      // Unknown code — keep as-is (forward compat)
      newData[oldCode] = value;
    } else if (newCode === null) {
      // Decomposed parent (variable_costs, fixed_costs) — skip, will be recalculated
      continue;
    } else {
      // Direct mapping or accumulate
      newData[newCode] = (newData[newCode] || 0) + (value || 0);
    }
  }

  // Recalculate parent sums
  const revKeys = Object.keys(newData).filter(k => k.startsWith('rev_'));
  if (revKeys.length > 0) {
    newData.revenue = revKeys.reduce((sum, k) => sum + (newData[k] || 0), 0);
  }
  newData.inputs = (newData.input_seed || 0) + (newData.input_fert || 0) + (newData.input_chem || 0);
  newData.lpm = (newData.lpm_personnel || 0) + (newData.lpm_fog || 0) + (newData.lpm_repairs || 0) + (newData.lpm_shop || 0);
  newData.lbf = newData.lbf_rent_interest || 0;
  newData.insurance = (newData.ins_crop || 0) + (newData.ins_other || 0);

  return newData;
}

async function migrate() {
  console.log('Starting category code migration...');

  // Migrate MonthlyData
  const monthlyRows = await prisma.monthlyData.findMany();
  let migratedCount = 0;

  for (const row of monthlyRows) {
    const data = row.data_json;
    // Check if data uses old codes
    const hasOldCodes = Object.keys(data || {}).some(k =>
      k.startsWith('vc_') || k.startsWith('fc_') || k === 'sales_revenue' ||
      k === 'variable_costs' || k === 'fixed_costs' || k.startsWith('input_fert_')
    );

    if (!hasOldCodes) continue;

    const newData = migrateDataJson(data);
    await prisma.monthlyData.update({
      where: { id: row.id },
      data: { data_json: newData },
    });
    migratedCount++;
  }
  console.log(`Migrated ${migratedCount} MonthlyData rows`);

  // Migrate MonthlyDataFrozen
  const frozenRows = await prisma.monthlyDataFrozen.findMany();
  let frozenCount = 0;

  for (const row of frozenRows) {
    const data = row.data_json;
    const hasOldCodes = Object.keys(data || {}).some(k =>
      k.startsWith('vc_') || k.startsWith('fc_') || k === 'sales_revenue' ||
      k === 'variable_costs' || k === 'fixed_costs' || k.startsWith('input_fert_')
    );

    if (!hasOldCodes) continue;

    const newData = migrateDataJson(data);
    await prisma.monthlyDataFrozen.update({
      where: { id: row.id },
      data: { data_json: newData },
    });
    frozenCount++;
  }
  console.log(`Migrated ${frozenCount} MonthlyDataFrozen rows`);

  console.log('Migration complete!');
}

migrate()
  .catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
