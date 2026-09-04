import { NextResponse } from "next/server";

import { getActiveCompany } from "@/lib/active-company";
import { companyPeriodKey } from "@/lib/payroll/company-period";
import { prisma } from "@/lib/prisma";

type DashboardEmployeeGroup = "monthly" | "daily" | "partTime" | "contract";

const EMPTY_GROUPS: Record<DashboardEmployeeGroup, number> = {
  monthly: 0,
  daily: 0,
  partTime: 0,
  contract: 0,
};

function getMonth(value: string | null) {
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;

  const [year, month] = value.split("-").map(Number);
  return { year, month };
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
 * Dashboard data is scoped to the saved payroll period for the requested
 * month (or the full calendar month when no custom range is saved). Birthday
 * notifications always follow the selected calendar month, matching the
 * "ณ <เดือน>" dashboard heading.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedMonth = getMonth(searchParams.get("month"));

  if (!requestedMonth) {
    return NextResponse.json({ error: "รูปแบบเดือนต้องเป็น YYYY-MM" }, { status: 400 });
  }

  const { year, month } = requestedMonth;
  const defaultPeriodStart = new Date(Date.UTC(year, month - 1, 1));
  const defaultPeriodEnd = new Date(Date.UTC(year, month, 0));
  const calendarStart = new Date(Date.UTC(year, month - 1, 1));

  try {
    const company = await getActiveCompany();
    // A saved period is shared by the modal, dashboard and individual salary
    // calculation.  The end date is stored as an inclusive DATE value.
    const savedPeriod = await prisma.payrollRun.findUnique({
      where: { period: companyPeriodKey(`${year}-${String(month).padStart(2, "0")}`, company?.id) },
      select: { periodStart: true, periodEnd: true },
    });
    const periodStart = savedPeriod?.periodStart ?? defaultPeriodStart;
    const periodEnd = savedPeriod?.periodEnd ?? defaultPeriodEnd;

    // An employee stays in the selected payroll period through their final day,
    // so termination is evaluated by date instead of the employee's current
    // status alone.
    const payrollEmployeeWhere = {
      deletedAt: null,
      ...(company ? { companyId: company.id } : {}),
      hireDate: { lte: periodEnd },
      OR: [{ terminationDate: null }, { terminationDate: { gte: periodStart } }],
    };

    const [employees, salaryEmployees, newEmployees, terminatedEmployees, birthdayEmployees] = await Promise.all([
      prisma.employee.findMany({
        where: payrollEmployeeWhere,
        select: {
          id: true,
          Employment: {
            select: {
              employmentType: true,
              EmployeeTypeDefinition: { select: { calculationGroup: true } },
            },
          },
        },
      }),
      // The current payroll salary is stored on Employee.baseSalary.  Salary
      // records are adjustment history, so they must not hide newly created
      // employees that already have a current base salary.
      prisma.employee.count({
        where: {
          ...payrollEmployeeWhere,
          baseSalary: { gt: 0 },
        },
      }),
      prisma.employee.count({
        where: {
          deletedAt: null,
          ...(company ? { companyId: company.id } : {}),
          hireDate: { gte: periodStart, lte: periodEnd },
        },
      }),
      prisma.employee.count({
        where: {
          deletedAt: null,
          ...(company ? { companyId: company.id } : {}),
          terminationDate: { gte: periodStart, lte: periodEnd },
        },
      }),
      prisma.employee.findMany({
        where: {
          ...payrollEmployeeWhere,
          birthDate: { not: null },
        },
        select: { birthDate: true },
      }),
    ]);

    const employeeTypes = { ...EMPTY_GROUPS };
    for (const employee of employees) {
      const employment = employee.Employment;
      employeeTypes[
        groupForEmployee(
          employment?.EmployeeTypeDefinition?.calculationGroup,
          employment?.employmentType
        )
      ]++;
    }

    const birthdays = birthdayEmployees.filter((employee) => {
      const birthday = employee.birthDate;
      return (
        birthday &&
        birthday.getUTCMonth() === calendarStart.getUTCMonth()
      );
    }).length;

    return NextResponse.json({
      salaryEmployees,
      totalEmployees: employees.length,
      employeeTypes,
      newEmployees,
      terminatedEmployees,
      birthdays,
      period: {
        start: periodStart.toISOString().slice(0, 10),
        end: periodEnd.toISOString().slice(0, 10),
      },
    });
  } catch (error) {
    console.error("GET /api/payroll/dashboard failed:", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดข้อมูล Dashboard เงินเดือนได้" }, { status: 500 });
  }
}
