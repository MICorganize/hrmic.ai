import { NextResponse } from "next/server";
import type { Gender, MaritalStatus, Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

const EMPLOYEE_TYPE_LABELS: Record<string, string> = {
  permanent: "พนักงานรายเดือน",
  dailyWage: "พนักงานรายวัน",
  partTime: "พนักงานพาร์ทไทม์",
  contract: "พนักงานเหมาจ่าย",
  temporary: "พนักงานชั่วคราว",
};

const MARITAL_LABELS: Record<string, string> = {
  single: "โสด",
  married: "สมรส",
  divorced: "หย่าร้าง",
  widowed: "หม้าย",
};

const GENDER_VALUES: Record<string, Gender> = {
  ชาย: "male",
  หญิง: "female",
  "ไม่ระบุ": "other",
  male: "male",
  female: "female",
  other: "other",
};

const MARITAL_VALUES: Record<string, MaritalStatus> = {
  โสด: "single",
  สมรส: "married",
  หย่าร้าง: "divorced",
  หม้าย: "widowed",
  single: "single",
  married: "married",
  divorced: "divorced",
  widowed: "widowed",
};

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseFormDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error("invalid date");
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() !== Number(match[2]) - 1 ||
    date.getUTCDate() !== Number(match[3])
  ) {
    throw new Error("invalid date");
  }
  return date;
}

function parseMoney(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const amount = Number(value.replace(/,/g, ""));
  if (!Number.isFinite(amount)) throw new Error("invalid amount");
  return amount;
}

