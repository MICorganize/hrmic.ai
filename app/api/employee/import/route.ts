import { NextResponse } from "next/server";
import type { EmploymentType, Gender, Status } from "@/generated/prisma/client";

import { getActiveCompany } from "@/lib/active-company";
import { parseEmployeeImportWorkbook, type EmployeeImportUploadRow } from "@/lib/excel/employeeImportTemplate";
import { prisma } from "@/lib/prisma";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

type ImportSummary = {
  total: number;
  inserted: number;
  updated: number;
  deleted: number;
  errors: { row: number; message: string }[];
};

type AddressLocationRecord = {
  id: string;
  nameTH: string;
  postalCode: string | null;
  District: {
    id: string;
    nameTH: string;
    Province: { id: string; nameTH: string };
  };
};

function text(row: EmployeeImportUploadRow, column: string) {
  return row.values[column]?.trim() ?? "";
}

function numberValue(value: string): number | null {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function dateValue(value: string): Date | null {
  if (!value) return null;
  const serial = Number(value);
  if (Number.isFinite(serial) && serial > 20_000) {
    return new Date(Date.UTC(1899, 11, 30 + Math.floor(serial)));
  }
  const thai = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (thai) return new Date(Date.UTC(Number(thai[3]), Number(thai[2]) - 1, Number(thai[1])));
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function gender(value: string): Gender | null {
  if (value.includes("ชาย")) return "male";
  if (value.includes("หญิง")) return "female";
  if (value.includes("อื่น")) return "other";
  return null;
}

function employmentType(value: string): EmploymentType {
  if (value.includes("รายวัน")) return "dailyWage";
  if (value.includes("พาร์ต")) return "partTime";
  if (value.includes("เหมาจ่าย")) return "contract";
  return "permanent";
}

function calculationGroup(type: EmploymentType) {
  if (type === "dailyWage") return "daily" as const;
  if (type === "partTime") return "partTime" as const;
  if (type === "contract" || type === "temporary") return "contract" as const;
  return "monthly" as const;
}

function employeeName(row: EmployeeImportUploadRow) {
  return `${text(row, "D")} ${text(row, "E")}`.trim();
}

function normalizeLocationName(value: string, prefixes: string[]) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return "";
  const prefixPattern = prefixes.map((prefix) => prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return normalized.replace(new RegExp(`^(?:${prefixPattern})\\s*`, "i"), "").trim().toLocaleLowerCase("th-TH");
}

function resolveAddressLocation(
  values: { subdistrict: string; district: string; province: string },
  locations: AddressLocationRecord[]
) {
  const subdistrict = normalizeLocationName(values.subdistrict, ["แขวง", "ตำบล"]);
  const district = normalizeLocationName(values.district, ["เขต", "อำเภอ"]);
  const province = normalizeLocationName(values.province, ["จังหวัด"]);
  if (!subdistrict || !district || !province) return null;

  const match = locations.find(
    (location) =>
      normalizeLocationName(location.nameTH, []) === subdistrict &&
      normalizeLocationName(location.District.nameTH, []) === district &&
      normalizeLocationName(location.District.Province.nameTH, []) === province
  );
  if (!match) return null;
  return {
    subdistrict: match.nameTH,
    district: match.District.nameTH,
    province: match.District.Province.nameTH,
    postalCode: match.postalCode,
    subdistrictId: match.id,
    districtId: match.District.id,
    provinceId: match.District.Province.id,
  };
}

async function nextEmployeeNumber() {
  const numbers = await prisma.employee.findMany({ select: { employeeNumber: true } });
  const max = numbers.reduce((current, { employeeNumber }) => {
    const matched = employeeNumber.match(/EMP-(\d+)/);
    return matched ? Math.max(current, Number(matched[1])) : current;
  }, 0);
  return max + 1;
}

async function importEmployees(rows: EmployeeImportUploadRow[], filename: string, companyId?: string): Promise<ImportSummary> {
  const [defaultCompany, departments, positions, locations] = await Promise.all([
    prisma.company.findFirst({ where: { deletedAt: null, ...(companyId ? { id: companyId } : {}) }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: { deletedAt: null, ...(companyId ? { companyId } : {}) }, select: { id: true, companyId: true, branchId: true, code: true, name: true } }),
    prisma.position.findMany({ where: { deletedAt: null, ...(companyId ? { companyId } : {}) }, select: { id: true, companyId: true, code: true, name: true } }),
    prisma.subdistrict.findMany({
      select: {
        id: true,
        nameTH: true,
        postalCode: true,
        District: { select: { id: true, nameTH: true, Province: { select: { id: true, nameTH: true } } } },
      },
    }),
  ]);
  if (!defaultCompany) throw new Error("ไม่พบบริษัทที่ใช้งานได้ในระบบ");

  let nextNumber = await nextEmployeeNumber();
  const summary: ImportSummary = { total: rows.length, inserted: 0, updated: 0, deleted: 0, errors: [] };

  for (const row of rows) {
    const employeeCode = text(row, "B");
    const firstNameTH = text(row, "D");
    const lastNameTH = text(row, "E");
    if (!employeeCode || !firstNameTH || !lastNameTH) {
      summary.errors.push({ row: row.sourceRow, message: "กรุณาระบุรหัสพนักงาน ชื่อ และนามสกุล" });
      continue;
    }

    try {
      const department = departments.find((item) => item.code === text(row, "BA") || item.name === text(row, "BB"))
        ?? departments.find((item) => item.companyId === defaultCompany.id);
      if (!department) throw new Error("ไม่พบหน่วยงานสำหรับบันทึกข้อมูล");
      const position = positions.find((item) => item.companyId === department.companyId && (item.code === text(row, "BG") || item.name === text(row, "BH")))
        ?? positions.find((item) => item.companyId === department.companyId);
      if (!position) throw new Error("ไม่พบตำแหน่งสำหรับบันทึกข้อมูล");

      const type = employmentType(text(row, "Q"));
      const typeDefinition = await prisma.employeeTypeDefinition.findFirst({
        where: { companyId: department.companyId, calculationGroup: calculationGroup(type), enabled: true, deletedAt: null },
        select: { id: true },
      });
      const existing = await prisma.employee.findFirst({
        where: { employeeCode, companyId: defaultCompany.id },
        include: { Employment: { select: { id: true } } },
      });
      const employeeNumber = existing?.employeeNumber ?? `EMP-${String(nextNumber++).padStart(4, "0")}`;
      const hireDate = dateValue(text(row, "AB")) ?? new Date();
      const email = text(row, "Y") || `${employeeNumber.toLowerCase()}@hrmic.local`;
      const now = new Date();
      const status: Status = text(row, "AH").toUpperCase() === "Y" ? "terminated" : "active";

      const data = {
        companyId: department.companyId,
        branchId: department.branchId,
        departmentId: department.id,
        positionId: position.id,
        employeeCode,
        title: text(row, "C") || null,
        firstNameTH,
        lastNameTH,
        firstNameEN: text(row, "U") || null,
        lastNameEN: text(row, "V") || null,
        nickname: text(row, "T") || null,
        nicknameEN: text(row, "W") || null,
        fingerprintCode: text(row, "F") || null,
        gender: gender(text(row, "G")),
        nationality: text(row, "I") || "ไทย",
        citizenId: text(row, "J") || null,
        alienIdNumber: text(row, "K") || null,
        passportNo: text(row, "L") || null,
        workPermitNo: text(row, "M") || null,
        email,
        phone: text(row, "X") || null,
        birthDate: dateValue(text(row, "Z")),
        hireDate,
        confirmationDate: dateValue(text(row, "AD")),
        terminationDate: dateValue(text(row, "AI")),
        description: text(row, "AK") || null,
        baseSalary: numberValue(text(row, "AL")) ?? 0,
        advanceLimit: numberValue(text(row, "AM")),
        paymentChannel: text(row, "AN") || null,
        companyPayoutAccount: text(row, "AO") || null,
        status,
        updatedAt: now,
      };

      const employee = existing
        ? await prisma.employee.update({ where: { id: existing.id }, data })
        : await prisma.employee.create({ data: { id: crypto.randomUUID(), employeeNumber, ...data } });

      if (existing?.Employment) {
        await prisma.employment.update({
          where: { id: existing.Employment.id },
          data: { employmentType: type, employeeTypeDefinitionId: typeDefinition?.id ?? null, updatedAt: now },
        });
      } else {
        await prisma.employment.create({
          data: { id: crypto.randomUUID(), employeeId: employee.id, employmentType: type, employeeTypeDefinitionId: typeDefinition?.id ?? null, updatedAt: now },
        });
      }

      await prisma.$transaction([
        prisma.bankAccount.deleteMany({ where: { employeeId: employee.id } }),
        prisma.address.deleteMany({ where: { employeeId: employee.id, type: { in: ["permanent", "current"] } } }),
      ]);
      const addressRows = [
        { type: "permanent" as const, addressLine: text(row, "AS"), subdistrict: text(row, "AT"), district: text(row, "AU"), province: text(row, "AV") },
        { type: "current" as const, addressLine: text(row, "AW"), subdistrict: text(row, "AX"), district: text(row, "AY"), province: text(row, "AZ") },
      ]
        .filter((address) => Object.values(address).some((value) => value && value !== address.type))
        .map((address) => {
          const location = resolveAddressLocation(address, locations);
          return {
            ...address,
            ...(location ?? {
              postalCode: null,
              subdistrictId: null,
              districtId: null,
              provinceId: null,
            }),
            subdistrict: location?.subdistrict ?? address.subdistrict,
            district: location?.district ?? address.district,
            province: location?.province ?? address.province,
          };
        });
      await Promise.all([
        ...(text(row, "AP") || text(row, "AR")
          ? [prisma.bankAccount.create({ data: { id: crypto.randomUUID(), employeeId: employee.id, bankCode: text(row, "AP"), bankName: text(row, "AP"), branchCode: text(row, "AQ") || null, accountNumber: text(row, "AR"), accountName: employeeName(row), updatedAt: now } })]
          : []),
        ...addressRows.map((address) => prisma.address.create({ data: { id: crypto.randomUUID(), employeeId: employee.id, ...address, updatedAt: now } })),
      ]);
      if (text(row, "N")) {
        await prisma.socialSecurity.upsert({
          where: { employeeId: employee.id },
          create: { id: crypto.randomUUID(), employeeId: employee.id, ssoNumber: text(row, "N"), effectiveDate: dateValue(text(row, "O")) ?? hireDate, updatedAt: now },
          update: { ssoNumber: text(row, "N"), effectiveDate: dateValue(text(row, "O")) ?? hireDate, updatedAt: now },
        });
      }
      if (text(row, "AF")) {
        await prisma.taxInformation.upsert({
          where: { employeeId: employee.id },
          create: { id: crypto.randomUUID(), employeeId: employee.id, effectiveDate: dateValue(text(row, "AF")), updatedAt: now },
          update: { effectiveDate: dateValue(text(row, "AF")), updatedAt: now },
        });
      }
      await prisma.employeeTimeline.create({
        data: { id: crypto.randomUUID(), employeeId: employee.id, eventType: existing ? "promotion" : "hire", title: existing ? "อัปเดตข้อมูลพนักงานจากการนำเข้า" : "นำเข้าข้อมูลพนักงาน", description: `นำเข้าจากไฟล์ ${filename}`, eventDate: now },
      });
      if (existing) summary.updated += 1;
      else summary.inserted += 1;
    } catch (error) {
      summary.errors.push({ row: row.sourceRow, message: error instanceof Error ? error.message : "บันทึกข้อมูลไม่สำเร็จ" });
    }
  }

  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      tenantId: defaultCompany.tenantId,
      companyId: defaultCompany.id,
      action: "insert",
      entityType: "employee_import",
      metadata: { filename, ...summary },
    },
  });
  return summary;
}

