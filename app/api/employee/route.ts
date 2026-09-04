import { NextResponse } from "next/server";
import type { Gender, MaritalStatus, EmploymentType } from "@/generated/prisma/client";

import { auth } from "@/auth";
import { getActiveCompany } from "@/lib/active-company";
import { prisma } from "@/lib/prisma";

/* ---------------------------------- Maps ---------------------------------- */

const GENDER_MAP: Record<string, Gender> = {
  ชาย: "male",
  หญิง: "female",
  "ไม่ระบุ": "other",
};

const MARITAL_MAP: Record<string, MaritalStatus> = {
  โสด: "single",
  สมรส: "married",
  "หย่าร้าง": "divorced",
  หม้าย: "widowed",
};

const EMPLOYMENT_TYPE_MAP: Record<string, EmploymentType> = {
  "พนักงานรายเดือน": "permanent",
  "พนักงานรายวัน": "dailyWage",
  "พนักงานพาร์ทไทม์": "partTime",
  "พนักงานเหมาจ่าย": "contract",
};

const EMPLOYMENT_TYPE_GROUP_MAP: Record<string, EmploymentType> = {
  monthly: "permanent",
  daily: "dailyWage",
  partTime: "partTime",
  contract: "contract",
};

type CompanyScope = {
  id: string;
  name: string;
  code: string | null;
};

function hasTenantManagementRole(roles: Array<{ code: string; name: string }>) {
  return roles.some(({ code, name }) => {
    const normalizedCode = code.toLowerCase();
    const normalizedName = name.toLowerCase();
    return ["admin", "administrator", "owner", "super_admin", "superadmin"].includes(normalizedCode)
      || ["admin", "administrator", "owner", "ผู้ดูแลระบบ"].includes(normalizedName);
  });
}

/* --------------------------------- Helpers -------------------------------- */

/** Parses "mm/dd/yyyy" (form format) or anything Date accepts; empty → undefined.
 *  Built from UTC components so the stored DATE is exactly the chosen day
 *  regardless of the server's timezone. */
function parseDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const m = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const date = new Date(Date.UTC(Number(m[3]), Number(m[1]) - 1, Number(m[2])));
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Parses a numeric string ("1,234.50") into a number; empty → undefined. */
function toNumber(value: unknown): number | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const n = Number(value.replace(/,/g, ""));
  return Number.isNaN(n) ? undefined : n;
}

