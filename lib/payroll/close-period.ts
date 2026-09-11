import "server-only";

import { companyPeriodKey } from "@/lib/payroll/company-period";
import { prisma } from "@/lib/prisma";

export type PayrollClosePeriodState = {
  paymentDate: string;
  taxPaymentDate: string;
  isClosed: boolean;
  closedAt: string | null;
  employeeCount: number;
};

function dateKey(value: Date | null) {
  return value?.toISOString().slice(0, 10) ?? "";
}

/** Shared server projection used by the page snapshot and close-period API. */
export async function getPayrollClosePeriodState(
  companyId: string | null | undefined,
  month: string
): Promise<PayrollClosePeriodState> {
  const run = await prisma.payrollRun.findUnique({
    where: { period: companyPeriodKey(month, companyId ?? undefined) },
    select: {
      paymentDate: true,
      taxPaymentDate: true,
      status: true,
      closedAt: true,
      _count: { select: { PayrollItem: true } },
    },
  });

  return {
    paymentDate: dateKey(run?.paymentDate ?? null),
    taxPaymentDate: dateKey(run?.taxPaymentDate ?? null),
    isClosed: run?.status === "paid",
    closedAt: run?.closedAt?.toISOString() ?? null,
    employeeCount: run?._count.PayrollItem ?? 0,
  };
}