export async function GET() {
  const company = await getActiveCompany();
  const [history, employees] = await Promise.all([
    prisma.auditLog.findMany({ where: { entityType: "employee_import", ...(company ? { companyId: company.id } : {}) }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.employee.findMany({ where: { deletedAt: null, ...(company ? { companyId: company.id } : {}) }, orderBy: [{ employeeCode: "asc" }, { employeeNumber: "asc" }], take: 100, select: { id: true, employeeCode: true, employeeNumber: true, firstNameTH: true, lastNameTH: true } }),
  ]);
  return NextResponse.json({
    employees: employees.map((employee) => ({ id: employee.id, code: employee.employeeCode ?? employee.employeeNumber, name: `${employee.firstNameTH} ${employee.lastNameTH}`.trim() })),
    history: history.map((entry) => {
      const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
      return { id: entry.id, date: entry.createdAt.toLocaleString("th-TH"), total: Number(metadata.total ?? 0), inserted: Number(metadata.inserted ?? 0), updated: Number(metadata.updated ?? 0), deleted: Number(metadata.deleted ?? 0), errors: Number((metadata.errors as unknown[] | undefined)?.length ?? 0) };
    }),
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "กรุณาเลือกไฟล์ Excel" }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "ไฟล์ต้องมีขนาดไม่เกิน 10 MB" }, { status: 400 });
    if (!file.name.toLowerCase().endsWith(".xlsx")) return NextResponse.json({ error: "รองรับเฉพาะไฟล์ .xlsx" }, { status: 400 });
    const rows = parseEmployeeImportWorkbook(Buffer.from(await file.arrayBuffer()));
    const company = await getActiveCompany();
    return NextResponse.json(await importEmployees(rows, file.name, company?.id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "นำเข้าข้อมูลพนักงานไม่สำเร็จ" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { scope?: "department" | "position"; employeeIds?: string[]; targetId?: string };
    const employeeIds = [...new Set(body.employeeIds ?? [])].filter(Boolean);
    if (!body.scope || !body.targetId || employeeIds.length === 0) return NextResponse.json({ error: "กรุณาเลือกรายการและข้อมูลที่ต้องการกำหนด" }, { status: 400 });
    const company = await getActiveCompany();
    const employeeWhere = { id: { in: employeeIds }, ...(company ? { companyId: company.id } : {}) };
    if (body.scope === "position") {
      const position = await prisma.position.findFirst({ where: { id: body.targetId, deletedAt: null, ...(company ? { companyId: company.id } : {}) } });
      if (!position) return NextResponse.json({ error: "ไม่พบตำแหน่งที่เลือก" }, { status: 404 });
      await prisma.employee.updateMany({ where: employeeWhere, data: { positionId: position.id } });
    } else {
      let department = await prisma.department.findFirst({ where: { id: body.targetId, deletedAt: null, ...(company ? { companyId: company.id } : {}) } });
      if (!department) {
        const branch = await prisma.branch.findFirst({ where: { id: body.targetId, deletedAt: null, ...(company ? { companyId: company.id } : {}) } });
        if (branch) department = await prisma.department.findFirst({ where: { companyId: branch.companyId, branchId: branch.id, deletedAt: null } });
      }
      if (!department) {
        const targetCompany = await prisma.company.findFirst({ where: { id: company?.id ?? body.targetId, deletedAt: null } });
        if (targetCompany) department = await prisma.department.findFirst({ where: { companyId: targetCompany.id, deletedAt: null } });
      }
      if (!department) return NextResponse.json({ error: "ไม่พบหน่วยงานที่เลือกหรือไม่มีแผนกในหน่วยงานนั้น" }, { status: 400 });
      await prisma.employee.updateMany({ where: employeeWhere, data: { companyId: department.companyId, branchId: department.branchId, departmentId: department.id } });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "บันทึกการกำหนดข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}
