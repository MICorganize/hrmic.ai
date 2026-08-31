import { readFile } from "node:fs/promises";
import path from "node:path";

import { buildEmployeeImportTemplate, type EmployeeImportRow } from "@/lib/excel/employeeImportTemplate";
import { prisma } from "@/lib/prisma";

const EMPLOYEE_TYPE_VALUES: Record<string, { type: string; group: string }> = {
  permanent: { type: "01-พนักงานรายเดือน", group: "ET0001-พนักงานรายเดือน" },
  dailyWage: { type: "02-พนักงานรายวัน", group: "ET0004-พนักงานรายวัน" },
  partTime: { type: "03-พนักงานพาร์ตไทม์", group: "ET0007-พนักงานพาร์ตไทม์" },
  contract: { type: "04-พนักงานเหมาจ่าย", group: "ET00010-พนักงานเหมาจ่าย" },
  temporary: { type: "04-พนักงานเหมาจ่าย", group: "ET00010-พนักงานเหมาจ่าย" },
};

function asText(value: unknown): string {
  return value == null ? "" : String(value);
}

function asNumber(value: unknown): number | null {
  if (value == null) return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function genderLabel(gender: string | null): string {
  if (gender === "male") return "ชาย";
  if (gender === "female") return "หญิง";
  return "ไม่ระบุ";
}

function isThai(nationality: string | null): boolean {
  const value = nationality?.trim().toLowerCase();
  return !value || value === "ไทย" || value === "th" || value === "thai";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId")?.trim();
    const organizationFilter = organizationId
      ? await (async () => {
          const company = await prisma.company.findFirst({ where: { id: organizationId, deletedAt: null }, select: { id: true } });
          if (company) return { companyId: company.id };
          const branch = await prisma.branch.findFirst({ where: { id: organizationId, deletedAt: null }, select: { id: true } });
          if (branch) return { branchId: branch.id };
          const department = await prisma.department.findFirst({ where: { id: organizationId, deletedAt: null }, select: { id: true } });
          return department ? { departmentId: department.id } : { id: organizationId };
        })()
      : {};
    const employees = await prisma.employee.findMany({
      where: {
        deletedAt: null,
        ...organizationFilter,
      },
      orderBy: [{ employeeCode: "asc" }, { employeeNumber: "asc" }],
      select: {
        employeeNumber: true,
        employeeCode: true,
        title: true,
        firstNameTH: true,
        lastNameTH: true,
        fingerprintCode: true,
        gender: true,
        nationality: true,
        citizenId: true,
        alienIdNumber: true,
        passportNo: true,
        workPermitNo: true,
        nickname: true,
        firstNameEN: true,
        lastNameEN: true,
        nicknameEN: true,
        phone: true,
        email: true,
        birthDate: true,
        hireDate: true,
        confirmationDate: true,
        terminationDate: true,
        description: true,
        baseSalary: true,
        advanceLimit: true,
        paymentChannel: true,
        companyPayoutAccount: true,
        Department: { select: { code: true, name: true } },
        Position: { select: { code: true, name: true } },
        Employment: { select: { employmentType: true } },
        BankAccount: {
          where: { isDefault: true },
          take: 1,
          select: { bankCode: true, branchCode: true, accountNumber: true },
        },
        SocialSecurity: { select: { ssoNumber: true, effectiveDate: true } },
        TaxInformation: { select: { effectiveDate: true } },
        Address: {
          select: { type: true, addressLine: true, subdistrict: true, district: true, province: true },
        },
      },
    });

    const rows: EmployeeImportRow[] = employees.map((employee) => {
      const permanent = employee.Address.find((address) => address.type === "permanent");
      const current = employee.Address.find((address) => address.type === "current");
      const employeeType = EMPLOYEE_TYPE_VALUES[employee.Employment?.employmentType ?? "permanent"] ?? EMPLOYEE_TYPE_VALUES.permanent;
      const thai = isThai(employee.nationality);
      const bank = employee.BankAccount[0];

      return {
        employeeCode: employee.employeeCode ?? employee.employeeNumber,
        title: asText(employee.title),
        firstNameTH: employee.firstNameTH,
        lastNameTH: employee.lastNameTH,
        fingerprintCode: employee.fingerprintCode ?? employee.employeeCode ?? employee.employeeNumber,
        gender: genderLabel(employee.gender),
        foreigner: thai ? "N-ไทย" : "Y-ต่างชาติ",
        nationality: thai ? "TH" : asText(employee.nationality),
        citizenId: asText(employee.citizenId),
        alienIdNumber: asText(employee.alienIdNumber),
        passportNo: asText(employee.passportNo),
        workPermitNo: asText(employee.workPermitNo),
        socialSecurityNumber: asText(employee.SocialSecurity?.ssoNumber),
        socialSecurityStartDate: employee.SocialSecurity?.effectiveDate ?? null,
        employeeType: employeeType.type,
        employeeTypeGroup: employeeType.group,
        payrollRound: "Full-เต็มเดือน",
        nickname: asText(employee.nickname),
        firstNameEN: asText(employee.firstNameEN),
        lastNameEN: asText(employee.lastNameEN),
        nicknameEN: asText(employee.nicknameEN),
        phone: asText(employee.phone),
        email: employee.email,
        birthDate: employee.birthDate,
        hireDate: employee.hireDate,
        confirmationDate: employee.confirmationDate,
        taxStartDate: employee.TaxInformation?.effectiveDate ?? null,
        signedOut: employee.terminationDate ? "Y" : "N",
        signoutDate: employee.terminationDate,
        signoutRemark: employee.terminationDate ? asText(employee.description) : "",
        salary: asNumber(employee.baseSalary),
        advanceLimit: asNumber(employee.advanceLimit),
        paymentMethod: asText(employee.paymentChannel),
        companyPayoutAccount: asText(employee.companyPayoutAccount),
        bankCode: asText(bank?.bankCode),
        bankBranchCode: asText(bank?.branchCode),
        bankAccountNumber: asText(bank?.accountNumber),
        permanentAddress: asText(permanent?.addressLine),
        permanentSubdistrict: asText(permanent?.subdistrict),
        permanentDistrict: asText(permanent?.district),
        permanentProvince: asText(permanent?.province),
        currentAddress: asText(current?.addressLine),
        currentSubdistrict: asText(current?.subdistrict),
        currentDistrict: asText(current?.district),
        currentProvince: asText(current?.province),
        departmentCode: employee.Department.code,
        departmentName: employee.Department.name,
        divisionCode: "",
        divisionName: "",
        sectionCode: "",
        sectionName: "",
        positionCode: employee.Position.code,
        positionName: employee.Position.name,
        onboarding: "Y",
        salaryCalculation: "",
        overtimeRound: "",
        worktimeRound: "",
      };
    });

    const baseTemplate = await readFile(
      path.join(process.cwd(), "public", "templates", ".employee-import-populated-base.xlsx")
    );
    const workbook = buildEmployeeImportTemplate(baseTemplate, rows);
    const body = new ArrayBuffer(workbook.byteLength);
    new Uint8Array(body).set(workbook);
    return new Response(body, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="Template Employee.xlsx"; filename*=UTF-8\'\'Template%20Employee.xlsx',
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("GET /api/employee/import-template failed:", error);
    return Response.json({ error: "ไม่สามารถสร้างเทมเพลตข้อมูลพนักงานได้" }, { status: 500 });
  }
}
