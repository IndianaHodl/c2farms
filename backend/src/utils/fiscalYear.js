export const CALENDAR_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MONTH_INDEX = {};
CALENDAR_MONTHS.forEach((m, i) => { MONTH_INDEX[m] = i; });

/**
 * Generate a 12-month fiscal year array starting from the given month.
 * E.g. generateFiscalMonths('Nov') => ['Nov','Dec','Jan',...,'Oct']
 */
export function generateFiscalMonths(startMonth = 'Nov') {
  const startIdx = MONTH_INDEX[startMonth] ?? 10; // default Nov
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

/**
 * Convert a calendar date to fiscal year + month name.
 * startMonth determines when the fiscal year begins.
 * Months before startMonth belong to the current calendar year's fiscal year.
 * Months from startMonth onward belong to the NEXT calendar year's fiscal year.
 */
export function calendarToFiscal(date, startMonth = 'Nov') {
  const d = new Date(date);
  const calMonth = d.getMonth(); // 0-11
  const calYear = d.getFullYear();
  const startIdx = MONTH_INDEX[startMonth] ?? 10;

  // If calMonth >= startIdx, this month belongs to the NEXT fiscal year
  const fiscalYear = calMonth >= startIdx ? calYear + 1 : calYear;
  const monthName = CALENDAR_MONTHS[calMonth];

  return { fiscalYear, monthName };
}

/**
 * Convert fiscal year + month name back to a calendar Date (first of that month).
 */
export function fiscalToCalendar(fiscalYear, monthName, startMonth = 'Nov') {
  const calMonth = MONTH_INDEX[monthName]; // 0-11
  const startIdx = MONTH_INDEX[startMonth] ?? 10;

  // Months from startMonth onward are in the prior calendar year
  const calYear = calMonth >= startIdx ? fiscalYear - 1 : fiscalYear;
  return new Date(calYear, calMonth, 1);
}

/**
 * Returns true if the month's first day is after today (i.e. hasn't started yet).
 */
export function isFutureMonth(fiscalYear, monthName, startMonth = 'Nov') {
  const now = new Date();
  const monthDate = fiscalToCalendar(fiscalYear, monthName, startMonth);
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
  // Last day of the month
  const lastDay = new Date(calYear, calMonth + 1, 0, 23, 59, 59);
  return lastDay < now;
}

export function getCurrentFiscalMonth(startMonth = 'Nov') {
  return calendarToFiscal(new Date(), startMonth);
}

// Parse and validate a fiscal year parameter. Returns the integer or null if invalid.
export function parseYear(yearParam) {
  const y = parseInt(yearParam, 10);
  if (isNaN(y) || y < 2000 || y > 2100) return null;
  return y;
}

// Validate a month string is any valid calendar month
export function isValidMonth(month) {
  return CALENDAR_MONTHS.includes(month);
}
