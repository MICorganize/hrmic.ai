import { NextResponse } from "next/server";
import type { Gender, MaritalStatus, EmploymentType } from "@/generated/prisma/client";

import { auth } from "@/auth";
import { getActiveCompany } from "@/lib/active-company";
import { readThroughCache } from "@/lib/cache/read-through";
import { versionedReadModelCacheKey } from "@/lib/cache/read-model-version";
import { getCachedEmployeeSummary, refreshEmployeeSummarySnapshot } from "@/lib/employee/summary";
import { effectiveEmployeeLimit, employeeCapacityMessage } from "@/lib/employee/limit";
import { toPhoneDigits } from "@/lib/phone";
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
  employeeLimit: number | null;
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

/** Next sequential employee number without scanning the Employee table. */
async function nextEmployeeNumber(): Promise<string> {
  const [row] = await prisma.$queryRaw<Array<{ value: bigint }>>`
    SELECT nextval('"Employee_employeeNumber_seq"') AS value
  `;
  return `EMP-${String(row.value).padStart(4, "0")}`;
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
  firstNameTH?: string;
  lastNameTH?: string;
  nickname?: string | null;
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

type OrganizationTreeCompany = {
  id: string;
  name: string;
  companyCode: string | null;
  Branch: Array<{ id: string; name: string; code: string; companyId: string }>;
  Department: Array<{ id: string; name: string; code: string; companyId: string; branchId: string | null }>;
};

type OrganizationEmployeeCounts = {
  company: Map<string, number>;
  branch: Map<string, number>;
  department: Map<string, number>;
};

const EMPLOYEE_TYPE_LABELS: Record<string, string> = {
  permanent: "พนักงานรายเดือน",
  dailyWage: "พนักงานรายวัน",
  partTime: "พนักงานพาร์ทไทม์",
  contract: "พนักงานเหมาจ่าย",
  temporary: "พนักงานชั่วคราว",
};

/** Builds company → branch → department → employees from real DB records. */
async function buildOrgTree(
  employees: EmployeeTreeRow[],
  companies: OrganizationTreeCompany[],
  counts?: OrganizationEmployeeCounts
): Promise<OrgTreeNode[]> {
  const branches = companies.flatMap((company) => company.Branch);
  const departments = companies.flatMap((company) => company.Department);

  const toLeaf = (e: EmployeeTreeRow): OrgTreeNode => ({
  id: e.id,
  code: e.employeeCode ?? e.employeeNumber ?? e.id,
  name: `${e.firstNameTH} ${e.lastNameTH}${e.nickname ? ` (${e.nickname})` : ""}`.trim(),
  firstNameTH: e.firstNameTH,
  lastNameTH: e.lastNameTH,
  nickname: e.nickname,
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
      count: counts?.company.get(company.id) ?? companyEmps.length,
      children: [],
    };

    if (companyBranches.length > 0) {
      for (const branch of companyBranches) {
        const branchEmps = employeesByBranch.get(branch.id) ?? [];
        const branchNode: OrgTreeNode = {
          id: branch.id,
          code: branch.code,
          name: branch.name,
          count: counts?.branch.get(branch.id) ?? branchEmps.length,
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
            count: counts?.department.get(dept.id) ?? deptEmps.length,
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
          count: counts?.department.get(dept.id) ?? deptEmps.length,
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

async function getOrganizationTree(companyId?: string, includeEmployees = false) {
  // Organization selectors only need the hierarchy. Employee leaves are
  // loaded through the cursor directory, otherwise this response becomes a
  // 500-record payload before the user has selected anything.
  const [companies, employeeCounts, employees] = await Promise.all([
    prisma.company.findMany({
      where: { deletedAt: null, ...(companyId ? { id: companyId } : {}) },
      select: {
        id: true,
        name: true,
        companyCode: true,
        Branch: {
          where: { deletedAt: null },
          select: { id: true, name: true, code: true, companyId: true },
          orderBy: { name: "asc" },
        },
        Department: {
          where: { deletedAt: null },
          select: { id: true, name: true, code: true, companyId: true, branchId: true },
          orderBy: { code: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.employee.groupBy({
      by: ["companyId", "branchId", "departmentId"],
      where: { deletedAt: null, ...(companyId ? { companyId } : {}) },
      _count: { _all: true },
    }),
    includeEmployees ? prisma.employee.findMany({
      where: { deletedAt: null, ...(companyId ? { companyId } : {}) },
      orderBy: [{ employeeCode: "asc" }, { employeeNumber: "asc" }],
      select: {
        id: true, companyId: true, branchId: true, departmentId: true,
        employeeNumber: true, employeeCode: true, firstNameTH: true, lastNameTH: true,
        nickname: true, status: true, hashtag: true,
        Position: { select: { id: true, name: true } },
        Employment: { select: { employmentType: true } },
      },
    }) : Promise.resolve([]),
  ]);

  const counts: OrganizationEmployeeCounts = {
    company: new Map(),
    branch: new Map(),
    department: new Map(),
  };
  for (const entry of employeeCounts) {
    counts.company.set(entry.companyId, (counts.company.get(entry.companyId) ?? 0) + entry._count._all);
    if (entry.branchId) counts.branch.set(entry.branchId, (counts.branch.get(entry.branchId) ?? 0) + entry._count._all);
    if (entry.departmentId) counts.department.set(entry.departmentId, (counts.department.get(entry.departmentId) ?? 0) + entry._count._all);
  }

  return buildOrgTree(employees, companies, counts);
}

async function getCachedOrganizationTree(companyId?: string, includeEmployees = false) {
  const key = await versionedReadModelCacheKey(
    "workforce",
    "employee-org-tree",
    companyId,
    includeEmployees ? "with-employees" : "structure"
  );
  return readThroughCache(
    key,
    60,
    () => getOrganizationTree(companyId, includeEmployees)
  );
}

function basicEmployeePageSize(value: string | null) {
  const requested = Number.parseInt(value ?? "100", 10);
  return Number.isFinite(requested) ? Math.min(100, Math.max(1, requested)) : 100;
}

async function getBasicEmployees(companyId?: string, cursor?: string, pageSize = 100) {
  const employeeRows = await prisma.employee.findMany({
    where: { deletedAt: null, ...(companyId ? { companyId } : {}) },
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    take: pageSize + 1,
    orderBy: [{ employeeCode: "asc" }, { employeeNumber: "asc" }, { id: "asc" }],
    select: {
      id: true, companyId: true, branchId: true, departmentId: true, title: true, firstNameTH: true, lastNameTH: true, nickname: true,
      employeeCode: true, employeeNumber: true, fingerprintCode: true, gender: true,
      maritalStatus: true, citizenId: true, alienIdNumber: true, passportNo: true,
      workPermitNo: true, birthDate: true, phone: true, email: true, hashtag: true,
      baseSalary: true, advanceType: true, advanceLimit: true, hireDate: true, confirmationDate: true,
      paymentChannel: true, companyPayoutAccount: true,
      Company: { select: { name: true } },
      Branch: { select: { name: true } },
      Department: { select: { name: true } },
      Position: { select: { name: true } },
      SocialSecurity: { select: { ssoNumber: true, calculationType: true, fixedAmount: true } },
      Employment: { select: { employmentType: true, probationDays: true } },
      TaxInformation: { select: { calculationType: true, fixedAmount: true } },
      BankAccount: {
        orderBy: { isDefault: "desc" },
        take: 1,
        select: { bankName: true, branchCode: true, accountNumber: true },
      },
    },
  });

  const genderLabels: Record<string, string> = { male: "ชาย", female: "หญิง", other: "ไม่ระบุ" };
  const maritalLabels: Record<string, string> = { single: "โสด", married: "สมรส", divorced: "หย่าร้าง", widowed: "หม้าย" };
  const hasMore = employeeRows.length > pageSize;
  const employees = (hasMore ? employeeRows.slice(0, pageSize) : employeeRows).map((employee) => ({
    id: employee.id,
    organizationIds: [employee.companyId, employee.branchId, employee.departmentId].filter((id): id is string => Boolean(id)),
    title: employee.title ?? "",
    name: `${employee.firstNameTH} ${employee.lastNameTH}${employee.nickname ? ` (${employee.nickname})` : ""}`.trim(),
    branch: employee.Branch?.name ?? "",
    department: employee.Department.name,
    division: "",
    unit: "",
    position: employee.Position.name,
    employeeCode: employee.employeeCode ?? employee.employeeNumber,
    fingerprintCode: employee.fingerprintCode ?? "",
    gender: employee.gender ? genderLabels[employee.gender] ?? "ไม่ระบุ" : "ไม่ระบุ",
    maritalStatus: employee.maritalStatus ? maritalLabels[employee.maritalStatus] ?? "" : "",
    citizenId: employee.citizenId ?? "",
    alienIdNumber: employee.alienIdNumber ?? "",
    passportNo: employee.passportNo ?? "",
    workPermitNo: employee.workPermitNo ?? "",
    socialSecurityNumber: employee.SocialSecurity?.ssoNumber ?? "",
    birthDate: employee.birthDate ? employee.birthDate.toISOString().slice(0, 10) : "",
    phone: employee.phone ?? "",
    email: employee.email ?? "",
    hashtag: employee.hashtag ?? "",
    employeeType: employee.Employment?.employmentType ? EMPLOYEE_TYPE_LABELS[employee.Employment.employmentType] ?? employee.Employment.employmentType : "",
    baseSalary: String(employee.baseSalary ?? ""),
    advanceType: employee.advanceType ?? "",
    advanceLimit: employee.advanceLimit == null ? "" : String(employee.advanceLimit),
    hireDate: employee.hireDate.toISOString().slice(0, 10),
    confirmationDate: employee.confirmationDate ? employee.confirmationDate.toISOString().slice(0, 10) : "",
    probationDays: employee.Employment?.probationDays == null ? "" : String(employee.Employment.probationDays),
    socialSecurityCalc: employee.SocialSecurity?.calculationType ?? "",
    socialSecurityFixed: employee.SocialSecurity?.fixedAmount == null ? "" : String(employee.SocialSecurity.fixedAmount),
    taxCalc: employee.TaxInformation?.calculationType ?? "",
    taxFixed: employee.TaxInformation?.fixedAmount == null ? "" : String(employee.TaxInformation.fixedAmount),
    paymentChannel: employee.paymentChannel ?? "",
    companyPayoutAccount: employee.companyPayoutAccount ?? "",
    bankName: employee.BankAccount[0]?.bankName ?? "",
    bankBranchCode: employee.BankAccount[0]?.branchCode ?? "",
    bankAccountNumber: employee.BankAccount[0]?.accountNumber ?? "",
  }));

  return { employees, nextCursor: hasMore ? employees.at(-1)?.id ?? null : null };
}

async function getCachedBasicEmployees(companyId?: string, cursor?: string, pageSize = 100) {
  const key = await versionedReadModelCacheKey(
    "workforce",
    "employee-basic-page",
    companyId,
    cursor ?? "first",
    String(pageSize)
  );
  return readThroughCache(
    key,
    30,
    () => getBasicEmployees(companyId, cursor, pageSize)
  );
}

export async function GET(request: Request) {
  const startedAt = performance.now();
  try {
    const searchParams = new URL(request.url).searchParams;
    const view = searchParams.get("view");
    const requestedCompanyId = searchParams.get("companyId")?.trim() || undefined;
    const fresh = searchParams.has("refresh");
    const historyPage = Math.max(1, Number.parseInt(searchParams.get("historyPage") ?? "1", 10) || 1);
    const activeCompany = await getActiveCompany();
    const companyId = requestedCompanyId ?? activeCompany?.id;
    if (!companyId) {
      return NextResponse.json({ error: "กรุณาเลือกบริษัทก่อนใช้งาน" }, { status: 403 });
    }
    // Responses depend on the active-company cookie, so retaining them in the
    // browser could show employees from a company selected previously.
    const headers = () => ({
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
      "Server-Timing": `employee-api;dur=${(performance.now() - startedAt).toFixed(1)}`,
    });

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
        select: { id: true, name: true, companyCode: true, employeeLimit: true },
      });
      if (!company) return NextResponse.json({ error: "คุณไม่มีสิทธิ์เข้าถึงบริษัทนี้" }, { status: 403 });
      companyScope = { id: company.id, name: company.name, code: company.companyCode, employeeLimit: company.employeeLimit };
    }

    if (view === "summary") return NextResponse.json({ ...(await getCachedEmployeeSummary(companyScope?.id, historyPage, fresh)), company: companyScope ?? null }, { headers: headers() });
    if (view === "tree") {
      const includeEmployees = searchParams.get("includeEmployees") === "1";
      return NextResponse.json(
        { orgTree: await getCachedOrganizationTree(companyScope?.id, includeEmployees), company: companyScope ?? null },
        { headers: headers() }
      );
    }
    if (view === "basic") {
      const cursor = searchParams.get("cursor")?.trim() || undefined;
      const pageSize = basicEmployeePageSize(searchParams.get("pageSize"));
      const page = await (fresh
        ? getBasicEmployees(companyScope?.id, cursor, pageSize)
        : getCachedBasicEmployees(companyScope?.id, cursor, pageSize));
      return NextResponse.json({ ...page, company: companyScope ?? null }, { headers: headers() });
    }

    // A bare GET used to serialize the complete organization tree, including
    // every employee. Keep it bounded so an accidental refresh cannot turn
    // into a 500-record payload; callers that truly need the legacy tree
    // must opt in explicitly with ?view=tree.
    return NextResponse.json(
      { ...(await getCachedEmployeeSummary(companyScope?.id, historyPage)), company: companyScope ?? null },
      { headers: headers() }
    );
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

    const employeeLimit = effectiveEmployeeLimit(company.employeeLimit);
    const employeeCount = await prisma.employee.count({
      where: { companyId: company.id, deletedAt: null },
    });
    if (employeeCount >= employeeLimit) {
      return NextResponse.json({ error: employeeCapacityMessage(employeeLimit) }, { status: 409 });
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
          phone: toPhoneDigits(String(data.phone ?? "")) || null,
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

    await refreshEmployeeSummarySnapshot(company.id);

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
