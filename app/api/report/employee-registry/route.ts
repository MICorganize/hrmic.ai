import { NextResponse } from "next/server";
import type { AddressType, EmploymentType, Prisma, Status } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

/* ---------------------------------- Maps ---------------------------------- */

const STATUS_LABELS: Record<Status, string> = {
  active: "Active",
  inactive: "Inactive",
  suspended: "Suspended",
  terminated: "Out",
};

const GENDER_LABELS: Record<string, string> = {
  male: "ชาย",
  female: "หญิง",
  other: "อื่นๆ",
};

const EMPLOYEE_TYPE_LABELS: Record<EmploymentType, string> = {
  permanent: "พนักงานรายเดือน",
  dailyWage: "พนักงานรายวัน",
  partTime: "พนักงานพาร์ทไทม์",
  contract: "พนักงานเหมาจ่าย",
  temporary: "พนักงานชั่วคราว",
};

/** กลุ่มพนักงาน — code + label in the same format as the reference app (ET0001…). */
const EMPLOYEE_GROUP_LABELS: Record<EmploymentType, string> = {
  permanent: "ET0001 : พนักงานรายเดือน",
  dailyWage: "ET0002 : พนักงานรายวัน",
  partTime: "ET0003 : พนักงานพาร์ทไทม์",
  contract: "ET0004 : พนักงานเหมาจ่าย",
  temporary: "ET0005 : พนักงานชั่วคราว",
};

/** English title derived from the Thai title (the schema keeps a single title field). */
const TITLE_EN: Record<string, string> = {
  นาย: "Mr.",
  นาง: "Mrs.",
  นางสาว: "Miss",
  "ด.ช.": "Master",
  "ด.ญ.": "Miss",
};

/* --------------------------------- Helpers -------------------------------- */

/** Formats a DATE (stored at UTC midnight) as dd/mm/yyyy; null → "". */
function fmtDate(date: Date | null | undefined): string {
  if (!date) return "";
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${date.getUTCFullYear()}`;
}

/** Whole months/days between two dates using UTC components. */
function diffParts(from: Date, to: Date): { years: number; months: number; days: number } {
  const f = { y: from.getUTCFullYear(), m: from.getUTCMonth(), d: from.getUTCDate() };
  const t = { y: to.getUTCFullYear(), m: to.getUTCMonth(), d: to.getUTCDate() };
  let years = t.y - f.y;
  let months = t.m - f.m;
  let days = t.d - f.d;
  if (days < 0) {
    months -= 1;
    // days in the month before the target month
    days += new Date(Date.UTC(t.y, t.m, 0)).getUTCDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}

/** "X ปี Y เดือน Z วัน" between two dates; empty when `from` is after `to`. */
function fmtDuration(from: Date, to: Date): string {
  if (to < from) return "";
  const { years, months, days } = diffParts(from, to);
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ปี`);
  if (months > 0) parts.push(`${months} เดือน`);
  if (days > 0) parts.push(`${days} วัน`);
  return parts.join(" ") || "0 วัน";
}

/** "15000.00" from a Decimal. */
function fmtMoney(value: { toString(): string } | null | undefined): string {
  if (value == null) return "0.00";
  const n = Number(value.toString());
  return Number.isNaN(n) ? "0.00" : n.toFixed(2);
}

/** One-line address from the Address rows of the requested type. */
function fmtAddress(
  addresses: { type: AddressType; addressLine: string | null; subdistrict: string | null; district: string | null; province: string | null; postalCode: string | null }[],
  type: AddressType
): string {
  const a = addresses.find((addr) => addr.type === type);
  if (!a) return "";
  return [a.addressLine, a.subdistrict, a.district, a.province, a.postalCode]
    .filter((v): v is string => !!v?.trim())
    .join(" ");
}

/* ---------------------------------- Route --------------------------------- */

const ROW_SELECT = {
  employeeNumber: true,
  title: true,
  firstNameTH: true,
  lastNameTH: true,
  gender: true,
  email: true,
  phone: true,
  hireDate: true,
  baseSalary: true,
  status: true,
  birthDate: true,
  citizenId: true,
  confirmationDate: true,
  employeeCode: true,
  firstNameEN: true,
  lastNameEN: true,
  nationality: true,
  nickname: true,
  passportNo: true,
  terminationDate: true,
  fingerprintCode: true,
  nicknameEN: true,
  alienIdNumber: true,
  workPermitNo: true,
  Branch: { select: { name: true } },
  Company: { select: { name: true, companyNameTH: true } },
  Department: { select: { name: true } },
  Position: { select: { name: true, level: true } },
  Team: { select: { name: true } },
  Employment: { select: { employmentType: true } },
  Contract: { select: { endDate: true }, orderBy: { endDate: "desc" as const }, take: 1 },
  SocialSecurity: { select: { ssoNumber: true } },
  BankAccount: { select: { bankName: true, accountNumber: true }, take: 1 },
  Address: {
    select: {
      type: true,
      addressLine: true,
      subdistrict: true,
      district: true,
      province: true,
      postalCode: true,
    },
  },
} satisfies Prisma.EmployeeSelect;

