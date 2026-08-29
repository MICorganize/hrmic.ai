import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const GROUPS = ["monthly", "daily", "partTime", "contract"] as const;
const TAX_METHODS = ["tax", "withholding", "none"] as const;

type CalculationGroup = (typeof GROUPS)[number];
type TaxMethod = (typeof TAX_METHODS)[number];

type EmployeeTypeRequest = {
  id?: unknown;
  action?: unknown;
  calculationGroup?: unknown;
  nameTH?: unknown;
  nameEN?: unknown;
  taxMethod?: unknown;
  taxSection?: unknown;
};

const defaultDefinitions: Array<{
  calculationGroup: CalculationGroup;
  code: string;
  nameTH: string;
  nameEN: string;
  taxMethod: TaxMethod;
  taxSection: string | null;
  locked?: boolean;
}> = [
  { calculationGroup: "monthly", code: "ET0001", nameTH: "พนักงานรายเดือน", nameEN: "Monthly", taxMethod: "tax", taxSection: "40(1)", locked: true },
  { calculationGroup: "monthly", code: "ET0002", nameTH: "พนักงานรายเดือน", nameEN: "Monthly", taxMethod: "tax", taxSection: "40(2)" },
  { calculationGroup: "monthly", code: "ET0003", nameTH: "พนักงานรายเดือน", nameEN: "Monthly", taxMethod: "withholding", taxSection: null },
  { calculationGroup: "daily", code: "ET0004", nameTH: "พนักงานรายวัน", nameEN: "Daily", taxMethod: "tax", taxSection: "40(1)" },
  { calculationGroup: "daily", code: "ET0005", nameTH: "พนักงานรายวัน", nameEN: "Daily", taxMethod: "tax", taxSection: "40(2)" },
  { calculationGroup: "daily", code: "ET0006", nameTH: "พนักงานรายวัน", nameEN: "Daily", taxMethod: "withholding", taxSection: null },
  { calculationGroup: "partTime", code: "ET0007", nameTH: "พนักงานพาร์ททาม", nameEN: "Parttime", taxMethod: "tax", taxSection: "40(1)" },
  { calculationGroup: "partTime", code: "ET0008", nameTH: "พนักงานพาร์ททาม", nameEN: "Parttime", taxMethod: "tax", taxSection: "40(2)" },
  { calculationGroup: "partTime", code: "ET0009", nameTH: "พนักงานพาร์ททาม", nameEN: "Parttime", taxMethod: "withholding", taxSection: null },
  { calculationGroup: "contract", code: "ET00010", nameTH: "พนักงานเหมาจ่าย", nameEN: "Fixed Pay", taxMethod: "tax", taxSection: "40(1)" },
  { calculationGroup: "contract", code: "ET00011", nameTH: "พนักงานเหมาจ่าย", nameEN: "Fixed Pay", taxMethod: "tax", taxSection: "40(2)" },
  { calculationGroup: "contract", code: "ET00012", nameTH: "พนักงานเหมาจ่าย", nameEN: "Fixed Pay", taxMethod: "withholding", taxSection: null },
];

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const group = (value: unknown): CalculationGroup | null =>
  GROUPS.includes(value as CalculationGroup) ? (value as CalculationGroup) : null;
const taxMethod = (value: unknown): TaxMethod | null =>
  TAX_METHODS.includes(value as TaxMethod) ? (value as TaxMethod) : null;

function invalid(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

async function activeCompany(companyId?: string | null) {
  if (companyId) {
    return prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
      select: { id: true },
    });
  }
  return prisma.company.findFirst({
    where: { deletedAt: null },
    select: { id: true },
    orderBy: { name: "asc" },
  });
}

async function ensureDefaults(companyId: string) {
  const count = await prisma.employeeTypeDefinition.count({
    where: { companyId, deletedAt: null },
  });
  if (count) return;

  await prisma.employeeTypeDefinition.createMany({
    data: defaultDefinitions.map((definition) => ({ companyId, ...definition })),
    skipDuplicates: true,
  });
}

async function definitions(companyId: string) {
  await ensureDefaults(companyId);
  const items = await prisma.employeeTypeDefinition.findMany({
    where: { companyId, deletedAt: null },
    orderBy: [{ calculationGroup: "asc" }, { code: "asc" }],
  });
  return items.sort((a, b) => {
    const groupIndex = GROUPS.indexOf(a.calculationGroup as CalculationGroup) - GROUPS.indexOf(b.calculationGroup as CalculationGroup);
    return groupIndex || a.code.localeCompare(b.code);
  });
}

async function listResponse(companyId?: string | null) {
  const company = await activeCompany(companyId);
  if (!company) throw new Error("NO_COMPANY");
  return { companyId: company.id, employeeTypes: await definitions(company.id) };
}

