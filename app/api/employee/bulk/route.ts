import { NextResponse } from "next/server";
import type { Gender, MaritalStatus, Prisma } from "@/generated/prisma/client";

import { getActiveCompany } from "@/lib/active-company";
import { refreshEmployeeSummarySnapshot } from "@/lib/employee/summary";
import { toPhoneDigits } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

const MAX_BATCH_SIZE = 100;
const GENDERS: Record<string, Gender> = { ชาย: "male", หญิง: "female", "ไม่ระบุ": "other", male: "male", female: "female", other: "other" };
const MARITAL_STATUSES: Record<string, MaritalStatus> = { โสด: "single", สมรส: "married", หย่าร้าง: "divorced", หม้าย: "widowed", single: "single", married: "married", divorced: "divorced", widowed: "widowed" };
const EMPLOYEE_FIELDS = new Set(["title", "employeeCode", "fingerprintCode", "gender", "maritalStatus", "citizenId", "alienIdNumber", "passportNo", "workPermitNo", "birthDate", "phone", "email", "baseSalary", "advanceType", "advanceLimit", "hireDate", "confirmationDate", "paymentChannel", "companyPayoutAccount", "hashtag"]);
const RELATED_FIELDS = new Set(["socialSecurityNumber", "probationDays", "socialSecurityCalc", "socialSecurityFixed", "taxCalc", "taxFixed", "bankName", "bankBranchCode", "bankAccountNumber"]);

type BatchUpdate = { id: string; changes: Record<string, unknown> };

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function date(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error("invalid date");
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error("invalid date");
  const parsed = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (parsed.toISOString().slice(0, 10) !== value) throw new Error("invalid date");
  return parsed;
}

function money(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value !== "string" && typeof value !== "number") throw new Error("invalid amount");
  const parsed = Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(parsed)) throw new Error("invalid amount");
  return parsed;
}

function parseUpdates(value: unknown): BatchUpdate[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_BATCH_SIZE) return null;
  const updates: BatchUpdate[] = [];
  const ids = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const candidate = item as { id?: unknown; changes?: unknown };
    const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
    if (!id || ids.has(id) || !candidate.changes || typeof candidate.changes !== "object" || Array.isArray(candidate.changes)) return null;
    const changes = candidate.changes as Record<string, unknown>;
    if (Object.keys(changes).length < 1 || Object.keys(changes).some((key) => !EMPLOYEE_FIELDS.has(key) && !RELATED_FIELDS.has(key))) return null;
    ids.add(id);
    updates.push({ id, changes });
  }
  return updates;
}

