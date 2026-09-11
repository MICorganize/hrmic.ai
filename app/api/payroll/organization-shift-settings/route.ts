import { NextResponse } from "next/server";

import { getActiveCompany } from "@/lib/active-company";
import { prisma } from "@/lib/prisma";

const SHIFT_CODES = new Set(["WC001", "WC002"]);
const MAX_BATCH_SIZE = 100;

type ShiftUpdate = { employeeId: string; selectedShift: string; weeklyShifts: string[] };

function parseUpdates(value: unknown): ShiftUpdate[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_BATCH_SIZE) return null;
  const ids = new Set<string>();
  const updates: ShiftUpdate[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    const employeeId = typeof row.employeeId === "string" ? row.employeeId.trim() : "";
    if (!employeeId || ids.has(employeeId) || typeof row.selectedShift !== "string" || !SHIFT_CODES.has(row.selectedShift) || !Array.isArray(row.weeklyShifts) || row.weeklyShifts.length !== 7 || row.weeklyShifts.some((shift) => typeof shift !== "string" || !SHIFT_CODES.has(shift))) return null;
    ids.add(employeeId);
    updates.push({ employeeId, selectedShift: row.selectedShift, weeklyShifts: row.weeklyShifts as string[] });
  }
  return updates;
}

export async function GET() {
  try {
    const company = await getActiveCompany();
    if (!company) return NextResponse.json({ error: "กรุณาเลือกบริษัทก่อนใช้งาน" }, { status: 403 });
    const settings = await prisma.individualShiftHolidaySetting.findMany({
      where: { Employee: { companyId: company.id, deletedAt: null } },
      select: { employeeId: true, selectedShift: true, weeklyShifts: true },
    });
    return NextResponse.json({ settings }, { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
  } catch (error) {
    console.error("GET /api/payroll/organization-shift-settings failed:", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดกะการทำงานได้" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { updates?: unknown } | null;
  const updates = parseUpdates(body?.updates);
  if (!updates) return NextResponse.json({ error: `รายการแก้ไขต้องมี 1-${MAX_BATCH_SIZE} รายการ` }, { status: 400 });

  try {
    const company = await getActiveCompany();
    if (!company) return NextResponse.json({ error: "กรุณาเลือกบริษัทก่อนใช้งาน" }, { status: 403 });
    const employees = await prisma.employee.findMany({ where: { id: { in: updates.map(({ employeeId }) => employeeId) }, companyId: company.id, deletedAt: null }, select: { id: true } });
    if (employees.length !== updates.length) return NextResponse.json({ error: "มีพนักงานที่ไม่อยู่ในบริษัทที่เลือก" }, { status: 403 });

    await prisma.$transaction(async (tx) => {
      for (const update of updates) {
        await tx.individualShiftHolidaySetting.upsert({
          where: { employeeId: update.employeeId },
          create: { id: crypto.randomUUID(), employeeId: update.employeeId, selectedShift: update.selectedShift, weeklyShifts: update.weeklyShifts, selectedDayType: "วันหยุดพนักงาน", weeklyDayTypes: ["วันทำงาน", "วันทำงาน", "วันทำงาน", "วันทำงาน", "วันทำงาน", "วันหยุดพนักงาน", "วันหยุดพนักงาน"] },
          update: { selectedShift: update.selectedShift, weeklyShifts: update.weeklyShifts },
        });
        await tx.employeeTimeline.create({ data: { id: crypto.randomUUID(), employeeId: update.employeeId, eventType: "salaryChange", title: "แก้ไขกะการทำงานพื้นฐาน", description: "แก้ไขกะการทำงานรายสัปดาห์", eventDate: new Date() } });
      }
    });
    return NextResponse.json({ updated: updates.length }, { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
  } catch (error) {
    console.error("POST /api/payroll/organization-shift-settings failed:", error);
    return NextResponse.json({ error: "ไม่สามารถบันทึกกะการทำงานได้" }, { status: 500 });
  }
}
