export const CALENDAR_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MONTH_INDEX = {};
CALENDAR_MONTHS.forEach((m, i) => { MONTH_INDEX[m] = i; });

/**
 * Generate a 12-month fiscal year array starting from the given month.
 */
export function generateFiscalMonths(startMonth = 'Nov') {
  const startIdx = MONTH_INDEX[startMonth] ?? 10;
  const months = [];
  for (let i = 0; i < 12; i++) {
    months.push(CALENDAR_MONTHS[(startIdx + i) % 12]);
  }
  return months;
}

// Default fiscal months (Nov-Oct) for backward compatibility
export const FISCAL_MONTHS = generateFiscalMonths('Nov');

export function fiscalMonthIndex(monthName, startMonth = 'Nov') {
  const months = generateFiscalMonths(startMonth);
  return months.indexOf(monthName);
}

export function isFutureMonth(fiscalYear, monthName, startMonth = 'Nov') {
  const now = new Date();
  const calMonth = MONTH_INDEX[monthName];
  const startIdx = MONTH_INDEX[startMonth] ?? 10;
  const calYear = calMonth >= startIdx ? fiscalYear - 1 : fiscalYear;
  const monthDate = new Date(calYear, calMonth, 1);
  return monthDate > now;
}

/**
 * Returns true if the month's last calendar day is before today (fully elapsed).
 */
export function isPastMonth(fiscalYear, monthName, startMonth = 'Nov') {
  const now = new Date();
  const calMonth = MONTH_INDEX[monthName];
  const startIdx = MONTH_INDEX[startMonth] ?? 10;
  const calYear = calMonth >= startIdx ? fiscalYear - 1 : fiscalYear;
  const lastDay = new Date(calYear, calMonth + 1, 0, 23, 59, 59);
  return lastDay < now;
}
