import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { getFarmLeafCategories } from '../services/categoryService.js';
import { rollupGlActuals } from '../services/glRollupService.js';
import { isValidMonth } from '../utils/fiscalYear.js';

const router = Router();

// POST /:farmId/accounting/import-csv
// Accepts: { fiscal_year, accounts: [{ name, category_code, months: { Mon: amount } }] }
// Creates GL accounts + GlActualDetail records, then rolls up to MonthlyData.
// This populates both the executive (category-level) and detail (GL-level) views.
router.post('/:farmId/accounting/import-csv', authenticate, async (req, res, next) => {
  try {
    const { farmId } = req.params;
    const { fiscal_year, accounts } = req.body;

    if (!fiscal_year) {
      return res.status(400).json({ error: 'fiscal_year is required' });
    }
    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      return res.status(400).json({ error: 'accounts array is required' });
    }

    const fy = parseInt(fiscal_year);
    console.log(`[CSV Import] farmId=${farmId}, FY=${fy}, ${accounts.length} account(s)`);

    // Get farm's leaf categories for validation
    const leafCategories = await getFarmLeafCategories(farmId);
    const leafCodes = new Set(leafCategories.map(c => c.code));

    // Build category_code → category_id map
    const categoryMap = {};
    const dbCategories = await prisma.farmCategory.findMany({
      where: { farm_id: farmId },
      select: { id: true, code: true },
    });
    for (const cat of dbCategories) {
      categoryMap[cat.code] = cat.id;
    }

    console.log(`[CSV Import] ${leafCodes.size} valid leaf categories for farm`);

    const monthsAffected = new Set();
    const skippedDetails = [];
    let accountsProcessed = 0;

    for (const acct of accounts) {
      const { name, category_code, months } = acct;

      if (!name || !category_code || !months || typeof months !== 'object') {
        skippedDetails.push({ account: name || '?', reason: 'Missing name, category_code, or months' });
        continue;
      }

      if (!leafCodes.has(category_code)) {
        skippedDetails.push({ account: name, reason: `Invalid leaf category "${category_code}"` });
        continue;
      }

      const categoryId = categoryMap[category_code];
      if (!categoryId) {
        skippedDetails.push({ account: name, reason: `Category "${category_code}" not found in database` });
        continue;
      }

      // Find or create GL account for this CSV line item
      const glAccount = await prisma.glAccount.upsert({
        where: { farm_id_account_number: { farm_id: farmId, account_number: name } },
        update: { account_name: name, category_id: categoryId },
        create: { farm_id: farmId, account_number: name, account_name: name, category_id: categoryId },
      });

      // Create GL actual detail for each month
      for (const [month, amount] of Object.entries(months)) {
        if (!isValidMonth(month)) {
          skippedDetails.push({ account: name, reason: `Invalid month "${month}"` });
          continue;
        }

        await prisma.glActualDetail.upsert({
          where: {
            farm_id_fiscal_year_month_gl_account_id: {
              farm_id: farmId, fiscal_year: fy, month, gl_account_id: glAccount.id,
            },
          },
          update: { amount: parseFloat(amount) || 0 },
          create: {
            farm_id: farmId, fiscal_year: fy, month,
            gl_account_id: glAccount.id, amount: parseFloat(amount) || 0,
          },
        });

        monthsAffected.add(month);
      }

      accountsProcessed++;
    }

    // Rollup GL actuals → MonthlyData for all affected months
    for (const month of monthsAffected) {
      await rollupGlActuals(farmId, fy, month);
    }

    console.log(`[CSV Import] Done: ${accountsProcessed} accounts, ${monthsAffected.size} months, ${skippedDetails.length} skipped`);
    if (skippedDetails.length > 0) {
      console.warn('[CSV Import] Skipped details:', JSON.stringify(skippedDetails));
    }

    res.json({
      message: `Imported ${accountsProcessed} account(s) across ${monthsAffected.size} month(s)`,
      imported: accountsProcessed,
      months: monthsAffected.size,
      skipped: skippedDetails.length,
      skippedDetails,
    });
  } catch (err) {
    console.error('[CSV Import] Error:', err);
    next(err);
  }
});

export default router;
