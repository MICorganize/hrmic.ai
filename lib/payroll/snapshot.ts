import "server-only";

import { getPayrollClosePeriodState } from "@/lib/payroll/close-period";
import { getPayrollDashboard } from "@/lib/payroll/dashboard";

/** One backend-for-frontend read for the data visible on the payroll shell. */
export async function getPayrollPageSnapshot(companyId: string | null | undefined, month: string) {
  const [dashboard, closePeriod] = await Promise.all([
    getPayrollDashboard(companyId, month),
    getPayrollClosePeriodState(companyId, month),
  ]);
  return { dashboard, closePeriod };
}

export type PayrollPageSnapshot = Awaited<ReturnType<typeof getPayrollPageSnapshot>>;
