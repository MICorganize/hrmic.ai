const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

export const DEFAULT_PAYROLL_CUTOFF_DAY = 1;

type PayrollPeriod = {
  startDate: string;
  endDate: string;
};

type PayrollBounds = {
  start: Date;
  end: Date;
};

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseMonth(monthKey: string) {
  const match = MONTH_PATTERN.exec(monthKey);
  if (!match) throw new RangeError("Invalid payroll month");
  return { year: Number(match[1]), month: Number(match[2]) };
}

function cutoffRange(cutoffDay: number) {
  const normalized = normalizePayrollCutoffDay(cutoffDay);
  if (normalized === null) throw new RangeError("Invalid payroll cutoff day");
  return normalized;
}

export function normalizePayrollCutoffDay(value: unknown): number | null {
  const numberValue = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return typeof numberValue === "number" && Number.isInteger(numberValue) && numberValue >= 1 && numberValue <= 16
    ? numberValue
    : null;
}

export function getDefaultPayrollPeriod(monthKey: string, cutoffDay: number): PayrollPeriod {
  const { year, month } = parseMonth(monthKey);
  const normalizedCutoffDay = cutoffRange(cutoffDay);
  const start = new Date(Date.UTC(year, month - 1, normalizedCutoffDay));
  const endExclusive = normalizedCutoffDay === DEFAULT_PAYROLL_CUTOFF_DAY
    ? new Date(Date.UTC(year, month, 1))
    : new Date(Date.UTC(year, month, normalizedCutoffDay));
  const end = new Date(endExclusive);
  end.setUTCDate(end.getUTCDate() - 1);

  return { startDate: formatDate(start), endDate: formatDate(end) };
}

export function getDefaultPayrollBounds(monthKey: string, cutoffDay: number): PayrollBounds {
  const period = getDefaultPayrollPeriod(monthKey, cutoffDay);
  const start = new Date(`${period.startDate}T00:00:00.000Z`);
  const end = new Date(`${period.endDate}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}