function payload(body: EmployeeTypeRequest) {
  const calculationGroup = group(body.calculationGroup);
  const nameTH = text(body.nameTH);
  const nameEN = text(body.nameEN);
  const selectedTaxMethod = taxMethod(body.taxMethod);
  const taxSection = text(body.taxSection) || null;
  if (!calculationGroup || !nameTH || !nameEN || !selectedTaxMethod) return null;
  if (selectedTaxMethod === "tax" && !["40(1)", "40(2)", "40(3)"].includes(taxSection ?? "")) return null;
  return {
    calculationGroup,
    nameTH,
    nameEN,
    taxMethod: selectedTaxMethod,
    taxSection: selectedTaxMethod === "tax" ? taxSection : null,
  };
}

async function nextCode(companyId: string) {
  const existing = await prisma.employeeTypeDefinition.findMany({
    where: { companyId },
    select: { code: true },
  });
  const last = existing.reduce((highest, item) => {
    const match = /^ET(\d+)$/.exec(item.code);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `ET000${last + 1}`;
}

export async function GET(request: Request) {
  try {
    const companyId = new URL(request.url).searchParams.get("companyId");
    return NextResponse.json(await listResponse(companyId));
  } catch (error) {
    if ((error as Error).message === "NO_COMPANY") return invalid("ไม่พบบริษัทสำหรับข้อมูลประเภทพนักงาน");
    console.error("GET /api/employee-type-definition failed:", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดข้อมูลประเภทพนักงานได้" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as EmployeeTypeRequest | null;
    const value = body ? payload(body) : null;
    if (!value) return invalid("กรุณาระบุรูปแบบการคำนวณ ชื่อไทย ชื่ออังกฤษ และภาษีให้ถูกต้อง");
    const company = await activeCompany();
    if (!company) return invalid("ไม่พบบริษัทสำหรับสร้างประเภทพนักงาน");
    await ensureDefaults(company.id);
    await prisma.employeeTypeDefinition.create({
      data: { companyId: company.id, code: await nextCode(company.id), ...value },
    });
    return NextResponse.json(await listResponse(), { status: 201 });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "P2002") return NextResponse.json({ error: "รหัสประเภทพนักงานซ้ำ กรุณาลองใหม่" }, { status: 409 });
    console.error("POST /api/employee-type-definition failed:", error);
    return NextResponse.json({ error: "บันทึกประเภทพนักงานไม่สำเร็จ" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as EmployeeTypeRequest | null;
    const id = text(body?.id);
    if (!body || !id) return invalid("ไม่พบข้อมูลประเภทพนักงานที่ต้องการแก้ไข");
    const company = await activeCompany();
    if (!company) return invalid("ไม่พบบริษัทสำหรับแก้ไขประเภทพนักงาน");
    const item = await prisma.employeeTypeDefinition.findFirst({
      where: { id, companyId: company.id, deletedAt: null },
    });
    if (!item) return NextResponse.json({ error: "ไม่พบข้อมูลประเภทพนักงาน" }, { status: 404 });

    if (body.action === "toggle") {
      if (item.locked) return NextResponse.json({ error: "ไม่สามารถปิดประเภทพนักงานเริ่มต้นได้" }, { status: 409 });
      await prisma.employeeTypeDefinition.update({ where: { id }, data: { enabled: !item.enabled } });
    } else {
      const value = payload(body);
      if (!value) return invalid("กรุณาระบุรูปแบบการคำนวณ ชื่อไทย ชื่ออังกฤษ และภาษีให้ถูกต้อง");
      await prisma.employeeTypeDefinition.update({ where: { id }, data: value });
    }
    return NextResponse.json(await listResponse());
  } catch (error) {
    console.error("PATCH /api/employee-type-definition failed:", error);
    return NextResponse.json({ error: "แก้ไขประเภทพนักงานไม่สำเร็จ" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as EmployeeTypeRequest | null;
    const id = text(body?.id);
    if (!id) return invalid("ไม่พบข้อมูลประเภทพนักงานที่ต้องการลบ");
    const company = await activeCompany();
    if (!company) return invalid("ไม่พบบริษัทสำหรับลบประเภทพนักงาน");
    const item = await prisma.employeeTypeDefinition.findFirst({
      where: { id, companyId: company.id, deletedAt: null },
    });
    if (!item) return NextResponse.json({ error: "ไม่พบข้อมูลประเภทพนักงาน" }, { status: 404 });
    if (item.locked) return NextResponse.json({ error: "ไม่สามารถลบประเภทพนักงานเริ่มต้นได้" }, { status: 409 });
    await prisma.employeeTypeDefinition.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json(await listResponse());
  } catch (error) {
    console.error("DELETE /api/employee-type-definition failed:", error);
    return NextResponse.json({ error: "ลบประเภทพนักงานไม่สำเร็จ" }, { status: 500 });
  }
}
