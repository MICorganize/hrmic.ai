import "server-only";

import { prisma } from "@/lib/prisma";
import { invalidateReadModel, readVersionedReadModel, seedVersionedReadModel } from "@/lib/cache/read-model-version";

export type EmployeeSummary = {
  total: number;
  byGender: { male: number; female: number; other: number; unknown: number };
  byEmploymentType: Record<string, number>;
  byBranch: { name: string; count: number }[];
  byNationality: { nationality: string; count: number }[];
  history: { id: string; subject: string; by: string; date: string; note: string }[];
  historyTotal: number;
};

export type DashboardEmployeeSummary = {
  total: number;
  byGender: { male: number; female: number; other: number };
  byEmploymentType: Record<string, number>;
  byNationality: { nationality: string; count: number }[];
};

function formatDate(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${date.getUTCFullYear()}`;
}

function logSummaryTiming(name: string, startedAt: number) {
  if (process.env.PERFORMANCE_LOGGING !== "true") return;
  console.info(JSON.stringify({ event: name, durationMs: Number((performance.now() - startedAt).toFixed(1)) }));
}

async function getEmployeeSummary(companyId?: string, historyPage = 1, historyPageSize = 10): Promise<EmployeeSummary> {
  const startedAt = performance.now();
  const activeEmployees = { deletedAt: null, ...(companyId ? { companyId } : {}) };
  const timelineWhere = { Employee: activeEmployees };
  const [total, genderCounts, nationalityCounts, branchCounts, employmentTypeCounts, timeline, historyTotal] = await Promise.all([
    prisma.employee.count({ where: activeEmployees }),
    prisma.employee.groupBy({ by: ["gender"], where: activeEmployees, _count: { _all: true } }),
    prisma.employee.groupBy({ by: ["nationality"], where: activeEmployees, _count: { _all: true } }),
    prisma.employee.groupBy({ by: ["branchId"], where: activeEmployees, _count: { _all: true } }),
    prisma.employment.groupBy({ by: ["employmentType"], where: { Employee: activeEmployees }, _count: { _all: true } }),
    prisma.employeeTimeline.findMany({
      where: timelineWhere,
      orderBy: { eventDate: "desc" },
      skip: (historyPage - 1) * historyPageSize,
      take: historyPageSize,
      select: { id: true, title: true, description: true, eventDate: true, createdBy: true, Employee: { select: { firstNameTH: true, lastNameTH: true } } },
    }),
    prisma.employeeTimeline.count({ where: timelineWhere }),
  ]);

  const byGender = { male: 0, female: 0, other: 0, unknown: 0 };
  const byEmploymentType: Record<string, number> = { permanent: 0, dailyWage: 0, temporary: 0, contract: 0, partTime: 0, unknown: total };
  for (const group of genderCounts) {
    if (group.gender === "male") byGender.male = group._count._all;
    else if (group.gender === "female") byGender.female = group._count._all;
    else if (group.gender === "other") byGender.other = group._count._all;
    else byGender.unknown = group._count._all;
  }
  for (const group of employmentTypeCounts) {
    byEmploymentType[group.employmentType] = group._count._all;
    byEmploymentType.unknown -= group._count._all;
  }

  const branchIds = branchCounts.flatMap((group) => (group.branchId ? [group.branchId] : []));
  const creatorIds = [...new Set(timeline.map((entry) => entry.createdBy).filter((value): value is string => !!value))];
  // These two independent lookups used to run serially after the aggregate
  // queries.  Keeping them concurrent removes a database round trip from a
  // cold dashboard read without changing the returned snapshot.
  const [branches, creators] = await Promise.all([
    branchIds.length
      ? prisma.branch.findMany({ where: { id: { in: branchIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    creatorIds.length
      ? prisma.user.findMany({ where: { id: { in: creatorIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ]);
  const branchNames = new Map(branches.map((branch) => [branch.id, branch.name]));
  const creatorName = new Map(creators.map((user) => [user.id, user.name]));

  const summary = {
    total,
    byGender,
    byEmploymentType,
    byBranch: branchCounts.map((group) => ({ name: group.branchId ? (branchNames.get(group.branchId) ?? "ไม่ระบุสาขา") : "ไม่ระบุสาขา", count: group._count._all })),
    byNationality: nationalityCounts.map((group) => ({ nationality: group.nationality ?? "ไม่ระบุ", count: group._count._all })),
    history: timeline.map((entry) => ({
      id: entry.id,
      subject: `${entry.Employee.firstNameTH} ${entry.Employee.lastNameTH}`.trim(),
      by: entry.createdBy ? (creatorName.get(entry.createdBy) ?? "ระบบ") : "ระบบ",
      date: formatDate(entry.eventDate),
      note: entry.description ?? entry.title,
    })),
    historyTotal,
  };
  logSummaryTiming("db.employee_summary", startedAt);
  return summary;
}

/** The public dashboard only renders these four aggregates. Keep its hot path
 * independent from employee-history and branch queries used elsewhere. */
async function getDashboardEmployeeSummary(companyId?: string): Promise<DashboardEmployeeSummary> {
  const startedAt = performance.now();
  const activeEmployees = { deletedAt: null, ...(companyId ? { companyId } : {}) };
  const [total, genderCounts, nationalityCounts, employmentTypeCounts] = await Promise.all([
    prisma.employee.count({ where: activeEmployees }),
    prisma.employee.groupBy({ by: ["gender"], where: activeEmployees, _count: { _all: true } }),
    prisma.employee.groupBy({ by: ["nationality"], where: activeEmployees, _count: { _all: true } }),
    prisma.employment.groupBy({ by: ["employmentType"], where: { Employee: activeEmployees }, _count: { _all: true } }),
  ]);

  const byGender = { male: 0, female: 0, other: 0 };
  for (const group of genderCounts) {
    if (group.gender === "male") byGender.male = group._count._all;
    else if (group.gender === "female") byGender.female = group._count._all;
    else if (group.gender === "other") byGender.other = group._count._all;
  }

  const byEmploymentType: Record<string, number> = {};
  for (const group of employmentTypeCounts) {
    byEmploymentType[group.employmentType] = group._count._all;
  }

  const summary = {
    total,
    byGender,
    byEmploymentType,
    byNationality: nationalityCounts.map((group) => ({ nationality: group.nationality ?? "ไม่ระบุ", count: group._count._all })),
  };
  logSummaryTiming("db.dashboard_employee_summary", startedAt);
  return summary;
}

/** Tenant-scoped dashboard summary; cached only for ordinary page reads. */
export function getCachedEmployeeSummary(companyId: string | undefined, historyPage: number, fresh = false) {
  if (fresh) return getEmployeeSummary(companyId, historyPage);
  return readVersionedReadModel("workforce", "employee-summary", companyId, [String(historyPage)], 300, () =>
    getEmployeeSummary(companyId, historyPage)
  );
}

export function getCachedDashboardEmployeeSummary(companyId: string | undefined) {
  return readVersionedReadModel("workforce", "dashboard-employee-summary", companyId, [], 300, () =>
    getDashboardEmployeeSummary(companyId)
  );
}

/** Rebuilds the persistent tenant snapshot immediately after employee data changes. */
export async function refreshEmployeeSummarySnapshot(companyId: string) {
  // Employee mutations also affect the employee-based payroll dashboard.
  // Versioning invalidates every cursor/history page at once, including keys
  // held by other server instances, without a Redis key scan.
  await Promise.all([
    invalidateReadModel("workforce", companyId),
    invalidateReadModel("payroll-dashboard", companyId),
  ]);

  // Rebuild through the production read path, which writes the same
  // version-wrapped key the Dashboard uses. This makes the post-save view a
  // cache hit rather than calculating the summary a second time.
  const summary = await getCachedEmployeeSummary(companyId, 1);

  // The mutation has already paid for this aggregate. Seed the dashboard with
  // the same authoritative snapshot so its next refresh stays a cache hit.
  const dashboard: DashboardEmployeeSummary = {
    total: summary.total,
    byGender: {
      male: summary.byGender.male,
      female: summary.byGender.female,
      other: summary.byGender.other,
    },
    byEmploymentType: Object.fromEntries(
      Object.entries(summary.byEmploymentType).filter(([type, count]) => type !== "unknown" && count > 0)
    ),
    byNationality: summary.byNationality,
  };
  await seedVersionedReadModel("workforce", "dashboard-employee-summary", companyId, [], 300, dashboard);
  return summary;
}
