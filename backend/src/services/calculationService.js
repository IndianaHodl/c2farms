import prisma from '../config/database.js';
import { CATEGORY_HIERARCHY, getChildrenCodes, PARENT_CATEGORIES, LEAF_CATEGORIES } from '../utils/categories.js';

const leafCodeSet = new Set(LEAF_CATEGORIES.map(c => c.code));

function validateLeafCategory(code) {
  if (!leafCodeSet.has(code)) {
    throw Object.assign(new Error(`Invalid or non-leaf category code: ${code}`), { status: 400 });
  }
}

// Recalculate parent sums in data_json based on children values
export function recalcParentSums(dataJson) {
  const updated = { ...dataJson };

  // Process parents bottom-up (level 1 parents first, then level 0)
  const level1Parents = PARENT_CATEGORIES.filter(c => c.level === 1);
  const level0Parents = PARENT_CATEGORIES.filter(c => c.level === 0);

  for (const parent of level1Parents) {
    const childCodes = getChildrenCodes(parent.code);
    updated[parent.code] = childCodes.reduce((sum, code) => sum + (updated[code] || 0), 0);
  }

  for (const parent of level0Parents) {
    const childCodes = getChildrenCodes(parent.code);
    updated[parent.code] = childCodes.reduce((sum, code) => sum + (updated[code] || 0), 0);
  }

  return updated;
}

// Update per-unit cell and cascade to accounting
export async function updatePerUnitCell(farmId, fiscalYear, month, categoryCode, value, comment) {
  validateLeafCategory(categoryCode);
  const assumption = await prisma.assumption.findUnique({
    where: { farm_id_fiscal_year: { farm_id: farmId, fiscal_year: fiscalYear } },
  });
  if (!assumption) throw Object.assign(new Error('Assumptions not found'), { status: 404 });

  const totalAcres = assumption.total_acres;

  // Update per-unit data
  const perUnit = await prisma.monthlyData.findUnique({
    where: {
      farm_id_fiscal_year_month_type: {
        farm_id: farmId, fiscal_year: fiscalYear, month, type: 'per_unit',
      },
    },
  });

  if (!perUnit) throw Object.assign(new Error('Monthly data not found'), { status: 404 });

  const perUnitData = { ...(perUnit.data_json || {}) };
  perUnitData[categoryCode] = value;
  const recalcedPerUnit = recalcParentSums(perUnitData);

  const commentsData = { ...(perUnit.comments_json || {}) };
  if (comment !== undefined) {
    commentsData[categoryCode] = comment;
  }

  await prisma.monthlyData.update({
    where: {
      farm_id_fiscal_year_month_type: {
        farm_id: farmId, fiscal_year: fiscalYear, month, type: 'per_unit',
      },
    },
    data: { data_json: recalcedPerUnit, comments_json: commentsData },
  });

  // Update accounting data (per-unit * acres)
  const accountingData = {};
  for (const [key, val] of Object.entries(recalcedPerUnit)) {
    accountingData[key] = val * totalAcres;
  }

  await prisma.monthlyData.update({
    where: {
      farm_id_fiscal_year_month_type: {
        farm_id: farmId, fiscal_year: fiscalYear, month, type: 'accounting',
      },
    },
    data: { data_json: accountingData },
  });

  return { perUnit: recalcedPerUnit, accounting: accountingData };
}

// Update accounting cell (from QB actuals) and cascade to per-unit
export async function updateAccountingCell(farmId, fiscalYear, month, categoryCode, value) {
  validateLeafCategory(categoryCode);
  const assumption = await prisma.assumption.findUnique({
    where: { farm_id_fiscal_year: { farm_id: farmId, fiscal_year: fiscalYear } },
  });
  if (!assumption) throw Object.assign(new Error('Assumptions not found'), { status: 404 });

  const totalAcres = assumption.total_acres;

  // Update accounting
  const accounting = await prisma.monthlyData.findUnique({
    where: {
      farm_id_fiscal_year_month_type: {
        farm_id: farmId, fiscal_year: fiscalYear, month, type: 'accounting',
      },
    },
  });

  const accountingData = { ...(accounting?.data_json || {}) };
  accountingData[categoryCode] = value;
  const recalcedAccounting = recalcParentSums(accountingData);

  await prisma.monthlyData.upsert({
    where: {
      farm_id_fiscal_year_month_type: {
        farm_id: farmId, fiscal_year: fiscalYear, month, type: 'accounting',
      },
    },
    update: { data_json: recalcedAccounting, is_actual: true },
    create: {
      farm_id: farmId, fiscal_year: fiscalYear, month, type: 'accounting',
      data_json: recalcedAccounting, is_actual: true, comments_json: {},
    },
  });

  // Update per-unit (accounting / acres)
  const perUnitData = {};
  for (const [key, val] of Object.entries(recalcedAccounting)) {
    perUnitData[key] = totalAcres > 0 ? val / totalAcres : 0;
  }

  await prisma.monthlyData.upsert({
    where: {
      farm_id_fiscal_year_month_type: {
        farm_id: farmId, fiscal_year: fiscalYear, month, type: 'per_unit',
      },
    },
    update: { data_json: perUnitData, is_actual: true },
    create: {
      farm_id: farmId, fiscal_year: fiscalYear, month, type: 'per_unit',
      data_json: perUnitData, is_actual: true, comments_json: {},
    },
  });

  return { perUnit: perUnitData, accounting: recalcedAccounting };
}
