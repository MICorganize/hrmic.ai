import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_SETTINGS = {
  workDays: "actual",
  workHours: "actual",
  payrollCalculation: "full",
  allowHolidayWork: true,
};

const WORK_DAY_OPTIONS = ["26", "30", "actual", "organization"];
const WORK_HOUR_OPTIONS = ["08:00:00", "08:30:00", "09:00:00", "actual", "organization"];
const PAYROLL_CALCULATION_OPTIONS = ["full", "split"];

function isOneOf(value: unknown, options: readonly string[]): value is string {
  return typeof value === "string" && options.includes(value);
}

function isMissingSettingsTable(error: unknown) {
  const prismaError = error as { code?: unknown; message?: unknown } | null;
  return prismaError?.code === "P2021" ||
    typeof prismaError?.message === "string" && /IndividualGeneralSetting|does not exist|relation .* does not exist/i.test(prismaError.message);
}

export async function GET(request: Request) {
  const employeeId = new URL(request.url).searchParams.get("employeeId")?.trim();
  if (!employeeId) return NextResponse.json({ error: "กรุณาระบุพนักงาน" }, { status: 400 });

  try {
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, deletedAt: null }, select: { id: true } });
    if (!employee) return NextResponse.json({ error: "ไม่พบข้อมูลพนักงาน" }, { status: 404 });

    const settings = await prisma.individualGeneralSetting.findUnique({ where: { employeeId } });
    return NextResponse.json({ settings: settings ?? DEFAULT_SETTINGS });
  } catch (error) {
    if (isMissingSettingsTable(error)) return NextResponse.json({ settings: DEFAULT_SETTINGS, persistenceAvailable: false });
    console.error("GET /api/payroll/individual-general-settings failed:", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดการตั้งค่าทั่วไปได้" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const employeeId = typeof body?.employeeId === "string" ? body.employeeId.trim() : "";
  const workDays = body?.workDays;
  const workHours = body?.workHours;
  const payrollCalculation = body?.payrollCalculation;
  const allowHolidayWork = body?.allowHolidayWork;

  if (!employeeId || !isOneOf(workDays, WORK_DAY_OPTIONS) || !isOneOf(workHours, WORK_HOUR_OPTIONS) || !isOneOf(payrollCalculation, PAYROLL_CALCULATION_OPTIONS) || typeof allowHolidayWork !== "boolean") {
    return NextResponse.json({ error: "ข้อมูลการตั้งค่าทั่วไปไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, deletedAt: null }, select: { id: true } });
    if (!employee) return NextResponse.json({ error: "ไม่พบข้อมูลพนักงาน" }, { status: 404 });

    const settings = await prisma.$transaction(async (tx) => {
      const saved = await tx.individualGeneralSetting.upsert({
        where: { employeeId },
        create: { id: crypto.randomUUID(), employeeId, workDays, workHours, payrollCalculation, allowHolidayWork },
        update: { workDays, workHours, payrollCalculation, allowHolidayWork },
      });
      await tx.employeeTimeline.create({
        data: {
          id: crypto.randomUUID(),
          employeeId,
          eventType: "salaryChange",
          title: "แก้ไขการตั้งค่าทั่วไป (รายบุคคล)",
          description: "แก้ไขจำนวนวันทำงาน ชั่วโมงทำงาน และวิธีคำนวณเงินเดือน",
          eventDate: new Date(),
        },
      });
      return saved;
    });

    return NextResponse.json({ settings });
  } catch (error) {
    if (isMissingSettingsTable(error)) {
      return NextResponse.json({ error: "ยังไม่พบตารางการตั้งค่าทั่วไป กรุณานำ migration ฐานข้อมูลไปใช้ก่อนบันทึก" }, { status: 503 });
    }
    console.error("PATCH /api/payroll/individual-general-settings failed:", error);
    return NextResponse.json({ error: "ไม่สามารถบันทึกการตั้งค่าทั่วไปได้" }, { status: 500 });
  }
}
