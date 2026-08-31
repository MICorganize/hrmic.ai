import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SHIFT_CODES = ["WC001", "WC002"] as const;
const DAY_TYPES = ["วันทำงาน", "วันหยุดพนักงาน"] as const;
const DAYS_PER_WEEK = 7;

const DEFAULT_SETTINGS = {
  selectedShift: "WC002",
  weeklyShifts: Array(DAYS_PER_WEEK).fill("WC002"),
  selectedDayType: "วันหยุดพนักงาน",
  weeklyDayTypes: ["วันทำงาน", "วันทำงาน", "วันทำงาน", "วันทำงาน", "วันทำงาน", "วันหยุดพนักงาน", "วันหยุดพนักงาน"],
};

function isOneOf<T extends readonly string[]>(value: unknown, options: T): value is T[number] {
  return typeof value === "string" && options.includes(value as T[number]);
}

function isWeeklyList(value: unknown, options: readonly string[]): value is string[] {
  return Array.isArray(value) && value.length === DAYS_PER_WEEK && value.every((item) => isOneOf(item, options));
}

function isMissingSettingsTable(error: unknown) {
  const prismaError = error as { code?: unknown; message?: unknown } | null;
  return prismaError?.code === "P2021" ||
    typeof prismaError?.message === "string" && /IndividualShiftHolidaySetting|does not exist|relation .* does not exist/i.test(prismaError.message);
}

export async function GET(request: Request) {
  const employeeId = new URL(request.url).searchParams.get("employeeId")?.trim();
  if (!employeeId) return NextResponse.json({ error: "กรุณาระบุพนักงาน" }, { status: 400 });

  try {
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, deletedAt: null }, select: { id: true } });
    if (!employee) return NextResponse.json({ error: "ไม่พบข้อมูลพนักงาน" }, { status: 404 });

    const settings = await prisma.individualShiftHolidaySetting.findUnique({ where: { employeeId } });
    return NextResponse.json({ settings: settings ?? DEFAULT_SETTINGS });
  } catch (error) {
    if (isMissingSettingsTable(error)) return NextResponse.json({ settings: DEFAULT_SETTINGS, persistenceAvailable: false });
    console.error("GET /api/payroll/individual-shift-holiday-settings failed:", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดการตั้งค่ากะการทำงาน-วันหยุดได้" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const employeeId = typeof body?.employeeId === "string" ? body.employeeId.trim() : "";
  const section = body?.section;
  const selectedShift = body?.selectedShift;
  const weeklyShifts = body?.weeklyShifts;
  const selectedDayType = body?.selectedDayType;
  const weeklyDayTypes = body?.weeklyDayTypes;

  const isShiftUpdate = section === "shift";
  const isDayUpdate = section === "day";
  if (!employeeId ||
    (isShiftUpdate && (!isOneOf(selectedShift, SHIFT_CODES) || !isWeeklyList(weeklyShifts, SHIFT_CODES))) ||
    (isDayUpdate && (!isOneOf(selectedDayType, DAY_TYPES) || !isWeeklyList(weeklyDayTypes, DAY_TYPES))) ||
    (!isShiftUpdate && !isDayUpdate)) {
    return NextResponse.json({ error: "ข้อมูลกะการทำงาน-วันหยุดไม่ถูกต้อง" }, { status: 400 });
  }

  const shiftUpdate = isShiftUpdate
    ? { selectedShift: selectedShift as (typeof SHIFT_CODES)[number], weeklyShifts: weeklyShifts as string[] }
    : null;
  const dayUpdate = isDayUpdate
    ? { selectedDayType: selectedDayType as (typeof DAY_TYPES)[number], weeklyDayTypes: weeklyDayTypes as string[] }
    : null;

  try {
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, deletedAt: null }, select: { id: true } });
    if (!employee) return NextResponse.json({ error: "ไม่พบข้อมูลพนักงาน" }, { status: 404 });

    const settings = await prisma.$transaction(async (tx) => {
      const sectionSettings = shiftUpdate ?? dayUpdate!;
      const saved = await tx.individualShiftHolidaySetting.upsert({
        where: { employeeId },
        create: { id: crypto.randomUUID(), employeeId, ...DEFAULT_SETTINGS, ...sectionSettings },
        update: sectionSettings,
      });
      await tx.employeeTimeline.create({
        data: {
          id: crypto.randomUUID(),
          employeeId,
          eventType: "salaryChange",
          title: isShiftUpdate ? "แก้ไขกะการทำงาน (รายบุคคล)" : "แก้ไขวันทำงาน-วันหยุด (รายบุคคล)",
          description: isShiftUpdate ? "แก้ไขกะการทำงานรายสัปดาห์" : "แก้ไขวันทำงาน-วันหยุดรายสัปดาห์",
          eventDate: new Date(),
        },
      });
      return saved;
    });

    return NextResponse.json({ settings });
  } catch (error) {
    if (isMissingSettingsTable(error)) {
      return NextResponse.json({ error: "ยังไม่พบตารางกะการทำงาน-วันหยุด กรุณานำ migration ฐานข้อมูลไปใช้ก่อนบันทึก" }, { status: 503 });
    }
    console.error("PATCH /api/payroll/individual-shift-holiday-settings failed:", error);
    return NextResponse.json({ error: "ไม่สามารถบันทึกกะการทำงาน-วันหยุดได้" }, { status: 500 });
  }
}
