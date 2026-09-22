import { formatThaiDateNumeric, formatThaiMonthYear, THAI_MONTHS } from "@/lib/date/thai-date";

export const MONTHS_TH = THAI_MONTHS;

/** Formats an ISO "yyyy-mm" key as a Thai Buddhist month label. */
export function monthLabel(monthKey: string) {
  return formatThaiMonthYear(monthKey);
}

/** Formats ISO dates as a Thai Buddhist calendar period. */
export function formatPayrollPeriod(startDate: string, endDate: string) {
  return `ตั้งแต่วันที่ ${formatThaiDateNumeric(startDate)} จนถึงวันที่ ${formatThaiDateNumeric(endDate)}`;
}
