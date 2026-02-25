import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { getFarmLeafCategories, getFarmCategories, recalcParentSums } from '../services/categoryService.js';
import { isValidMonth } from '../utils/fiscalYear.js';

const router = Router();

// POST /:farmId/accounting/import-csv
router.post('/:farmId/accounting/import-csv', authenticate, async (req, res, next) => {
  try {
    const { farmId } = req.params;
    const { rows } = req.body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'rows array is required' });
    }

    // Get farm's leaf categories for validation
    const leafCategories = await getFarmLeafCategories(farmId);
    const leafCodes = new Set(leafCategories.map(c => c.code));
    const farmCategories = await getFarmCategories(farmId);

    // Cache assumptions by fiscal year for per-unit conversion
    const assumptionCache = {};

    let importedCount = 0;

    for (const row of rows) {
      const { fiscal_year, month, data } = row;
      if (!fiscal_year || !month || !data) continue;
      if (!isValidMonth(month)) continue;

      const fy = parseInt(fiscal_year);

      // Look up the correct assumption for this row's fiscal year
      if (!assumptionCache[fy]) {
        const assumption = await prisma.assumption.findUnique({
          where: { farm_id_fiscal_year: { farm_id: farmId, fiscal_year: fy } },
        });
        assumptionCache[fy] = assumption?.total_acres || 1;
      }
      const totalAcres = assumptionCache[fy];

      // Validate category codes
      const validData = {};
      for (const [code, value] of Object.entries(data)) {
        if (leafCodes.has(code)) {
          validData[code] = parseFloat(value) || 0;
        }
      }

      if (Object.keys(validData).length === 0) continue;

      // Get existing accounting data and merge
      const existing = await prisma.monthlyData.findUnique({
        where: {
          farm_id_fiscal_year_month_type: {
            farm_id: farmId, fiscal_year: fy, month, type: 'accounting',
          },
        },
      });

      const currentData = existing?.data_json || {};
      const merged = { ...currentData, ...validData };
      const withParents = recalcParentSums(merged, farmCategories);

      // Upsert accounting data
      await prisma.monthlyData.upsert({
        where: {
          farm_id_fiscal_year_month_type: {
            farm_id: farmId, fiscal_year: fy, month, type: 'accounting',
          },
        },
        update: { data_json: withParents, is_actual: true },
        create: {
          farm_id: farmId, fiscal_year: fy, month, type: 'accounting',
          data_json: withParents, is_actual: true, comments_json: {},
        },
      });

      // Cascade to per-unit
      const perUnitData = {};
      for (const [key, val] of Object.entries(withParents)) {
        perUnitData[key] = val / totalAcres;
      }

      await prisma.monthlyData.upsert({
        where: {
          farm_id_fiscal_year_month_type: {
            farm_id: farmId, fiscal_year: fy, month, type: 'per_unit',
          },
        },
        update: { data_json: perUnitData, is_actual: true },
        create: {
          farm_id: farmId, fiscal_year: fy, month, type: 'per_unit',
          data_json: perUnitData, is_actual: true, comments_json: {},
        },
      });

      importedCount++;
    }

    res.json({ message: `Imported ${importedCount} month(s) of data successfully` });
  } catch (err) {
    next(err);
  }
});

export default router;
