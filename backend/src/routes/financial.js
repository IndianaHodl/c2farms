import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { updatePerUnitCell, updateAccountingCell, recalcParentSums } from '../services/calculationService.js';
import { calculateForecast } from '../services/forecastService.js';
import { broadcastCellChange } from '../socket/handler.js';
import { generateFiscalMonths, isFutureMonth, parseYear, isValidMonth } from '../utils/fiscalYear.js';
import { CATEGORY_HIERARCHY, LEAF_CATEGORIES } from '../utils/categories.js';

const router = Router();

// GET per-unit data for all 12 months
router.get('/:farmId/per-unit/:year', authenticate, async (req, res, next) => {
  try {
    const { farmId, year } = req.params;
    const fiscalYear = parseYear(year);
    if (!fiscalYear) return res.status(400).json({ error: 'Invalid fiscal year' });

    const assumption = await prisma.assumption.findUnique({
      where: { farm_id_fiscal_year: { farm_id: farmId, fiscal_year: fiscalYear } },
    });

    const startMonth = assumption?.start_month || 'Nov';
    const months = generateFiscalMonths(startMonth);

    const monthlyData = await prisma.monthlyData.findMany({
      where: { farm_id: farmId, fiscal_year: fiscalYear, type: 'per_unit' },
      orderBy: { month: 'asc' },
    });

    // Get frozen budget for comparison
    const frozenData = await prisma.monthlyDataFrozen.findMany({
      where: { farm_id: farmId, fiscal_year: fiscalYear, type: 'per_unit' },
    });

    // Get prior year data (aggregate)
    const priorYearData = await prisma.monthlyData.findMany({
      where: { farm_id: farmId, fiscal_year: fiscalYear - 1, type: 'per_unit' },
    });

    // Build month map
    const monthMap = {};
    for (const row of monthlyData) {
      monthMap[row.month] = { data: row.data_json || {}, isActual: row.is_actual, comments: row.comments_json || {} };
    }

    const frozenMap = {};
    for (const row of frozenData) {
      frozenMap[row.month] = row.data_json || {};
    }

    // Aggregate prior year
    const priorYearAgg = {};
    for (const row of priorYearData) {
      for (const [key, val] of Object.entries(row.data_json || {})) {
        priorYearAgg[key] = (priorYearAgg[key] || 0) + val;
      }
    }

    // Calculate forecast
    let forecast = {};
    try {
      forecast = await calculateForecast(farmId, fiscalYear, startMonth);
    } catch {
      // Forecast may fail if no frozen data
    }

    // Build response rows per category
    const rows = CATEGORY_HIERARCHY.map(cat => {
      const monthValues = {};
      const monthActuals = {};
      const monthComments = {};
      let currentAgg = 0;

      for (const month of months) {
        const val = monthMap[month]?.data?.[cat.code] || 0;
        monthValues[month] = val;
        monthActuals[month] = monthMap[month]?.isActual || false;
        monthComments[month] = monthMap[month]?.comments?.[cat.code] || '';
        currentAgg += val;
      }

      const fc = forecast[cat.code] || {};

      return {
        code: cat.code,
        display_name: cat.display_name,
        level: cat.level,
        parent_code: cat.parent_id ? CATEGORY_HIERARCHY.find(c => c.id === cat.parent_id)?.code : null,
        category_type: cat.category_type,
        sort_order: cat.sort_order,
        priorYear: priorYearAgg[cat.code] || 0,
        months: monthValues,
        actuals: monthActuals,
        comments: monthComments,
        currentAggregate: fc.currentAggregate ?? currentAgg,
        forecastTotal: fc.forecastTotal ?? currentAgg,
        frozenBudgetTotal: fc.frozenBudgetTotal ?? 0,
        variance: fc.variance ?? 0,
        pctDiff: fc.pctDiff ?? 0,
      };
    });

    // Compute netback per acre row: revenue - inputs - variable_costs
    const revenueRow = rows.find(r => r.code === 'sales_revenue');
    const inputsRow = rows.find(r => r.code === 'inputs');
    const varCostsRow = rows.find(r => r.code === 'variable_costs');

    if (revenueRow && inputsRow && varCostsRow) {
      const netbackMonths = {};
      let netbackAgg = 0;
      for (const month of months) {
        const val = (revenueRow.months[month] || 0) - (inputsRow.months[month] || 0) - (varCostsRow.months[month] || 0);
        netbackMonths[month] = val;
        netbackAgg += val;
      }

      const netbackForecast = (revenueRow.forecastTotal || 0) - (inputsRow.forecastTotal || 0) - (varCostsRow.forecastTotal || 0);
      const netbackFrozen = (revenueRow.frozenBudgetTotal || 0) - (inputsRow.frozenBudgetTotal || 0) - (varCostsRow.frozenBudgetTotal || 0);

      rows.push({
        code: '_netback_per_acre',
        display_name: 'Netback per Acre',
        level: -1,
        parent_code: null,
        category_type: 'COMPUTED',
        sort_order: 999,
        priorYear: (revenueRow.priorYear || 0) - (inputsRow.priorYear || 0) - (varCostsRow.priorYear || 0),
        months: netbackMonths,
        actuals: revenueRow.actuals,
        comments: {},
        isComputed: true,
        currentAggregate: netbackAgg,
        forecastTotal: netbackForecast,
        frozenBudgetTotal: netbackFrozen,
        variance: netbackForecast - netbackFrozen,
        pctDiff: netbackFrozen !== 0 ? ((netbackForecast - netbackFrozen) / Math.abs(netbackFrozen)) * 100 : 0,
      });
    }

    res.json({ fiscalYear, startMonth, months, rows, isFrozen: assumption?.is_frozen || false });
  } catch (err) {
    next(err);
  }
});

