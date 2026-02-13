import prisma from '../config/database.js';
import { generateFiscalMonths, fiscalMonthIndex, getCurrentFiscalMonth } from '../utils/fiscalYear.js';
import { LEAF_CATEGORIES, PARENT_CATEGORIES, getChildrenCodes } from '../utils/categories.js';

export async function calculateForecast(farmId, fiscalYear, startMonth) {
  // Look up startMonth from assumption if not provided
  if (!startMonth) {
    const assumption = await prisma.assumption.findUnique({
      where: { farm_id_fiscal_year: { farm_id: farmId, fiscal_year: fiscalYear } },
    });
    startMonth = assumption?.start_month || 'Nov';
  }

  const months = generateFiscalMonths(startMonth);
  const { fiscalYear: currentFY, monthName: currentMonth } = getCurrentFiscalMonth(startMonth);
  const currentMonthIdx = fiscalMonthIndex(currentMonth, startMonth);

  // Fetch all monthly data for this year
  const monthlyData = await prisma.monthlyData.findMany({
    where: { farm_id: farmId, fiscal_year: fiscalYear, type: 'per_unit' },
  });

  // Fetch frozen budget data
  const frozenData = await prisma.monthlyDataFrozen.findMany({
    where: { farm_id: farmId, fiscal_year: fiscalYear, type: 'per_unit' },
  });

  const monthlyMap = {};
  for (const row of monthlyData) {
    monthlyMap[row.month] = { data: row.data_json || {}, isActual: row.is_actual };
  }

  const frozenMap = {};
  for (const row of frozenData) {
    frozenMap[row.month] = row.data_json || {};
  }

  // Build forecast per category
  const result = {};

  for (const cat of LEAF_CATEGORIES) {
    const code = cat.code;
    let forecastTotal = 0;
    let currentAggregate = 0;
    let frozenBudgetTotal = 0;
    const monthValues = {};

    for (let i = 0; i < months.length; i++) {
      const month = months[i];
      const monthData = monthlyMap[month];
      const frozenMonth = frozenMap[month] || {};
      const frozenVal = frozenMonth[code] || 0;
      frozenBudgetTotal += frozenVal;

      let forecastVal;
      if (fiscalYear < currentFY || (fiscalYear === currentFY && i < currentMonthIdx)) {
        // Past month: use actual/latest value
        forecastVal = monthData?.data?.[code] || 0;
        currentAggregate += forecastVal;
      } else if (fiscalYear === currentFY && i === currentMonthIdx) {
        // Current month: use user's editable estimate
        forecastVal = monthData?.data?.[code] || 0;
      } else {
        // Future month: use frozen budget
        forecastVal = frozenVal;
      }

      forecastTotal += forecastVal;
      monthValues[month] = forecastVal;
    }

    const variance = forecastTotal - frozenBudgetTotal;
    const pctDiff = frozenBudgetTotal !== 0
      ? (variance / Math.abs(frozenBudgetTotal)) * 100
      : 0;

    result[code] = {
      code,
      display_name: cat.display_name,
      monthValues,
      forecastTotal,
      currentAggregate,
      frozenBudgetTotal,
      variance,
      pctDiff,
    };
  }

  // Aggregate parent categories by summing their children (bottom-up by level)
  const sortedParents = [...PARENT_CATEGORIES].sort((a, b) => b.level - a.level);
  for (const parent of sortedParents) {
    const childCodes = getChildrenCodes(parent.code);
    let forecastTotal = 0;
    let currentAggregate = 0;
    let frozenBudgetTotal = 0;
    const monthValues = {};

    for (const month of months) {
      let monthSum = 0;
      for (const childCode of childCodes) {
        monthSum += result[childCode]?.monthValues?.[month] || 0;
      }
      monthValues[month] = monthSum;
    }

    for (const childCode of childCodes) {
      forecastTotal += result[childCode]?.forecastTotal || 0;
      currentAggregate += result[childCode]?.currentAggregate || 0;
      frozenBudgetTotal += result[childCode]?.frozenBudgetTotal || 0;
    }

    const variance = forecastTotal - frozenBudgetTotal;
    const pctDiff = frozenBudgetTotal !== 0
      ? (variance / Math.abs(frozenBudgetTotal)) * 100
      : 0;

    result[parent.code] = {
      code: parent.code,
      display_name: parent.display_name,
      monthValues,
      forecastTotal,
      currentAggregate,
      frozenBudgetTotal,
      variance,
      pctDiff,
    };
  }

  return result;
}
