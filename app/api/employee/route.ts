import { NextResponse } from "next/server";
import type { Gender, MaritalStatus, EmploymentType } from "@/generated/prisma/client";

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
async function buildOrgTree(employees: EmployeeTreeRow[]): Promise<OrgTreeNode[]> {
  const [companies, branches, departments] = await Promise.all([
    prisma.company.findMany({
      select: { id: true, name: true, companyCode: true },
      orderBy: { name: "asc" },
    }),
    prisma.branch.findMany({
      select: { id: true, name: true, code: true, companyId: true },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({
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

  const tree: OrgTreeNode[] = [];
  for (const company of companies) {
    const companyEmps = employees.filter((e) => e.companyId === company.id);
    const companyBranches = branches.filter((b) => b.companyId === company.id);
    const companyDepts = departments.filter((d) => d.companyId === company.id);
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
        const branchEmps = companyEmps.filter((e) => e.branchId === branch.id);
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
          const deptEmps = branchEmps.filter((e) => e.departmentId === dept.id);
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
        const deptEmps = companyEmps.filter((e) => e.departmentId === dept.id);
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

export async function GET() {
  try {
    const employees = await prisma.employee.findMany({
      where: { deletedAt: null }, // Exclude soft-deleted employees
      // Preserve this order when employees are grouped into the selector tree,
      // so sibling employees appear D001 → D002 → D004 from top to bottom.
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
        gender: true,
        nationality: true,
        status: true,
        hashtag: true,
        Branch: { select: { name: true } },
        Position: { select: { id: true, name: true } },
        Employment: { select: { employmentType: true } },
      },
    });

    const byGender = { male: 0, female: 0, other: 0, unknown: 0 };
    const byEmploymentType: Record<string, number> = {
      permanent: 0,
      dailyWage: 0,
      temporary: 0,
      contract: 0,
      partTime: 0,
      unknown: 0,
    };
    const branchMap = new Map<string, number>();
    const nationalityMap = new Map<string, number>();

    for (const emp of employees) {
      if (emp.gender === "male") byGender.male++;
      else if (emp.gender === "female") byGender.female++;
      else if (emp.gender === "other") byGender.other++;
      else byGender.unknown++;

      const type = emp.Employment?.employmentType;
      byEmploymentType[type ?? "unknown"]++;

      const branch = emp.Branch?.name ?? "ไม่ระบุสาขา";
      branchMap.set(branch, (branchMap.get(branch) ?? 0) + 1);

      const nat = emp.nationality ?? "ไม่ระบุ";
      nationalityMap.set(nat, (nationalityMap.get(nat) ?? 0) + 1);
    }

    const byBranch = [...branchMap.entries()].map(([name, count]) => ({ name, count }));
    const byNationality = [...nationalityMap.entries()].map(([nationality, count]) => ({
      nationality,
      count,
    }));

    // ประวัติการแก้ไขข้อมูลพนักงาน
    const timeline = await prisma.employeeTimeline.findMany({
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
    });
    const creatorIds = [...new Set(timeline.map((t) => t.createdBy).filter((v): v is string => !!v))];
    const creators = creatorIds.length
      ? await prisma.user.findMany({ where: { id: { in: creatorIds } }, select: { id: true, name: true } })
      : [];
    const creatorName = new Map(creators.map((u) => [u.id, u.name]));
    const history = timeline.map((t) => ({
      id: t.id,
      subject: `${t.Employee.firstNameTH} ${t.Employee.lastNameTH}`.trim(),
      by: t.createdBy ? (creatorName.get(t.createdBy) ?? "ระบบ") : "ระบบ",
      date: formatDate(t.eventDate),
      note: t.description ?? t.title,
    }));

    const orgTree = await buildOrgTree(employees);

    return NextResponse.json({
      total: employees.length,
      byGender,
      byEmploymentType,
      byBranch,
      byNationality,
      history,
      orgTree,
    });
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