type EmployeeRow = Prisma.EmployeeGetPayload<{ select: typeof ROW_SELECT }>;

function buildRow(emp: EmployeeRow, index: number): string[] {
  const today = new Date();
  const companyName = emp.Company?.companyNameTH ?? emp.Company?.name ?? "";
  const employmentType = emp.Employment?.employmentType;

  return [
    String(index + 1), // ลำดับ
    STATUS_LABELS[emp.status] ?? emp.status, // สถานะ
    emp.title ?? "", // คำนำหน้าชื่อ
    emp.firstNameTH, // ชื่อ
    emp.lastNameTH, // นามสกุล
    emp.nickname ?? "", // ชื่อเล่น
    (emp.title && TITLE_EN[emp.title]) || "", // คำนำหน้าชื่อ(EN)
    emp.firstNameEN ?? "", // ชื่อ(EN)
    emp.lastNameEN ?? "", // นามสกุล(EN)
    emp.nicknameEN ?? "", // ชื่อเล่น(EN)
    emp.nationality ?? "", // สัญชาติ
    emp.Position?.level != null ? String(emp.Position.level) : "", // ระดับตำแหน่ง
    emp.employeeCode ?? emp.employeeNumber, // รหัสพนักงาน
    emp.fingerprintCode ?? "", // รหัสลายนิ้วมือ
    companyName, // บริษัท
    emp.Branch?.name ?? "", // สำนักงานสาขา
    emp.Department?.name ?? "", // แผนก
    "", // ฝ่ายงาน (ไม่มีข้อมูลในระบบ)
    emp.Team?.name ?? "", // หน่วยงาน
    emp.Position?.name ?? "", // ตำแหน่ง
    employmentType ? (EMPLOYEE_TYPE_LABELS[employmentType] ?? employmentType) : "", // ประเภทพนักงาน
    employmentType ? (EMPLOYEE_GROUP_LABELS[employmentType] ?? employmentType) : "", // กลุ่มพนักงาน
    emp.phone ?? "", // เบอร์โทร
    emp.email, // Email
    fmtDate(emp.birthDate), // วันเกิด
    emp.birthDate ? fmtDuration(emp.birthDate, today) : "", // อายุ
    emp.gender ? (GENDER_LABELS[emp.gender] ?? emp.gender) : "", // เพศ
    fmtDate(emp.confirmationDate), // วันที่บรรจุ
    emp.confirmationDate ? fmtDuration(emp.confirmationDate, today) : "", // อายุงานวันที่บรรจุ
    fmtDate(emp.hireDate), // วันที่เริ่มงาน
    fmtDuration(emp.hireDate, today), // อายุงาน วันที่เริ่มงาน
    fmtDate(emp.Contract?.[0]?.endDate), // วันที่หมดสัญญาจ้าง
    fmtDate(emp.terminationDate), // วันที่ลาออก
    "", // แบล็กลิสต์ (ไม่มีข้อมูลในระบบ)
    emp.citizenId ?? "", // เลขบัตรประจำตัวประชาชน / ผู้เสียภาษี
    emp.alienIdNumber ?? "", // เลขประจำตัวคนซึ่งไม่มีสัญชาติไทย
    emp.passportNo ?? "", // เลขหนังสือเดินทาง
    emp.workPermitNo ?? "", // เลขใบอนุญาตทำงาน
    emp.SocialSecurity?.ssoNumber ?? "", // เลขประจำตัวประกันสังคม
    emp.BankAccount?.[0]?.bankName ?? "", // ธนาคาร
    emp.BankAccount?.[0]?.accountNumber ?? "", // เลขที่บัญชี
    fmtAddress(emp.Address, "permanent"), // ที่อยู่ตามบัตร
    fmtAddress(emp.Address, "current"), // ที่อยู่ปัจจุบัน
    fmtMoney(emp.baseSalary), // เงินเดือน
    "0.00", // เงินประจำสัปดาห์ (ไม่มีข้อมูลในระบบ)
  ];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const employmentType = searchParams.get("employmentType");

    const where: Prisma.EmployeeWhereInput = { deletedAt: null };
    if (status && status !== "all") {
      where.status = status as Status;
    }
    if (employmentType && employmentType !== "all") {
      where.Employment = { is: { employmentType: employmentType as EmploymentType } };
    }

    const employees = await prisma.employee.findMany({
      where,
      select: ROW_SELECT,
      orderBy: [{ employeeCode: "asc" }, { employeeNumber: "asc" }],
    });

    const rows = employees.map((emp, i) => buildRow(emp, i));

    return NextResponse.json({ total: rows.length, rows });
  } catch (err) {
    console.error("GET /api/report/employee-registry failed:", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดรายงานทะเบียนพนักงานได้" },
      { status: 500 }
    );
  }
}
