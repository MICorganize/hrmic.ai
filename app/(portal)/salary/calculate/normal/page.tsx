import { Suspense } from "react";
import { cacheLife } from "next/cache";

import { getActiveCompany } from "@/lib/active-company";
import { PayrollDashboardContent } from "@/components/payroll/PayrollDashboardContent";
import type { PayrollDashboardStats } from "@/lib/payroll/dashboard-client";
import { INITIAL_PAYROLL_MONTH_KEY } from "@/lib/payroll/constants";
import { monthLabel } from "@/lib/payroll/format";
import { getPayrollPageSnapshot } from "@/lib/payroll/snapshot";

import PayrollDashboardShellClient from "./PayrollDashboardShellClient";

const EMPTY_DASHBOARD_STATS: PayrollDashboardStats = {
  salaryEmployees: 0,
  totalEmployees: 0,
  employeeTypes: { monthly: 0, daily: 0, partTime: 0, contract: 0 },
  newEmployees: 0,
  terminatedEmployees: 0,
  birthdays: 0,
};

/**
 * Cached with Cache Components so the first shell render reuses the payroll
 * snapshot instead of repeating the DB read inside the cache window. Runtime
 * input (the tenant cookie) is resolved outside this scope and passed in as an
 * argument, which becomes part of the cache key per company and month.
 */
async function loadInitialPayrollSnapshot(companyId: string) {
  "use cache";
  cacheLife("minutes");

  return getPayrollPageSnapshot(companyId, INITIAL_PAYROLL_MONTH_KEY);
}

/**
 * Runs at request time: resolves the active tenant (cookie) before loading the
 * cached snapshot. The page keeps its static shell by streaming this dynamic
 * part inside a <Suspense> boundary.
 */
async function PayrollSnapshotLoader() {
  const company = await getActiveCompany();
  const initialSnapshot = company ? await loadInitialPayrollSnapshot(company.id) : null;
  const label = monthLabel(INITIAL_PAYROLL_MONTH_KEY);

  return (
    <PayrollDashboardShellClient
      initialSnapshot={initialSnapshot}
      dashboard={
        <PayrollDashboardContent
          stats={initialSnapshot?.dashboard ?? EMPTY_DASHBOARD_STATS}
          monthLabel={label}
          isAccountingPeriodClosed={initialSnapshot?.closePeriod.isClosed ?? false}
        />
      }
    />
  );
}

/** Resolve the first payroll view on the server and avoid a duplicate browser fetch. */
export default function PayrollCalculationPage() {
  return (
    <Suspense
      fallback={<div aria-busy="true" className="min-h-[calc(100vh-10rem)] animate-pulse bg-[#eef6fd]" />}
    >
      <PayrollSnapshotLoader />
    </Suspense>
  );
}
