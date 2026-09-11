import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { readThroughCache } from "@/lib/cache/read-through";
import { versionedReadModelCacheKey } from "@/lib/cache/read-model-version";
import { companyPeriodKey } from "@/lib/payroll/company-period";
import { prisma } from "@/lib/prisma";

type DashboardEmployeeGroup = "monthly" | "daily" | "partTime" | "contract";

type DashboardEmployeeTypeCounts = Record<DashboardEmployeeGroup, number>;

export type PayrollDashboard = {
  salaryEmployees: number;
  totalEmployees: number;
  employeeTypes: DashboardEmployeeTypeCounts;
  newEmployees: number;
  terminatedEmployees: number;
  birthdays: number;
  period: { start: string; end: string };
};

const EMPTY_GROUPS: DashboardEmployeeTypeCounts = {
  monthly: 0,
  daily: 0,
  partTime: 0,
  contract: 0,
};

export function parsePayrollMonth(value: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;

  const [year, month] = value.split("-").map(Number);
  return { year, month };
}

/**
 * Small, independently cacheable value for the prominent employee-count card.
 * Keeping it separate means the card does not wait for the chart, birthday,
 * and other dashboard aggregates on a cold cache.
 */
export async function getPayrollDashboardEmployeeCount(companyId: string | null | undefined, monthKey: string) {
  return { totalEmployees: (await getPayrollDashboard(companyId, monthKey)).totalEmployees };
}

/**
 * Retrieves the aggregate shown in the payroll dashboard. Keeping this data
 * function outside the route lets the initial page render receive the same
 * result without making a second HTTP request from the browser.
 */
export async function getPayrollDashboard(companyId: string | null | undefined, monthKey: string): Promise<PayrollDashboard> {
  const requestedMonth = parsePayrollMonth(monthKey);
  if (!requestedMonth) throw new Error("Invalid payroll month");

  const { year, month } = requestedMonth;
  const defaultPeriodStart = new Date(Date.UTC(year, month - 1, 1));
  const defaultPeriodEnd = new Date(Date.UTC(year, month, 0));

  const cacheKey = await versionedReadModelCacheKey(
    "payroll-dashboard",
    "payroll-dashboard",
    companyId,
    monthKey
  );
  return readThroughCache(
    cacheKey,
    30,
    async () => {
      type DashboardRow = {
        periodStart: Date;
        periodEnd: Date;
        totalEmployees: number;
        salaryEmployees: number;
        newEmployees: number;
        terminatedEmployees: number;
        birthdays: number;
        groupKey: DashboardEmployeeGroup | null;
        groupCount: number | null;
      };
      const companyFilter = companyId ? Prisma.sql`AND employee."companyId" = ${companyId}::uuid` : Prisma.empty;
      const rows = await prisma.$queryRaw<DashboardRow[]>(Prisma.sql`
        WITH selected_period AS (
          SELECT COALESCE(run."periodStart", ${defaultPeriodStart}::date) AS "periodStart",
                 COALESCE(run."periodEnd", ${defaultPeriodEnd}::date) AS "periodEnd"
          FROM (SELECT 1) seed
          LEFT JOIN "PayrollRun" run ON run."period" = ${companyPeriodKey(monthKey, companyId ?? undefined)}
        ),
        active_employees AS (
          SELECT employee.* FROM "Employee" employee
          WHERE employee."deletedAt" IS NULL ${companyFilter}
        ),
        payroll_employees AS (
          SELECT employee.* FROM active_employees employee CROSS JOIN selected_period period
          WHERE employee."hireDate" <= period."periodEnd"
            AND (employee."terminationDate" IS NULL OR employee."terminationDate" >= period."periodStart")
        ),
        stats AS (
          SELECT period."periodStart", period."periodEnd",
            (SELECT COUNT(*)::int FROM payroll_employees) AS "totalEmployees",
            (SELECT COUNT(*)::int FROM payroll_employees WHERE "baseSalary" > 0) AS "salaryEmployees",
            (SELECT COUNT(*)::int FROM active_employees WHERE "hireDate" BETWEEN period."periodStart" AND period."periodEnd") AS "newEmployees",
            (SELECT COUNT(*)::int FROM active_employees WHERE "terminationDate" BETWEEN period."periodStart" AND period."periodEnd") AS "terminatedEmployees",
            (SELECT COUNT(*)::int FROM payroll_employees WHERE "birthDate" IS NOT NULL AND EXTRACT(MONTH FROM "birthDate") = ${month}) AS birthdays
          FROM selected_period period
        ),
        employee_groups AS (
          SELECT COALESCE(definition."calculationGroup"::text,
            CASE employment."employmentType"::text
              WHEN 'dailyWage' THEN 'daily'
              WHEN 'partTime' THEN 'partTime'
              WHEN 'contract' THEN 'contract'
              ELSE 'monthly'
            END,
            'monthly') AS "groupKey", COUNT(*)::int AS "groupCount"
          FROM payroll_employees employee
          LEFT JOIN "Employment" employment ON employment."employeeId" = employee."id"
          LEFT JOIN "EmployeeTypeDefinition" definition ON definition."id" = employment."employeeTypeDefinitionId"
          GROUP BY 1
        )
        SELECT stats.*, groups."groupKey", groups."groupCount"
        FROM stats LEFT JOIN employee_groups groups ON TRUE
      `);
      const first = rows[0] ?? {
        periodStart: defaultPeriodStart,
        periodEnd: defaultPeriodEnd,
        totalEmployees: 0,
        salaryEmployees: 0,
        newEmployees: 0,
        terminatedEmployees: 0,
        birthdays: 0,
        groupKey: null,
        groupCount: null,
      };
      const employeeTypes = { ...EMPTY_GROUPS };
      for (const row of rows) {
        if (row.groupKey && row.groupKey in employeeTypes) employeeTypes[row.groupKey] = row.groupCount ?? 0;
      }

      return {
        salaryEmployees: first.salaryEmployees,
        totalEmployees: first.totalEmployees,
        employeeTypes,
        newEmployees: first.newEmployees,
        terminatedEmployees: first.terminatedEmployees,
        birthdays: first.birthdays,
        period: {
          start: first.periodStart.toISOString().slice(0, 10),
          end: first.periodEnd.toISOString().slice(0, 10),
        },
      };
    }
  );
}