/** Formats a DATE (returned at UTC midnight) as dd/mm/yyyy. */
function fmtDate(value: Date | null | undefined): string | null {
  if (!value) return null;
  const d = String(value.getUTCDate()).padStart(2, "0");
  const m = String(value.getUTCMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${value.getUTCFullYear()}`;
}

/** Formats a money value as 1,234.00; empty → null. */
function fmtMoney(value: { toString(): string } | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const n = Number(String(value));
  if (Number.isNaN(n)) return null;
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

/** Computes an age string like "30 ปี 5 เดือน 3 วัน" from a birth date. */
function computeAge(birthDate: Date): string {
  const now = new Date();
  let years = now.getUTCFullYear() - birthDate.getUTCFullYear();
  let months = now.getUTCMonth() - birthDate.getUTCMonth();
  let days = now.getUTCDate() - birthDate.getUTCDate();
  if (days < 0) {
    months--;
    const prevMonthDays = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)).getUTCDate();
    days += prevMonthDays;
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  return `${years} ปี ${months} เดือน ${days} วัน`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const emp = await prisma.employee.findUnique({
      where: { id },
      include: {
        Company: { select: { name: true } },
        Branch: { select: { name: true } },
        Department: { select: { name: true } },
        Position: { select: { name: true } },
        Employment: { select: { employmentType: true, probationDays: true } },
        BankAccount: {
          orderBy: { isDefault: "desc" },
          take: 1,
          select: { bankName: true, accountNumber: true, branchCode: true, accountName: true },
        },
        SocialSecurity: {
          select: { ssoNumber: true, calculationType: true, fixedAmount: true, effectiveDate: true },
        },
        TaxInformation: {
          select: { calculationType: true, fixedAmount: true, effectiveDate: true },
        },
        Address: {
          select: { type: true, addressLine: true, postalCode: true, province: true, district: true, subdistrict: true, provinceId: true, districtId: true, subdistrictId: true },
          orderBy: { type: "asc" },
        },
        Contract: {
          orderBy: { startDate: "desc" },
          take: 1,
          select: { endDate: true },
        },
      },
    });

    if (!emp) {
      return NextResponse.json({ error: "ไม่พบข้อมูลพนักงาน" }, { status: 404 });
    }

    const employmentType = emp.Employment?.employmentType
      ? EMPLOYEE_TYPE_LABELS[emp.Employment.employmentType] ?? emp.Employment.employmentType
      : null;

    return NextResponse.json({
      id: emp.id,
      employeeNumber: emp.employeeNumber,
      employeeCode: emp.employeeCode,
      fingerprintCode: emp.fingerprintCode,
      title: emp.title,
      firstNameTH: emp.firstNameTH,
      lastNameTH: emp.lastNameTH,
      nickname: emp.nickname,
      firstNameEN: emp.firstNameEN,
      lastNameEN: emp.lastNameEN,
      nicknameEN: emp.nicknameEN,
      gender: emp.gender,
      nationality: emp.nationality,
      maritalStatus: emp.maritalStatus ? MARITAL_LABELS[emp.maritalStatus] ?? emp.maritalStatus : null,
      birthDate: fmtDate(emp.birthDate),
      age: emp.birthDate ? computeAge(emp.birthDate) : null,
      phone: emp.phone,
      email: emp.email,
      citizenId: emp.citizenId,
      alienIdNumber: emp.alienIdNumber,
      passportNo: emp.passportNo,
      workPermitNo: emp.workPermitNo,
      companyName: emp.Company?.name ?? null,
      branchName: emp.Branch?.name ?? null,
      departmentName: emp.Department?.name ?? null,
      positionName: emp.Position?.name ?? null,
      hireDate: fmtDate(emp.hireDate),
      confirmationDate: fmtDate(emp.confirmationDate),
      contractEndDate: fmtDate(emp.Contract?.[0]?.endDate),
      retirementDate: fmtDate(emp.retirementDate),
      probationDays: emp.Employment?.probationDays ?? null,
      probationDate: fmtDate(emp.probationDate),
      baseSalary: fmtMoney(emp.baseSalary),
      advanceType: emp.advanceType,
      advanceLimit: fmtMoney(emp.advanceLimit),
      employmentType,
      paymentChannel: emp.paymentChannel,
      companyPayoutAccount: emp.companyPayoutAccount,
      socialSecurity: emp.SocialSecurity
        ? {
            ssoNumber: emp.SocialSecurity.ssoNumber,
            calculationType: emp.SocialSecurity.calculationType,
            fixedAmount: fmtMoney(emp.SocialSecurity.fixedAmount),
            effectiveDate: fmtDate(emp.SocialSecurity.effectiveDate),
          }
        : null,
      taxInformation: emp.TaxInformation
        ? {
            calculationType: emp.TaxInformation.calculationType,
            fixedAmount: fmtMoney(emp.TaxInformation.fixedAmount),
            effectiveDate: fmtDate(emp.TaxInformation.effectiveDate),
          }
        : null,
      bankAccount: emp.BankAccount[0] ?? null,
      addresses: emp.Address,
      description: emp.description,
      hashtag: emp.hashtag,
    });
  } catch (err) {
    console.error("GET /api/employee/[id] failed:", err);
    return NextResponse.json({ error: "ไม่สามารถโหลดข้อมูลพนักงานได้" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: "ข้อมูลที่ส่งมาไม่ถูกต้อง" }, { status: 400 });
    }

    for (const field of ["firstNameTH", "lastNameTH", "email"] as const) {
      if (field in body && !optionalString(body[field])) {
        return NextResponse.json({ error: "กรุณากรอกชื่อ นามสกุล และอีเมลให้ครบถ้วน" }, { status: 400 });
      }
    }

    const data: Prisma.EmployeeUpdateInput = { updatedAt: new Date() };
    const nullableStringFields = [
      "employeeCode",
      "fingerprintCode",
      "title",
      "nickname",
      "firstNameEN",
      "lastNameEN",
      "nicknameEN",
      "nationality",
      "phone",
      "citizenId",
      "alienIdNumber",
      "passportNo",
      "workPermitNo",
      "advanceType",
      "paymentChannel",
      "companyPayoutAccount",
      "description",
      "hashtag",
    ] as const;
    for (const field of nullableStringFields) {
      if (field in body) data[field] = optionalString(body[field]);
    }
    for (const field of ["firstNameTH", "lastNameTH", "email"] as const) {
      if (field in body) data[field] = optionalString(body[field])!;
    }

    if ("gender" in body) data.gender = GENDER_VALUES[String(body.gender)] ?? null;
    if ("maritalStatus" in body) data.maritalStatus = MARITAL_VALUES[String(body.maritalStatus)] ?? null;
    for (const field of ["birthDate", "confirmationDate", "retirementDate", "probationDate"] as const) {
      if (field in body) data[field] = parseFormDate(body[field]);
    }
    if ("hireDate" in body) {
      const hireDate = parseFormDate(body.hireDate);
      if (!hireDate) return NextResponse.json({ error: "กรุณาระบุวันที่เริ่มงาน" }, { status: 400 });
      data.hireDate = hireDate;
    }
    if ("baseSalary" in body) {
      const baseSalary = parseMoney(body.baseSalary);
      if (baseSalary === null) return NextResponse.json({ error: "กรุณาระบุค่าจ้าง" }, { status: 400 });
      data.baseSalary = baseSalary;
    }
    if ("advanceLimit" in body) data.advanceLimit = parseMoney(body.advanceLimit);

    let probationDays: number | null | undefined;
    if ("probationDays" in body) {
      const rawDays = optionalString(body.probationDays);
      probationDays = rawDays === null ? null : Number(rawDays);
      if (probationDays !== null && (!Number.isInteger(probationDays) || probationDays < 0)) {
        return NextResponse.json({ error: "ระยะเวลาทดลองงานต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป" }, { status: 400 });
      }
    }

    const updatedEmployee = await prisma.employee.update({ where: { id }, data });
    if (Array.isArray(body.addresses)) {
      for (const item of body.addresses) {
        if (!item || (item.type !== "current" && item.type !== "permanent")) continue;
        const addressData = {
          addressLine: optionalString(item.addressLine),
          postalCode: optionalString(item.postalCode),
          updatedAt: new Date(),
        };
        const locationData = {
          ...("province" in item ? { province: optionalString(item.province) } : {}),
          ...("district" in item ? { district: optionalString(item.district) } : {}),
          ...("subdistrict" in item ? { subdistrict: optionalString(item.subdistrict) } : {}),
          ...("provinceId" in item ? { provinceId: optionalString(item.provinceId) } : {}),
          ...("districtId" in item ? { districtId: optionalString(item.districtId) } : {}),
          ...("subdistrictId" in item ? { subdistrictId: optionalString(item.subdistrictId) } : {}),
        };
        const existing = await prisma.address.findFirst({ where: { employeeId: id, type: item.type } });
        if (existing) await prisma.address.update({ where: { id: existing.id }, data: { ...addressData, ...locationData } });
        else await prisma.address.create({ data: { id: crypto.randomUUID(), employeeId: id, type: item.type, ...addressData, ...locationData } });
      }
    }
    if (probationDays !== undefined) {
      await prisma.employment.updateMany({ where: { employeeId: id }, data: { probationDays } });
    }

    const hasSocialSecurityChanges = ["socialSecurityNumber", "socialSecurityCalc", "socialSecurityFixed", "socialSecurityStart"]
      .some((field) => field in body);
    if (hasSocialSecurityChanges) {
      const current = await prisma.socialSecurity.findUnique({ where: { employeeId: id } });
      const ssoNumber = optionalString(body.socialSecurityNumber) ?? current?.ssoNumber;
      const effectiveDate = parseFormDate(body.socialSecurityStart) ?? current?.effectiveDate;
      if (current) {
        await prisma.socialSecurity.update({
          where: { employeeId: id },
          data: {
            updatedAt: new Date(),
            ssoNumber: ssoNumber!,
            effectiveDate: effectiveDate!,
            calculationType: optionalString(body.socialSecurityCalc),
            fixedAmount: parseMoney(body.socialSecurityFixed),
          },
        });
      } else if (ssoNumber && effectiveDate) {
        await prisma.socialSecurity.create({
          data: {
            id: crypto.randomUUID(),
            updatedAt: new Date(),
            employeeId: id,
            ssoNumber,
            effectiveDate,
            calculationType: optionalString(body.socialSecurityCalc),
            fixedAmount: parseMoney(body.socialSecurityFixed),
          },
        });
      }
    }

    const hasTaxChanges = ["taxCalc", "taxFixed", "taxStart"].some((field) => field in body);
    if (hasTaxChanges) {
      const taxData = {
        updatedAt: new Date(),
        calculationType: optionalString(body.taxCalc),
        fixedAmount: parseMoney(body.taxFixed),
        effectiveDate: parseFormDate(body.taxStart),
      };
      const current = await prisma.taxInformation.findUnique({ where: { employeeId: id } });
      if (current) {
        await prisma.taxInformation.update({ where: { employeeId: id }, data: taxData });
      } else if (taxData.calculationType || taxData.fixedAmount !== null || taxData.effectiveDate) {
        await prisma.taxInformation.create({ data: { id: crypto.randomUUID(), employeeId: id, ...taxData } });
      }
    }

    const hasBankChanges = ["bankName", "bankBranchCode", "bankAccountNumber"].some((field) => field in body);
    if (hasBankChanges) {
      const current = await prisma.bankAccount.findFirst({ where: { employeeId: id }, orderBy: { isDefault: "desc" } });
      if (current) {
        await prisma.bankAccount.update({
          where: { id: current.id },
          data: {
            updatedAt: new Date(),
            bankName: optionalString(body.bankName) ?? current.bankName,
            branchCode: optionalString(body.bankBranchCode),
            accountNumber: optionalString(body.bankAccountNumber) ?? current.accountNumber,
          },
        });
      }
    }

    if ("contractEndDate" in body) {
      const endDate = parseFormDate(body.contractEndDate);
      const current = await prisma.contract.findFirst({ where: { employeeId: id }, orderBy: { startDate: "desc" } });
      if (current) {
        await prisma.contract.update({ where: { id: current.id }, data: { updatedAt: new Date(), endDate } });
      } else if (endDate) {
        await prisma.contract.create({
          data: {
            id: crypto.randomUUID(),
            updatedAt: new Date(),
            employeeId: id,
            startDate: updatedEmployee.hireDate,
            endDate,
          },
        });
      }
    }
    // Keep PATCH responses in the same shape as GET.  The employee detail page
    // immediately replaces its local record with this response after saving the
    // personal-history address form; returning only `{ ok: true }` left that
    // page without the employee fields it needs to render.
    return GET(new Request(request.url), { params: Promise.resolve({ id }) });
  } catch (err) {
    console.error("PATCH /api/employee/[id] failed:", err);
    return NextResponse.json({ error: "ไม่สามารถบันทึกข้อมูลพนักงานได้" }, { status: 500 });
  }
}
