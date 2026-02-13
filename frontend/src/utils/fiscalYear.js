export const FISCAL_MONTHS = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];

export function fiscalMonthIndex(monthName) {
  return FISCAL_MONTHS.indexOf(monthName);
}

export function isFutureMonth(fiscalYear, monthName) {
  const now = new Date();
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
  const monthDate = new Date(calYear, calMonth, 1);
  return monthDate > now;
}
