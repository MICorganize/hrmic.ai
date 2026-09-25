import { companyPeriodKey } from "@/lib/payroll/company-period";
import {
  DEFAULT_PAYROLL_CUTOFF_DAY,
  getDefaultPayrollBounds,
  getDefaultPayrollPeriod,
  normalizePayrollCutoffDay,
} from "@/lib/payroll/period-default";
import { prisma } from "@/lib/prisma";

type PayrollRunPeriod = {
  periodStart: Date | null;
  periodEnd: Date | null;
};

type ResolvedPayrollPeriod = {
  startDate: string;
  endDate: string;
  isConfigured: boolean;
};

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

async function readPeriod(monthKey: string, companyId: string) {
  const [run, company] = await Promise.all([
    prisma.payrollRun.findUnique({
      where: { period: companyPeriodKey(monthKey, companyId) },
      select: { periodStart: true, periodEnd: true },
    }),
    prisma.company.findUnique({
      where: { id: companyId },
      select: { payrollCutoffDay: true },
    }),
  ]);
  return { run: run as PayrollRunPeriod | null, cutoffDay: normalizePayrollCutoffDay(company?.payrollCutoffDay) ?? DEFAULT_PAYROLL_CUTOFF_DAY };
}

export async function getResolvedPayrollPeriod(monthKey: string, companyId: string): Promise<ResolvedPayrollPeriod> {
  const { run, cutoffDay } = await readPeriod(monthKey, companyId);
  if (run?.periodStart && run.periodEnd) {
    return {
      startDate: dateKey(run.periodStart),
      endDate: dateKey(run.periodEnd),
      isConfigured: true,
    };
  }
  return { ...getDefaultPayrollPeriod(monthKey, cutoffDay), isConfigured: false };
}

export async function getResolvedPayrollBounds(monthKey: string, companyId: string) {
  const { run, cutoffDay } = await readPeriod(monthKey, companyId);
  if (!run?.periodStart || !run.periodEnd) return getDefaultPayrollBounds(monthKey, cutoffDay);

  const end = new Date(run.periodEnd);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start: run.periodStart, end };
}