async function applyUpdate(tx: Prisma.TransactionClient, update: BatchUpdate) {
  const { id, changes } = update;
  const data: Prisma.EmployeeUpdateInput = { updatedAt: new Date() };
  for (const field of ["title", "employeeCode", "fingerprintCode", "citizenId", "alienIdNumber", "passportNo", "workPermitNo", "advanceType", "paymentChannel", "companyPayoutAccount", "hashtag"] as const) {
    if (field in changes) data[field] = text(changes[field]);
  }
  if ("phone" in changes) data.phone = toPhoneDigits(String(changes.phone ?? "")) || null;
  if ("email" in changes) {
    const email = text(changes.email);
    if (!email) throw new Error("invalid email");
    data.email = email;
  }
  if ("gender" in changes) data.gender = GENDERS[String(changes.gender)] ?? null;
  if ("maritalStatus" in changes) data.maritalStatus = MARITAL_STATUSES[String(changes.maritalStatus)] ?? null;
  for (const field of ["birthDate", "confirmationDate"] as const) if (field in changes) data[field] = date(changes[field]);
  if ("hireDate" in changes) {
    const hireDate = date(changes.hireDate);
    if (!hireDate) throw new Error("invalid hire date");
    data.hireDate = hireDate;
  }
  if ("baseSalary" in changes) {
    const amount = money(changes.baseSalary);
    if (amount === null) throw new Error("invalid salary");
    data.baseSalary = amount;
  }
  if ("advanceLimit" in changes) data.advanceLimit = money(changes.advanceLimit);
  await tx.employee.update({ where: { id }, data });

  if ("probationDays" in changes) {
    const raw = text(changes.probationDays);
    const probationDays = raw === null ? null : Number(raw);
    if (probationDays !== null && (!Number.isInteger(probationDays) || probationDays < 0)) throw new Error("invalid probation days");
    await tx.employment.updateMany({ where: { employeeId: id }, data: { probationDays, updatedAt: new Date() } });
  }

  if (["socialSecurityNumber", "socialSecurityCalc", "socialSecurityFixed"].some((field) => field in changes)) {
    const current = await tx.socialSecurity.findUnique({ where: { employeeId: id } });
    if (current) {
      await tx.socialSecurity.update({
        where: { employeeId: id },
        data: {
          updatedAt: new Date(),
          ...( "socialSecurityNumber" in changes ? { ssoNumber: text(changes.socialSecurityNumber) ?? current.ssoNumber } : {}),
          ...( "socialSecurityCalc" in changes ? { calculationType: text(changes.socialSecurityCalc) } : {}),
          ...( "socialSecurityFixed" in changes ? { fixedAmount: money(changes.socialSecurityFixed) } : {}),
        },
      });
    }
  }

  if (["taxCalc", "taxFixed"].some((field) => field in changes)) {
    const current = await tx.taxInformation.findUnique({ where: { employeeId: id } });
    const taxData = {
      updatedAt: new Date(),
      ...( "taxCalc" in changes ? { calculationType: text(changes.taxCalc) } : {}),
      ...( "taxFixed" in changes ? { fixedAmount: money(changes.taxFixed) } : {}),
    };
    if (current) await tx.taxInformation.update({ where: { employeeId: id }, data: taxData });
    else if (text(changes.taxCalc) || money(changes.taxFixed) !== null) {
      await tx.taxInformation.create({ data: { id: crypto.randomUUID(), employeeId: id, ...taxData } });
    }
  }

  if (["bankName", "bankBranchCode", "bankAccountNumber"].some((field) => field in changes)) {
    const current = await tx.bankAccount.findFirst({ where: { employeeId: id }, orderBy: { isDefault: "desc" } });
    const bankName = text(changes.bankName);
    const accountNumber = text(changes.bankAccountNumber);
    if (current) {
      await tx.bankAccount.update({
        where: { id: current.id },
        data: { updatedAt: new Date(), ...(bankName ? { bankName } : {}), branchCode: text(changes.bankBranchCode), ...(accountNumber ? { accountNumber } : {}) },
      });
    } else if (bankName && accountNumber) {
      await tx.bankAccount.create({ data: { id: crypto.randomUUID(), employeeId: id, bankCode: bankName.slice(0, 32), bankName, accountNumber, accountName: "", branchCode: text(changes.bankBranchCode), updatedAt: new Date() } });
    }
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { updates?: unknown } | null;
  const updates = parseUpdates(body?.updates);
  if (!updates) return NextResponse.json({ error: `รายการแก้ไขต้องมี 1-${MAX_BATCH_SIZE} รายการและใช้ฟิลด์ที่อนุญาตเท่านั้น` }, { status: 400 });

  try {
    const company = await getActiveCompany();
    if (!company) return NextResponse.json({ error: "กรุณาเลือกบริษัทก่อนใช้งาน" }, { status: 403 });
    const authorized = await prisma.employee.findMany({ where: { id: { in: updates.map(({ id }) => id) }, companyId: company.id, deletedAt: null }, select: { id: true } });
    if (authorized.length !== updates.length) return NextResponse.json({ error: "มีพนักงานที่ไม่อยู่ในบริษัทที่เลือก" }, { status: 403 });

    await prisma.$transaction(async (tx) => {
      for (const update of updates) await applyUpdate(tx, update);
    });
    await refreshEmployeeSummarySnapshot(company.id);
    return NextResponse.json({ updated: updates.length }, { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
  } catch (error) {
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2002") return NextResponse.json({ error: "รหัสหรือข้อมูลพนักงานซ้ำกับข้อมูลที่มีอยู่" }, { status: 409 });
    if (error instanceof Error && error.message.startsWith("invalid")) return NextResponse.json({ error: "ข้อมูลพนักงานไม่ถูกต้อง" }, { status: 400 });
    console.error("POST /api/employee/bulk failed:", error);
    return NextResponse.json({ error: "ไม่สามารถบันทึกข้อมูลพนักงานแบบกลุ่มได้" }, { status: 500 });
  }
}
