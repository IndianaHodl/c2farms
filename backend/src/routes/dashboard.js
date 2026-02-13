import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { generateFiscalMonths, parseYear } from '../utils/fiscalYear.js';
import { calculateForecast } from '../services/forecastService.js';

const router = Router();

router.get('/:farmId/dashboard/:year', authenticate, async (req, res, next) => {
  try {
    const { farmId, year } = req.params;
    const fiscalYear = parseYear(year);
    if (!fiscalYear) return res.status(400).json({ error: 'Invalid fiscal year' });

    const assumption = await prisma.assumption.findUnique({
      where: { farm_id_fiscal_year: { farm_id: farmId, fiscal_year: fiscalYear } },
    });

    const totalAcres = assumption?.total_acres || 1;
    const crops = assumption?.crops_json || [];

    // Get accounting data aggregated
    const accountingData = await prisma.monthlyData.findMany({
      where: { farm_id: farmId, fiscal_year: fiscalYear, type: 'accounting' },
    });

    const agg = {};
    for (const row of accountingData) {
      for (const [key, val] of Object.entries(row.data_json || {})) {
        agg[key] = (agg[key] || 0) + val;
      }
    }

    // Get frozen budget for inputs adherence comparison
    const frozenData = await prisma.monthlyDataFrozen.findMany({
      where: { farm_id: farmId, fiscal_year: fiscalYear, type: 'accounting' },
    });
    let frozenInputsTotal = 0;
    for (const row of frozenData) {
      frozenInputsTotal += (row.data_json?.inputs || 0);
    }

    // Calculate KPIs
    const actualRevenue = agg['sales_revenue'] || 0;
    const targetRevenue = crops.reduce((sum, c) => sum + (c.acres * c.target_yield * c.price_per_unit), 0);
    const yieldPct = targetRevenue > 0 ? (actualRevenue / targetRevenue) * 100 : 0;

    const totalInputs = agg['inputs'] || 0;
    const totalVarCosts = agg['variable_costs'] || 0;
    const totalFixedCosts = agg['fixed_costs'] || 0;

    // Inputs adherence: compare actual inputs to frozen budget inputs
    const inputsAdherence = frozenInputsTotal > 0
      ? Math.min(100, (1 - Math.abs(totalInputs - frozenInputsTotal) / frozenInputsTotal) * 100)
      : 0;

    const variableLabour = agg['vc_variable_labour'] || 0;
    const fixedLabour = agg['fc_fixed_labour'] || 0;
    const labourCostPerAcre = (variableLabour + fixedLabour) / totalAcres;

    const machineryUptime = null; // No data source available yet

    const grossMarginPerAcre = (actualRevenue - totalInputs - totalVarCosts) / totalAcres;
    const cashFlowPerAcre = (actualRevenue - totalInputs - totalVarCosts - totalFixedCosts) / totalAcres;

    const kpis = [
      { label: 'Yield vs Target', value: yieldPct, unit: '%', gauge: true, target: 100, color: '#4caf50' },
      { label: 'Inputs Adherence', value: inputsAdherence, unit: '%', gauge: true, target: 100, color: '#2196f3' },
      { label: 'Labour Cost/Acre', value: labourCostPerAcre, unit: '$/ac', gauge: false, color: '#ff9800' },
      { label: 'Machinery Uptime', value: machineryUptime, unit: '%', gauge: true, target: 100, color: '#9c27b0', mock: true },
      { label: 'Gross Margin/Acre', value: grossMarginPerAcre, unit: '$/ac', gauge: false, color: '#00bcd4' },
      { label: 'Cash Flow/Acre', value: cashFlowPerAcre, unit: '$/ac', gauge: false, color: '#f44336' },
    ];

    // Budget vs Forecast chart data
    let chartData = { labels: [], budget: [], forecast: [] };
    try {
      const forecast = await calculateForecast(farmId, fiscalYear);
      const majorCategories = ['sales_revenue', 'inputs', 'variable_costs', 'fixed_costs'];
      chartData = {
        labels: majorCategories.map(c => {
          const cat = { sales_revenue: 'Revenue', inputs: 'Inputs', variable_costs: 'Variable', fixed_costs: 'Fixed' };
          return cat[c] || c;
        }),
        budget: majorCategories.map(c => forecast[c]?.frozenBudgetTotal || 0),
        forecast: majorCategories.map(c => forecast[c]?.forecastTotal || 0),
      };
    } catch {
      // No forecast data available
    }

    // Per-crop yield KPIs
    const cropYields = crops.map(crop => {
      const plannedRevenue = crop.acres * crop.target_yield * crop.price_per_unit;
      const revenueShare = targetRevenue > 0 ? plannedRevenue / targetRevenue : 0;
      const allocatedRevenue = actualRevenue * revenueShare;
      const actualYield = (crop.acres > 0 && crop.price_per_unit > 0)
        ? allocatedRevenue / (crop.acres * crop.price_per_unit)
        : 0;
      const yieldPctCrop = crop.target_yield > 0 ? (actualYield / crop.target_yield) * 100 : 0;

      return {
        name: crop.name,
        acres: crop.acres,
        targetYield: crop.target_yield,
        actualYield: Math.round(actualYield * 10) / 10,
        yieldPct: Math.round(yieldPctCrop * 10) / 10,
      };
    });

    res.json({ kpis, chartData, cropYields });
  } catch (err) {
    next(err);
  }
});

export default router;
