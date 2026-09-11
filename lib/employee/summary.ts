import "server-only";

import { Prisma } from "@/generated/prisma/client";
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
  type AggregateRow = { kind: "total" | "gender" | "nationality" | "branch" | "employmentType"; key: string; count: number };
  type TimelineRow = { id: string; title: string; description: string | null; eventDate: Date; firstNameTH: string; lastNameTH: string; creatorName: string | null; historyTotal: number };
  const companyFilter = companyId ? Prisma.sql`AND e."companyId" = ${companyId}::uuid` : Prisma.empty;
  const timelineCompanyFilter = companyId ? Prisma.sql`AND employee."companyId" = ${companyId}::uuid` : Prisma.empty;
  const offset = Math.max(0, historyPage - 1) * historyPageSize;

  // Keep the two independent result sets concurrent. Aggregates share one
  // filtered CTE; history joins employee/creator names and its total in the
  // same statement, reducing the old 9-query cold read to 2 round trips.
  const [aggregates, timeline] = await Promise.all([
    prisma.$queryRaw<AggregateRow[]>(Prisma.sql`
      WITH filtered_employees AS (
        SELECT e."id", e."gender"::text AS gender, e."nationality", e."branchId"
        FROM "Employee" e
        WHERE e."deletedAt" IS NULL ${companyFilter}
      )
      SELECT 'total'::text AS kind, 'total'::text AS key, COUNT(*)::int AS count FROM filtered_employees
      UNION ALL
      SELECT 'gender'::text, COALESCE(gender, 'unknown'), COUNT(*)::int FROM filtered_employees GROUP BY gender
      UNION ALL
      SELECT 'nationality'::text, COALESCE("nationality", 'ไม่ระบุ'), COUNT(*)::int FROM filtered_employees GROUP BY "nationality"
      UNION ALL
      SELECT 'branch'::text, COALESCE(branch."name", 'ไม่ระบุสาขา'), COUNT(*)::int
      FROM filtered_employees employee LEFT JOIN "Branch" branch ON branch."id" = employee."branchId"
      GROUP BY branch."id", branch."name"
      UNION ALL
      SELECT 'employmentType'::text, employment."employmentType"::text, COUNT(*)::int
      FROM "Employment" employment INNER JOIN filtered_employees employee ON employee."id" = employment."employeeId"
      GROUP BY employment."employmentType"
    `),
    prisma.$queryRaw<TimelineRow[]>(Prisma.sql`
      SELECT timeline."id", timeline."title", timeline."description", timeline."eventDate",
             employee."firstNameTH", employee."lastNameTH", creator."name" AS "creatorName",
             COUNT(*) OVER()::int AS "historyTotal"
      FROM "EmployeeTimeline" timeline
      INNER JOIN "Employee" employee ON employee."id" = timeline."employeeId"
      LEFT JOIN "User" creator ON creator."id" = timeline."createdBy"
      WHERE employee."deletedAt" IS NULL ${timelineCompanyFilter}
      ORDER BY timeline."eventDate" DESC, timeline."createdAt" DESC
      LIMIT ${historyPageSize} OFFSET ${offset}
    `),
  ]);

  const total = aggregates.find((row) => row.kind === "total")?.count ?? 0;
  const genderCounts = aggregates.filter((row) => row.kind === "gender");
  const nationalityCounts = aggregates.filter((row) => row.kind === "nationality");
  const branchCounts = aggregates.filter((row) => row.kind === "branch");
  const employmentTypeCounts = aggregates.filter((row) => row.kind === "employmentType");

  const byGender = { male: 0, female: 0, other: 0, unknown: 0 };
  const byEmploymentType: Record<string, number> = { permanent: 0, dailyWage: 0, temporary: 0, contract: 0, partTime: 0, unknown: total };
  for (const group of genderCounts) {
    if (group.key === "male") byGender.male = group.count;
    else if (group.key === "female") byGender.female = group.count;
    else if (group.key === "other") byGender.other = group.count;
    else byGender.unknown = group.count;
  }
  for (const group of employmentTypeCounts) {
    byEmploymentType[group.key] = group.count;
    byEmploymentType.unknown -= group.count;
  }

  const summary = {
    total,
    byGender,
    byEmploymentType,
    byBranch: branchCounts.map((group) => ({ name: group.key, count: group.count })),
    byNationality: nationalityCounts.map((group) => ({ nationality: group.key, count: group.count })),
    history: timeline.map((entry) => ({
      id: entry.id,
      subject: `${entry.firstNameTH} ${entry.lastNameTH}`.trim(),
      by: entry.creatorName ?? "ระบบ",
      date: formatDate(entry.eventDate),
      note: entry.description ?? entry.title,
    })),
    historyTotal: timeline[0]?.historyTotal ?? 0,
  };
  logSummaryTiming("db.employee_summary", startedAt);
  return summary;
}

/** The public dashboard only renders these four aggregates. Keep its hot path
 * independent from employee-history and branch queries used elsewhere. */
async function getDashboardEmployeeSummary(companyId?: string): Promise<DashboardEmployeeSummary> {
  const startedAt = performance.now();
  type AggregateRow = { kind: "total" | "gender" | "nationality" | "employmentType"; key: string; count: number };
  const companyFilter = companyId ? Prisma.sql`AND e."companyId" = ${companyId}::uuid` : Prisma.empty;

  // A single PostgreSQL statement replaces four independent ORM round trips.
  // The filtered CTE applies the tenant/deleted scope once and every returned
  // count is cast to int so the RSC/JSON projection stays serializable.
  const rows = await prisma.$queryRaw<AggregateRow[]>(Prisma.sql`
    WITH filtered_employees AS (
      SELECT e."id", e."gender"::text AS gender, e."nationality"
      FROM "Employee" e
      WHERE e."deletedAt" IS NULL ${companyFilter}
    )
    SELECT 'total'::text AS kind, 'total'::text AS key, COUNT(*)::int AS count
    FROM filtered_employees
    UNION ALL
    SELECT 'gender'::text, COALESCE(gender, 'unknown'), COUNT(*)::int
    FROM filtered_employees
    GROUP BY gender
    UNION ALL
    SELECT 'nationality'::text, COALESCE("nationality", 'ไม่ระบุ'), COUNT(*)::int
    FROM filtered_employees
    GROUP BY "nationality"
    UNION ALL
    SELECT 'employmentType'::text, employment."employmentType"::text, COUNT(*)::int
    FROM "Employment" employment
    INNER JOIN filtered_employees employee ON employee."id" = employment."employeeId"
    GROUP BY employment."employmentType"
  `);

  const total = rows.find((row) => row.kind === "total")?.count ?? 0;
  const genderCounts = rows.filter((row) => row.kind === "gender");
  const nationalityCounts = rows.filter((row) => row.kind === "nationality");
  const employmentTypeCounts = rows.filter((row) => row.kind === "employmentType");

  const byGender = { male: 0, female: 0, other: 0 };
  for (const group of genderCounts) {
    if (group.key === "male") byGender.male = group.count;
    else if (group.key === "female") byGender.female = group.count;
    else if (group.key === "other") byGender.other = group.count;
  }

  const byEmploymentType: Record<string, number> = {};
  for (const group of employmentTypeCounts) {
    byEmploymentType[group.key] = group.count;
  }

  const summary = {
    total,
    byGender,
    byEmploymentType,
    byNationality: nationalityCounts.map((group) => ({ nationality: group.key, count: group.count })),
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
