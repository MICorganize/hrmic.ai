import { NextResponse } from "next/server";

import { getActiveCompany } from "@/lib/active-company";
import { invalidateReadModel } from "@/lib/cache/read-model-version";
import { normalizePayrollCutoffDay } from "@/lib/payroll/period-default";
import { prisma } from "@/lib/prisma";

function noActiveCompany() {
  return NextResponse.json({ error: "กรุณาเลือกบริษัทก่อนใช้งาน" }, { status: 403 });
}

export async function GET() {
  try {
    const company = await getActiveCompany();
    if (!company) return noActiveCompany();

    const settings = await prisma.company.findUnique({
      where: { id: company.id },
      select: { payrollCutoffDay: true },
    });
    return NextResponse.json({ payrollCutoffDay: settings?.payrollCutoffDay ?? 1 });
  } catch (error) {
    console.error("GET /api/settings/general failed:", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดการตั้งค่าทั่วไปได้" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as { payrollCutoffDay?: unknown } | null;
  const payrollCutoffDay = normalizePayrollCutoffDay(body?.payrollCutoffDay);
  if (payrollCutoffDay === null) {
    return NextResponse.json({ error: "กรุณาระบุวันที่ตัดรอบการจ่ายเงินเดือนให้ถูกต้อง" }, { status: 400 });
  }

  try {
    const company = await getActiveCompany();
    if (!company) return noActiveCompany();

    const settings = await prisma.company.update({
      where: { id: company.id },
      data: { payrollCutoffDay },
      select: { payrollCutoffDay: true },
    });
    await invalidateReadModel("payroll-dashboard", company.id);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("PUT /api/settings/general failed:", error);
    return NextResponse.json({ error: "ไม่สามารถบันทึกการตั้งค่าทั่วไปได้" }, { status: 500 });
  }
}
