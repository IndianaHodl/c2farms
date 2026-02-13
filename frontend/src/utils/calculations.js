import { FISCAL_MONTHS } from './fiscalYear';

export function calculateRowTotal(monthValues) {
  return FISCAL_MONTHS.reduce((sum, month) => sum + (monthValues[month] || 0), 0);
}

export function validateRevenueCheck(assumptions, perUnitRows) {
  if (!assumptions?.crops_json) return null;

  const crops = assumptions.crops_json;
  const totalAcres = assumptions.total_acres || 1;

  const expectedRevenue = crops.reduce(
    (sum, c) => sum + (c.acres || 0) * (c.target_yield || 0) * (c.price_per_unit || 0),
    0
  );
  const expectedPerAcre = expectedRevenue / totalAcres;

  const revenueRow = perUnitRows?.find(r => r.code === 'sales_revenue');
  if (!revenueRow) return null;

  const actualTotal = FISCAL_MONTHS.reduce(
    (sum, month) => sum + (revenueRow.months?.[month] || 0),
    0
  );

  const deviation = expectedPerAcre > 0
    ? Math.abs(actualTotal - expectedPerAcre) / expectedPerAcre * 100
    : 0;

  return {
    expectedPerAcre,
    actualTotal,
    deviation,
    warning: deviation > 10,
  };
}
