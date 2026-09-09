import "server-only";

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
  const requestedMonth = parsePayrollMonth(monthKey);
  if (!requestedMonth) throw new Error("Invalid payroll month");

  const { year, month } = requestedMonth;
  const defaultPeriodStart = new Date(Date.UTC(year, month - 1, 1));
  const defaultPeriodEnd = new Date(Date.UTC(year, month, 0));

  const cacheKey = await versionedReadModelCacheKey(
    "payroll-dashboard",
    "payroll-dashboard-employee-count",
    companyId,
    monthKey
  );
  return readThroughCache(
    cacheKey,
    30,
    async () => {
      const savedPeriod = await prisma.payrollRun.findUnique({
        where: { period: companyPeriodKey(monthKey, companyId ?? undefined) },
        select: { periodStart: true, periodEnd: true },
      });
      const periodStart = savedPeriod?.periodStart ?? defaultPeriodStart;
      const periodEnd = savedPeriod?.periodEnd ?? defaultPeriodEnd;
      const totalEmployees = await prisma.employee.count({
        where: {
          deletedAt: null,
          ...(companyId ? { companyId } : {}),
          hireDate: { lte: periodEnd },
          OR: [{ terminationDate: null }, { terminationDate: { gte: periodStart } }],
        },
      });

      return { totalEmployees };
    }
  );
}

function groupForEmployee(
  calculationGroup: DashboardEmployeeGroup | null | undefined,
  employmentType: "permanent" | "temporary" | "contract" | "dailyWage" | "partTime" | null | undefined
): DashboardEmployeeGroup {
  if (calculationGroup) return calculationGroup;
  if (employmentType === "dailyWage") return "daily";
  if (employmentType === "partTime") return "partTime";
  if (employmentType === "contract") return "contract";
  return "monthly";
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
  const calendarStart = new Date(Date.UTC(year, month - 1, 1));

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
      const savedPeriod = await prisma.payrollRun.findUnique({
        where: { period: companyPeriodKey(monthKey, companyId ?? undefined) },
        select: { periodStart: true, periodEnd: true },
      });
      const periodStart = savedPeriod?.periodStart ?? defaultPeriodStart;
      const periodEnd = savedPeriod?.periodEnd ?? defaultPeriodEnd;

      // An employee stays in the selected payroll period through their final
      // day, so the termination date is evaluated instead of current status.
      const payrollEmployeeWhere = {
        deletedAt: null,
        ...(companyId ? { companyId } : {}),
        hireDate: { lte: periodEnd },
        OR: [{ terminationDate: null }, { terminationDate: { gte: periodStart } }],
      };

      const [
        totalEmployees,
        employmentGroups,
        employeeTypeDefinitions,
        salaryEmployees,
        newEmployees,
        terminatedEmployees,
        birthdayEmployees,
      ] = await Promise.all([
        prisma.employee.count({ where: payrollEmployeeWhere }),
        // One row per distinct type/definition pair instead of one row per
        // employee. This keeps the dashboard payload small for large companies.
        prisma.employment.groupBy({
          by: ["employmentType", "employeeTypeDefinitionId"],
          where: { Employee: payrollEmployeeWhere },
          _count: { _all: true },
        }),
        prisma.employeeTypeDefinition.findMany({
          where: companyId ? { companyId } : undefined,
          select: { id: true, calculationGroup: true },
        }),
        prisma.employee.count({ where: { ...payrollEmployeeWhere, baseSalary: { gt: 0 } } }),
        prisma.employee.count({
          where: {
            deletedAt: null,
            ...(companyId ? { companyId } : {}),
            hireDate: { gte: periodStart, lte: periodEnd },
          },
        }),
        prisma.employee.count({
          where: {
            deletedAt: null,
            ...(companyId ? { companyId } : {}),
            terminationDate: { gte: periodStart, lte: periodEnd },
          },
        }),
        prisma.employee.findMany({
          where: { ...payrollEmployeeWhere, birthDate: { not: null } },
          select: { birthDate: true },
        }),
      ]);

      const employeeTypes = { ...EMPTY_GROUPS };
      const calculationGroupsByDefinitionId = new Map(
        employeeTypeDefinitions.map((definition) => [definition.id, definition.calculationGroup])
      );
      let employeesWithEmployment = 0;
      for (const group of employmentGroups) {
        employeesWithEmployment += group._count._all;
        employeeTypes[
          groupForEmployee(
            group.employeeTypeDefinitionId
              ? calculationGroupsByDefinitionId.get(group.employeeTypeDefinitionId)
              : undefined,
            group.employmentType
          )
        ] += group._count._all;
      }
      // Employees without an Employment row retain the previous default:
      // monthly payroll calculation.
      employeeTypes.monthly += totalEmployees - employeesWithEmployment;

      const birthdays = birthdayEmployees.filter((employee) => {
        const birthday = employee.birthDate;
        return birthday && birthday.getUTCMonth() === calendarStart.getUTCMonth();
      }).length;

      return {
        salaryEmployees,
        totalEmployees,
        employeeTypes,
        newEmployees,
        terminatedEmployees,
        birthdays,
        period: {
          start: periodStart.toISOString().slice(0, 10),
          end: periodEnd.toISOString().slice(0, 10),
        },
      };
    }
  );
}