// PATCH per-unit cell
router.patch('/:farmId/per-unit/:year/:month', authenticate, async (req, res, next) => {
  try {
    const { farmId, year, month } = req.params;
    const { category_code, value, comment } = req.body;
    const fiscalYear = parseYear(year);
    if (!fiscalYear) return res.status(400).json({ error: 'Invalid fiscal year' });
    if (!isValidMonth(month)) return res.status(400).json({ error: 'Invalid month' });

    if (!category_code || value === undefined) {
      return res.status(400).json({ error: 'category_code and value are required' });
    }

    // Only allow editing leaf categories
    const isLeaf = LEAF_CATEGORIES.some(c => c.code === category_code);
    if (!isLeaf) {
      return res.status(400).json({ error: 'Cannot edit parent category directly' });
    }

    // Check if budget is frozen
    const assumption = await prisma.assumption.findUnique({
      where: { farm_id_fiscal_year: { farm_id: farmId, fiscal_year: fiscalYear } },
    });

    // Check if month is locked (actual data)
    const existing = await prisma.monthlyData.findUnique({
      where: {
        farm_id_fiscal_year_month_type: {
          farm_id: farmId, fiscal_year: fiscalYear, month, type: 'per_unit',
        },
      },
    });

    if (existing?.is_actual) {
      return res.status(403).json({ error: 'Cannot edit actual data. Month is locked.' });
    }

    if (assumption?.is_frozen && !existing?.is_actual) {
      return res.status(403).json({ error: 'Cannot edit budget data. Budget is frozen.' });
    }

    const result = await updatePerUnitCell(farmId, fiscalYear, month, category_code, parseFloat(value), comment);

    // Broadcast via socket
    const io = req.app.get('io');
    if (io) {
      broadcastCellChange(io, farmId, {
        fiscalYear,
        month,
        categoryCode: category_code,
        perUnitValue: result.perUnit[category_code],
        accountingValue: result.accounting[category_code],
        perUnitData: result.perUnit,
        accountingData: result.accounting,
      });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET accounting data for all 12 months
router.get('/:farmId/accounting/:year', authenticate, async (req, res, next) => {
  try {
    const { farmId, year } = req.params;
    const fiscalYear = parseYear(year);
    if (!fiscalYear) return res.status(400).json({ error: 'Invalid fiscal year' });

    const assumption = await prisma.assumption.findUnique({
      where: { farm_id_fiscal_year: { farm_id: farmId, fiscal_year: fiscalYear } },
    });

    const startMonth = assumption?.start_month || 'Nov';
    const months = generateFiscalMonths(startMonth);
    const totalAcres = assumption?.total_acres || 0;

    const monthlyData = await prisma.monthlyData.findMany({
      where: { farm_id: farmId, fiscal_year: fiscalYear, type: 'accounting' },
    });

    // Get prior year accounting data
    const priorYearData = await prisma.monthlyData.findMany({
      where: { farm_id: farmId, fiscal_year: fiscalYear - 1, type: 'accounting' },
    });

    const priorYearAgg = {};
    for (const row of priorYearData) {
      for (const [key, val] of Object.entries(row.data_json || {})) {
        priorYearAgg[key] = (priorYearAgg[key] || 0) + val;
      }
    }

    // Calculate forecast (per-unit based)
    let forecast = {};
    try {
      forecast = await calculateForecast(farmId, fiscalYear, startMonth);
    } catch {
      // Forecast may not be available
    }

    const monthMap = {};
    const monthActualMap = {};
    for (const row of monthlyData) {
      monthMap[row.month] = row.data_json || {};
      monthActualMap[row.month] = row.is_actual || false;
    }

    const rows = CATEGORY_HIERARCHY.map(cat => {
      const monthValues = {};
      const actuals = {};
      let total = 0;
      for (const month of months) {
        const val = monthMap[month]?.[cat.code] || 0;
        monthValues[month] = val;
        actuals[month] = monthActualMap[month] || false;
        total += val;
      }

      const fc = forecast[cat.code] || {};

      return {
        code: cat.code,
        display_name: cat.display_name,
        level: cat.level,
        parent_code: cat.parent_id ? CATEGORY_HIERARCHY.find(c => c.id === cat.parent_id)?.code : null,
        category_type: cat.category_type,
        sort_order: cat.sort_order,
        months: monthValues,
        actuals,
        total,
        priorYear: priorYearAgg[cat.code] || 0,
        currentAggregate: fc.currentAggregate ? fc.currentAggregate * totalAcres : 0,
        forecastTotal: fc.forecastTotal ? fc.forecastTotal * totalAcres : total,
        frozenBudgetTotal: fc.frozenBudgetTotal ? fc.frozenBudgetTotal * totalAcres : 0,
        variance: fc.variance ? fc.variance * totalAcres : 0,
        pctDiff: fc.pctDiff ?? 0,
      };
    });

    // Compute summary rows
    const summaryByMonth = {};
    for (const month of months) {
      const revenue = monthMap[month]?.['sales_revenue'] || 0;
      const inputs = monthMap[month]?.['inputs'] || 0;
      const variableCosts = monthMap[month]?.['variable_costs'] || 0;
      const fixedCosts = monthMap[month]?.['fixed_costs'] || 0;
      const grossMargin = revenue - inputs - variableCosts;
      const operatingIncome = grossMargin - fixedCosts;

      summaryByMonth[month] = { revenue, inputs, variableCosts, fixedCosts, grossMargin, operatingIncome };
    }

    res.json({
      fiscalYear,
      startMonth,
      totalAcres,
      months,
      rows,
      summary: summaryByMonth,
      isFrozen: assumption?.is_frozen || false,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH single accounting cell (used by AccountingGrid inline editing)
router.patch('/:farmId/accounting/:year/:month', authenticate, async (req, res, next) => {
  try {
    const { farmId, year, month } = req.params;
    const { category_code, value } = req.body;
    const fiscalYear = parseYear(year);
    if (!fiscalYear) return res.status(400).json({ error: 'Invalid fiscal year' });
    if (!isValidMonth(month)) return res.status(400).json({ error: 'Invalid month' });

    if (!category_code || value === undefined) {
      return res.status(400).json({ error: 'category_code and value are required' });
    }

    // Only allow editing leaf categories
    const isLeaf = LEAF_CATEGORIES.some(c => c.code === category_code);
    if (!isLeaf) {
      return res.status(400).json({ error: 'Cannot edit parent category directly' });
    }

    const result = await updateAccountingCell(farmId, fiscalYear, month, category_code, parseFloat(value));

    // Broadcast via socket
    const io = req.app.get('io');
    if (io) {
      broadcastCellChange(io, farmId, {
        fiscalYear,
        month,
        categoryCode: category_code,
        perUnitData: result.perUnit,
        accountingData: result.accounting,
      });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST manual actual entry (QB fallback / bulk)
router.post('/:farmId/financial/manual-actual', authenticate, async (req, res, next) => {
  try {
    const { farmId } = req.params;
    const { fiscal_year, month, data } = req.body;

    if (!fiscal_year || !month || !data) {
      return res.status(400).json({ error: 'fiscal_year, month, and data are required' });
    }

    // Update accounting data as actuals
    const existing = await prisma.monthlyData.findUnique({
      where: {
        farm_id_fiscal_year_month_type: {
          farm_id: farmId, fiscal_year: parseInt(fiscal_year), month, type: 'accounting',
        },
      },
    });

    const currentData = existing?.data_json || {};
    const merged = { ...currentData, ...data };
    const withParents = recalcParentSums(merged);

    await prisma.monthlyData.upsert({
      where: {
        farm_id_fiscal_year_month_type: {
          farm_id: farmId, fiscal_year: parseInt(fiscal_year), month, type: 'accounting',
        },
      },
      update: { data_json: withParents, is_actual: true },
      create: {
        farm_id: farmId, fiscal_year: parseInt(fiscal_year), month, type: 'accounting',
        data_json: withParents, is_actual: true, comments_json: {},
      },
    });

    // Recalc per-unit
    const assumption = await prisma.assumption.findUnique({
      where: { farm_id_fiscal_year: { farm_id: farmId, fiscal_year: parseInt(fiscal_year) } },
    });
    const totalAcres = assumption?.total_acres || 1;
    const perUnitData = {};
    for (const [key, val] of Object.entries(withParents)) {
      perUnitData[key] = val / totalAcres;
    }

    await prisma.monthlyData.upsert({
      where: {
        farm_id_fiscal_year_month_type: {
          farm_id: farmId, fiscal_year: parseInt(fiscal_year), month, type: 'per_unit',
        },
      },
      update: { data_json: perUnitData, is_actual: true },
      create: {
        farm_id: farmId, fiscal_year: parseInt(fiscal_year), month, type: 'per_unit',
        data_json: perUnitData, is_actual: true, comments_json: {},
      },
    });

    res.json({ message: 'Actuals saved', data: withParents });
  } catch (err) {
    next(err);
  }
});

// GET prior year aggregate (mock for MVP)
router.get('/:farmId/prior-year/:year', authenticate, async (req, res, next) => {
  try {
    const { farmId, year } = req.params;
    const fy = parseYear(year);
    if (!fy) return res.status(400).json({ error: 'Invalid fiscal year' });
    const priorYear = fy - 1;

    const priorData = await prisma.monthlyData.findMany({
      where: { farm_id: farmId, fiscal_year: priorYear, type: 'per_unit' },
    });

    const aggregate = {};
    for (const row of priorData) {
      for (const [key, val] of Object.entries(row.data_json || {})) {
        aggregate[key] = (aggregate[key] || 0) + val;
      }
    }

    res.json({ fiscalYear: priorYear, aggregate });
  } catch (err) {
    next(err);
  }
});

export default router;