/** Next sequential employee number following the existing EMP-XXXX pattern. */
async function nextEmployeeNumber(): Promise<string> {
  const rows = await prisma.employee.findMany({ select: { employeeNumber: true } });
  let max = 0;
  for (const row of rows) {
    const m = row.employeeNumber?.match(/EMP-(\d+)/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `EMP-${String(max + 1).padStart(4, "0")}`;
}

/** Resolve the company by name/TH-name, falling back to the first company. */
async function findCompany(name?: string) {
  const q = name?.trim();
  if (q) {
    const exact = await prisma.company.findFirst({ where: { name: q, deletedAt: null } });
    if (exact) return exact;
    const th = await prisma.company.findFirst({ where: { companyNameTH: q, deletedAt: null } });
    if (th) return th;
    const partial = await prisma.company.findFirst({ where: { name: { contains: q }, deletedAt: null } });
    if (partial) return partial;
  }
  return prisma.company.findFirst({ where: { deletedAt: null } });
}

type OrganizationKind = "company" | "branch" | "department";

function organizationKind(value: unknown): OrganizationKind | null {
  return value === "company" || value === "branch" || value === "department" ? value : null;
}

async function resolveOrganization(data: Record<string, unknown>) {
  const id = String(data.organizationId ?? "").trim();
  const kind = organizationKind(data.organizationKind);

  if (id && kind === "company") {
    const company = await prisma.company.findFirst({ where: { id, deletedAt: null } });
    if (!company) return null;
    const department = await prisma.department.findFirst({ where: { companyId: company.id, deletedAt: null } });
    return { company, branchId: null, departmentId: department?.id };
  }

  if (id && kind === "branch") {
    const branch = await prisma.branch.findFirst({ where: { id, deletedAt: null } });
    if (!branch) return null;
    const department = await prisma.department.findFirst({
      where: { companyId: branch.companyId, branchId: branch.id, deletedAt: null },
    });
    return {
      company: await prisma.company.findFirst({ where: { id: branch.companyId, deletedAt: null } }),
      branchId: branch.id,
      departmentId: department?.id,
    };
  }

  if (id && kind === "department") {
    const department = await prisma.department.findFirst({ where: { id, deletedAt: null } });
    if (!department) return null;
    return {
      company: await prisma.company.findFirst({ where: { id: department.companyId, deletedAt: null } }),
      branchId: department.branchId,
      departmentId: department.id,
    };
  }

  const company = await findCompany(String(data.companyName ?? ""));
  if (!company) return null;
  const department = await prisma.department.findFirst({ where: { companyId: company.id, deletedAt: null } });
  return { company, branchId: null, departmentId: department?.id };
}

/* ---------------------------- Org tree (โครงสร้างองค์กร) ---------------------------- */

export type OrgTreeNode = {
  id: string;
  code: string;
  name: string;
  count?: number;
  type?: string;
  organizationIds?: string[];
  positionId?: string;
  positionName?: string;
  status?: "active" | "inactive";
  hashtag?: string | null;
  children?: OrgTreeNode[];
};

type EmployeeTreeRow = {
  id: string;
  companyId: string;
  branchId: string | null;
  departmentId: string | null;
  employeeNumber: string;
  employeeCode: string | null;
  firstNameTH: string;
  lastNameTH: string;
  nickname: string | null;
  status: string;
  hashtag: string | null;
  Position: { id: string; name: string } | null;
  Employment: { employmentType: EmploymentType } | null;
};

const EMPLOYEE_TYPE_LABELS: Record<string, string> = {
  permanent: "พนักงานรายเดือน",
  dailyWage: "พนักงานรายวัน",
  partTime: "พนักงานพาร์ทไทม์",
  contract: "พนักงานเหมาจ่าย",
  temporary: "พนักงานชั่วคราว",
};

/** Builds company → branch → department → employees from real DB records. */
async function buildOrgTree(employees: EmployeeTreeRow[], companyId?: string): Promise<OrgTreeNode[]> {
  const [companies, branches, departments] = await Promise.all([
    prisma.company.findMany({
      where: { deletedAt: null, ...(companyId ? { id: companyId } : {}) },
      select: { id: true, name: true, companyCode: true },
      orderBy: { name: "asc" },
    }),
    prisma.branch.findMany({
      where: { deletedAt: null, ...(companyId ? { companyId } : {}) },
      select: { id: true, name: true, code: true, companyId: true },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({
      where: { deletedAt: null, ...(companyId ? { companyId } : {}) },
      select: { id: true, name: true, code: true, companyId: true, branchId: true },
      // The employee selector displays department codes (D001, D002, …),
      // so order them by that visible code instead of department name.
      orderBy: { code: "asc" },
    }),
  ]);

  const toLeaf = (e: EmployeeTreeRow): OrgTreeNode => ({
    id: e.id,
    code: e.employeeCode ?? e.employeeNumber ?? e.id,
    name: `${e.firstNameTH} ${e.lastNameTH}${e.nickname ? ` (${e.nickname})` : ""}`.trim(),
  type: e.Employment?.employmentType
      ? EMPLOYEE_TYPE_LABELS[e.Employment.employmentType] ?? e.Employment.employmentType
      : undefined,
    organizationIds: [e.companyId, e.branchId, e.departmentId].filter((id): id is string => Boolean(id)),
    positionId: e.Position?.id,
    positionName: e.Position?.name,
    status: e.status === "active" ? "active" : "inactive",
    hashtag: e.hashtag,
  });

  const groupBy = <T,>(items: T[], getKey: (item: T) => string | null) => {
    const grouped = new Map<string, T[]>();
    for (const item of items) {
      const key = getKey(item);
      if (!key) continue;
      const group = grouped.get(key);
      if (group) group.push(item);
      else grouped.set(key, [item]);
    }
    return grouped;
  };
  const employeesByCompany = groupBy(employees, (employee) => employee.companyId);
  const employeesByBranch = groupBy(employees, (employee) => employee.branchId);
  const employeesByDepartment = groupBy(employees, (employee) => employee.departmentId);
  const branchesByCompany = groupBy(branches, (branch) => branch.companyId);
  const departmentsByCompany = groupBy(departments, (department) => department.companyId);

  const tree: OrgTreeNode[] = [];
  for (const company of companies) {
    const companyEmps = employeesByCompany.get(company.id) ?? [];
    const companyBranches = branchesByCompany.get(company.id) ?? [];
    const companyDepts = departmentsByCompany.get(company.id) ?? [];
    const deptIdSet = new Set(companyDepts.map((d) => d.id));

    const node: OrgTreeNode = {
      id: company.id,
      code: company.companyCode ?? company.id,
      name: company.name,
      count: companyEmps.length,
      children: [],
    };

    if (companyBranches.length > 0) {
      for (const branch of companyBranches) {
        const branchEmps = employeesByBranch.get(branch.id) ?? [];
        const branchNode: OrgTreeNode = {
          id: branch.id,
          code: branch.code,
          name: branch.name,
          count: branchEmps.length,
          children: [],
        };
        const branchDepts = companyDepts.filter(
          (d) => d.branchId === branch.id || (d.branchId === null && companyBranches.length === 1)
        );
        for (const dept of branchDepts) {
          const deptEmps = employeesByDepartment.get(dept.id) ?? [];
          branchNode.children!.push({
            id: dept.id,
            code: dept.code,
            name: dept.name,
            count: deptEmps.length,
            children: deptEmps.map(toLeaf),
          });
        }
        // พนักงานในสาขาที่ไม่มีแผนก (หรือแผนกไม่ตรงกับในระบบ)
        branchNode.children!.push(
          ...branchEmps.filter((e) => !e.departmentId || !deptIdSet.has(e.departmentId)).map(toLeaf)
        );
        node.children!.push(branchNode);
      }
    } else {
      for (const dept of companyDepts) {
        const deptEmps = employeesByDepartment.get(dept.id) ?? [];
        node.children!.push({
          id: dept.id,
          code: dept.code,
          name: dept.name,
          count: deptEmps.length,
          children: deptEmps.map(toLeaf),
        });
      }
      node.children!.push(
        ...companyEmps.filter((e) => !e.departmentId || !deptIdSet.has(e.departmentId)).map(toLeaf)
      );
    }
    tree.push(node);
  }
  return tree;
}

/* ---------------------------------- Route --------------------------------- */

/** Formats a DATE (returned at UTC midnight) as dd/mm/yyyy. */
function formatDate(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${date.getUTCFullYear()}`;
}

async function getEmployeeSummary(companyId?: string) {
  // Keep the dashboard payload small. The organisation tree contains every
  // employee and is fetched only when the employee picker is opened.
  const activeEmployees = { deletedAt: null, ...(companyId ? { companyId } : {}) };
  const [total, genderCounts, nationalityCounts, branchCounts, employmentTypeCounts, timeline] = await Promise.all([
    prisma.employee.count({ where: activeEmployees }),
    prisma.employee.groupBy({ by: ["gender"], where: activeEmployees, _count: { _all: true } }),
    prisma.employee.groupBy({ by: ["nationality"], where: activeEmployees, _count: { _all: true } }),
    prisma.employee.groupBy({ by: ["branchId"], where: activeEmployees, _count: { _all: true } }),
    prisma.employment.groupBy({
      by: ["employmentType"],
      where: { Employee: activeEmployees },
      _count: { _all: true },
    }),
    prisma.employeeTimeline.findMany({
      where: { Employee: activeEmployees },
      orderBy: { eventDate: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        description: true,
        eventDate: true,
        createdBy: true,
        Employee: { select: { firstNameTH: true, lastNameTH: true } },
      },
    }),
  ]);

  const byGender = { male: 0, female: 0, other: 0, unknown: 0 };
  const byEmploymentType: Record<string, number> = {
    permanent: 0,
    dailyWage: 0,
    temporary: 0,
    contract: 0,
    partTime: 0,
    unknown: total,
  };

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
  const branches = branchIds.length
    ? await prisma.branch.findMany({ where: { id: { in: branchIds } }, select: { id: true, name: true } })
    : [];
  const branchNames = new Map(branches.map((branch) => [branch.id, branch.name]));

  const creatorIds = [...new Set(timeline.map((entry) => entry.createdBy).filter((value): value is string => !!value))];
  const creators = creatorIds.length
    ? await prisma.user.findMany({ where: { id: { in: creatorIds } }, select: { id: true, name: true } })
    : [];
  const creatorName = new Map(creators.map((user) => [user.id, user.name]));

  return {
    total,
    byGender,
    byEmploymentType,
    byBranch: branchCounts.map((group) => ({
      name: group.branchId ? (branchNames.get(group.branchId) ?? "ไม่ระบุสาขา") : "ไม่ระบุสาขา",
      count: group._count._all,
    })),
    byNationality: nationalityCounts.map((group) => ({
      nationality: group.nationality ?? "ไม่ระบุ",
      count: group._count._all,
    })),
    history: timeline.map((entry) => ({
      id: entry.id,
      subject: `${entry.Employee.firstNameTH} ${entry.Employee.lastNameTH}`.trim(),
      by: entry.createdBy ? (creatorName.get(entry.createdBy) ?? "ระบบ") : "ระบบ",
      date: formatDate(entry.eventDate),
      note: entry.description ?? entry.title,
    })),
  };
}

async function getOrganizationTree(companyId?: string) {
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null, ...(companyId ? { companyId } : {}) },
    orderBy: [{ employeeCode: "asc" }, { employeeNumber: "asc" }],
    select: {
      id: true,
      companyId: true,
      branchId: true,
      departmentId: true,
      employeeNumber: true,
      employeeCode: true,
      firstNameTH: true,
      lastNameTH: true,
      nickname: true,
      status: true,
      hashtag: true,
      Position: { select: { id: true, name: true } },
      Employment: { select: { employmentType: true } },
    },
  });

  return buildOrgTree(employees, companyId);
}

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const view = searchParams.get("view");
    const requestedCompanyId = searchParams.get("companyId")?.trim() || undefined;
    const activeCompany = await getActiveCompany();
    const companyId = requestedCompanyId ?? activeCompany?.id;
    const headers = { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" };

    let companyScope: CompanyScope | undefined = !requestedCompanyId || requestedCompanyId === activeCompany?.id ? activeCompany ?? undefined : undefined;
    if (companyId && !companyScope) {
      const session = await auth();
      if (!session?.user?.id) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" }, { status: 401 });

      const user = await prisma.user.findFirst({
        where: { id: session.user.id, status: "active", deletedAt: null },
        select: { id: true, tenantId: true, UserRole: { select: { Role: { select: { code: true, name: true } } } } },
      });
      if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" }, { status: 401 });

      const isTenantAdmin = hasTenantManagementRole(user.UserRole.map(({ Role }) => Role));
      const company = await prisma.company.findFirst({
        where: {
          id: companyId,
          tenantId: user.tenantId,
          deletedAt: null,
          ...(isTenantAdmin ? {} : { UserCompanyAccess: { some: { userId: user.id } } }),
        },
        select: { id: true, name: true, companyCode: true },
      });
      if (!company) return NextResponse.json({ error: "คุณไม่มีสิทธิ์เข้าถึงบริษัทนี้" }, { status: 403 });
      companyScope = { id: company.id, name: company.name, code: company.companyCode };
    }

    if (view === "summary") return NextResponse.json({ ...(await getEmployeeSummary(companyScope?.id)), company: companyScope ?? null }, { headers });
    if (view === "tree") return NextResponse.json({ orgTree: await getOrganizationTree(companyScope?.id), company: companyScope ?? null }, { headers });

    // Preserve the original response for any existing callers while new pages
    // opt into the much smaller, task-specific payloads above.
    const [summary, orgTree] = await Promise.all([getEmployeeSummary(companyScope?.id), getOrganizationTree(companyScope?.id)]);
    return NextResponse.json({ ...summary, orgTree, company: companyScope ?? null }, { headers });
  } catch (err) {
    console.error("GET /api/employee failed:", err);
    return NextResponse.json({ error: "ไม่สามารถโหลดข้อมูลพนักงานได้" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const data = body ?? {};

    // Required by the schema — validate the human-entered essentials.
    if (!String(data.firstNameTH ?? "").trim() || !String(data.lastNameTH ?? "").trim()) {
      return NextResponse.json({ error: "กรุณากรอกชื่อและนามสกุล" }, { status: 400 });
    }

    // Resolve the selected organization tree node into employee foreign keys.
    const organization = await resolveOrganization(data);
    const company = organization?.company;
    if (!company) {
      return NextResponse.json({ error: "ไม่พบบริษัทในระบบ กรุณาตรวจสอบโครงสร้างองค์กร" }, { status: 400 });
    }
    const activeCompany = await getActiveCompany();
    if (activeCompany && company.id !== activeCompany.id) {
      return NextResponse.json({ error: "ไม่สามารถเพิ่มพนักงานนอกบริษัทที่กำลังใช้งานได้" }, { status: 403 });
    }
    const branchId = organization.branchId;
    const departmentId = organization.departmentId;
    const selectedPositionId = String(data.positionId ?? "").trim();
    const position = selectedPositionId
      ? await prisma.position.findFirst({ where: { id: selectedPositionId, companyId: company.id, deletedAt: null } })
      : String(data.positionName ?? "").trim()
        ? await prisma.position.findFirst({ where: { name: String(data.positionName).trim(), companyId: company.id, deletedAt: null } })
        : null;
    const positionId =
      position?.id ?? (await prisma.position.findFirst({ where: { companyId: company.id } }))?.id;

    if (!departmentId || !positionId) {
      return NextResponse.json(
        { error: "ไม่พบแผนกหรือตำแหน่งในระบบ กรุณาตรวจสอบโครงสร้างองค์กร" },
        { status: 400 }
      );
    }

    // The selected type is a company-scoped persistent record.  Do not trust a
    // client-provided display label: only an enabled, non-deleted DB definition
    // can be assigned to a new employee.
    const employeeTypeDefinitionId = String(data.employeeTypeDefinitionId ?? "").trim();
    const employeeTypeDefinition = employeeTypeDefinitionId
      ? await prisma.employeeTypeDefinition.findFirst({
          where: {
            id: employeeTypeDefinitionId,
            companyId: company.id,
            enabled: true,
            deletedAt: null,
          },
          select: { id: true, calculationGroup: true },
        })
      : null;
    if (!employeeTypeDefinition) {
      return NextResponse.json({ error: "กรุณาเลือกประเภทพนักงานที่ใช้งานได้" }, { status: 400 });
    }

    const employeeNumber = await nextEmployeeNumber();
    const email =
      String(data.email ?? "").trim() || `${employeeNumber.toLowerCase()}@hrmic.local`;
    const hireDate = parseDate(data.hireDate) ?? new Date();
    const baseSalary = toNumber(data.wage) ?? 0;
    const fullName = `${String(data.firstNameTH ?? "").trim()} ${String(data.lastNameTH ?? "").trim()}`.trim();
    // These tables have no DB defaults for id/updatedAt — the app supplies them.
    const newId = () => crypto.randomUUID();
    const now = new Date();

    const employee = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.create({
        data: {
          id: newId(),
          updatedAt: now,
          companyId: company.id,
          branchId,
          departmentId,
          positionId,
          employeeNumber,
          employeeCode: String(data.employeeCode ?? "").trim() || null,
          title: String(data.title ?? "").trim() || null,
          firstNameTH: String(data.firstNameTH ?? "").trim(),
          lastNameTH: String(data.lastNameTH ?? "").trim(),
          gender: GENDER_MAP[String(data.gender ?? "")] ?? null,
          email,
          phone: String(data.phone ?? "").trim() || null,
          hireDate,
          baseSalary,
          birthDate: parseDate(data.birthDate) ?? null,
          citizenId: String(data.citizenId ?? "").trim() || null,
          firstNameEN: String(data.firstNameEN ?? "").trim() || null,
          lastNameEN: String(data.lastNameEN ?? "").trim() || null,
          maritalStatus: MARITAL_MAP[String(data.maritalStatus ?? "")] ?? null,
          nationality: String(data.nationality ?? "").trim() || "ไทย",
          nickname: String(data.nickname ?? "").trim() || null,
          passportNo: String(data.passportNo ?? "").trim() || null,
          probationDate: parseDate(data.probationDate) ?? null,
          confirmationDate: parseDate(data.confirmationDate) ?? null,
          // เพิ่มจากฟอร์ม (คอลัมน์ใหม่)
          fingerprintCode: String(data.fingerprintCode ?? "").trim() || null,
          nicknameEN: String(data.nicknameEN ?? "").trim() || null,
          alienIdNumber: String(data.alienIdNumber ?? "").trim() || null,
          workPermitNo: String(data.workPermitNo ?? "").trim() || null,
          advanceType: String(data.advanceType ?? "").trim() || null,
          advanceLimit: toNumber(data.advanceLimit) ?? null,
          retirementDate: parseDate(data.retirementDate) ?? null,
          paymentChannel: String(data.paymentChannel ?? "").trim() || null,
          companyPayoutAccount: String(data.companyPayoutAccount ?? "").trim() || null,
          description: String(data.description ?? "").trim() || null,
          hashtag: String(data.hashtag ?? "").trim() || null,
        },
      });

      // ประเภทพนักงาน + ระยะเวลาทดลองงาน
      await tx.employment.create({
        data: {
          id: newId(),
          updatedAt: now,
          employeeId: emp.id,
          employeeTypeDefinitionId: employeeTypeDefinition.id,
          employmentType:
            EMPLOYMENT_TYPE_GROUP_MAP[employeeTypeDefinition.calculationGroup] ??
            EMPLOYMENT_TYPE_MAP[String(data.employmentTypeName ?? "")] ??
            "permanent",
          probationDays: toNumber(data.probationDays) ?? 119,
        },
      });

      // ข้อมูลธนาคาร
      if (String(data.bankName ?? "").trim() || String(data.bankAccountNumber ?? "").trim()) {
        await tx.bankAccount.create({
          data: {
            id: newId(),
            updatedAt: now,
            employeeId: emp.id,
            bankCode: String(data.bankName ?? "").trim(),
            bankName: String(data.bankName ?? "").trim(),
            accountNumber: String(data.bankAccountNumber ?? "").trim(),
            accountName: fullName,
            branchCode: String(data.bankBranchCode ?? "").trim() || null,
          },
        });
      }

      // ประกันสังคม
      if (
        String(data.socialSecurityNumber ?? "").trim() ||
        String(data.socialSecurityCalc ?? "").trim() ||
        String(data.socialSecurityFixed ?? "").trim() ||
        String(data.socialSecurityStart ?? "").trim()
      ) {
        await tx.socialSecurity.create({
          data: {
            id: newId(),
            updatedAt: now,
            employeeId: emp.id,
            ssoNumber: String(data.socialSecurityNumber ?? "").trim(),
            effectiveDate: parseDate(data.socialSecurityStart) ?? hireDate,
            calculationType: String(data.socialSecurityCalc ?? "").trim() || null,
            fixedAmount: toNumber(data.socialSecurityFixed) ?? null,
          },
        });
      }

      // ภาษี
      if (
        String(data.taxCalc ?? "").trim() ||
        String(data.taxFixed ?? "").trim() ||
        String(data.taxStart ?? "").trim()
      ) {
        await tx.taxInformation.create({
          data: {
            id: newId(),
            updatedAt: now,
            employeeId: emp.id,
            calculationType: String(data.taxCalc ?? "").trim() || null,
            fixedAmount: toNumber(data.taxFixed) ?? null,
            effectiveDate: parseDate(data.taxStart) ?? null,
          },
        });
      }

      // สัญญาจ้าง (วันที่หมดสัญญาจ้าง)
      if (String(data.contractEndDate ?? "").trim()) {
        await tx.contract.create({
          data: {
            id: newId(),
            updatedAt: now,
            employeeId: emp.id,
            startDate: hireDate,
            endDate: parseDate(data.contractEndDate) ?? null,
          },
        });
      }

      return emp;
    });

    return NextResponse.json(
      {
        id: employee.id,
        employeeCode: employee.employeeCode,
        employeeNumber: employee.employeeNumber,
        email,
      },
      { status: 201 }
    );
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "P2002") {
      const target = (err as { meta?: { target?: string[] } }).meta?.target;
      return NextResponse.json(
        { error: `ข้อมูลซ้ำในระบบ (${target?.join(", ") ?? "รายการ"})` },
        { status: 409 }
      );
    }
    console.error("POST /api/employee failed:", err);
    return NextResponse.json({ error: "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
