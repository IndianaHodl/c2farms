export const FISCAL_MONTHS = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];

export function fiscalMonthIndex(monthName) {
  return FISCAL_MONTHS.indexOf(monthName);
}

export function calendarToFiscal(date) {
  const d = new Date(date);
  const calMonth = d.getMonth(); // 0-11
  const calYear = d.getFullYear();

  // Nov (10) and Dec (11) belong to the NEXT fiscal year
  // Jan (0) through Oct (9) belong to the current fiscal year
  const fiscalYear = calMonth >= 10 ? calYear + 1 : calYear;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = monthNames[calMonth];

  return { fiscalYear, monthName };
}

export function fiscalToCalendar(fiscalYear, monthName) {
  const monthMap = {
    Nov: { calMonth: 10, calYear: fiscalYear - 1 },
    Dec: { calMonth: 11, calYear: fiscalYear - 1 },
    Jan: { calMonth: 0, calYear: fiscalYear },
    Feb: { calMonth: 1, calYear: fiscalYear },
    Mar: { calMonth: 2, calYear: fiscalYear },
    Apr: { calMonth: 3, calYear: fiscalYear },
    May: { calMonth: 4, calYear: fiscalYear },
    Jun: { calMonth: 5, calYear: fiscalYear },
    Jul: { calMonth: 6, calYear: fiscalYear },
    Aug: { calMonth: 7, calYear: fiscalYear },
    Sep: { calMonth: 8, calYear: fiscalYear },
    Oct: { calMonth: 9, calYear: fiscalYear },
  };
  const { calMonth, calYear } = monthMap[monthName];
  return new Date(calYear, calMonth, 1);
}

export function isFutureMonth(fiscalYear, monthName) {
  const now = new Date();
  const monthDate = fiscalToCalendar(fiscalYear, monthName);
  // A month is "future" if its first day is after today
  return monthDate > now;
}

export function getCurrentFiscalMonth() {
  return calendarToFiscal(new Date());
}

// Parse and validate a fiscal year parameter. Returns the integer or null if invalid.
export function parseYear(yearParam) {
  const y = parseInt(yearParam, 10);
  if (isNaN(y) || y < 2000 || y > 2100) return null;
  return y;
}

// Validate a month string is a valid fiscal month
export function isValidMonth(month) {
  return FISCAL_MONTHS.includes(month);
}
