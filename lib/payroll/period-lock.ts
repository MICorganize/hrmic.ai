import { prisma } from "@/lib/prisma";
import { companyPeriodKey } from "@/lib/payroll/company-period";

export const CLOSED_PAYROLL_PERIOD_MESSAGE = "งวดบัญชีนี้ถูกปิดแล้ว ไม่สามารถคำนวณหรือแก้ไขข้อมูลได้";

/** A paid payroll run is the authoritative lock for its month. */
export async function isPayrollPeriodClosed(period: string, companyId: string) {
  const run = await prisma.payrollRun.findUnique({
    where: { period: companyPeriodKey(period, companyId) },
    select: { status: true },
  });
  return run?.status === "paid";
}
