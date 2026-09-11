import { NextResponse } from "next/server";

import { getActiveCompany } from "@/lib/active-company";
import { prisma } from "@/lib/prisma";

const WORK_TIME_DEFAULTS = [
  { type: "มาเช้า", enabled: true, isPaid: true, countMin: 0, countMax: 15, countMethod: "เริ่มนับทันที", moneyMin: 0, moneyMax: 15, moneyMethod: "เริ่มคำนวณทันที", calculationMethod: "1 เท่าของค่าแรง", roundingMethod: "ไม่ปัดเศษ", calculationTargets: [], calculationDayTypes: ["วันทำงาน"] },
  { type: "สาย", enabled: true, isPaid: false, countMin: 0, countMax: 480, countMethod: "เริ่มนับทันที", moneyMin: null, moneyMax: null, moneyMethod: null, calculationMethod: null, roundingMethod: null, calculationTargets: [], calculationDayTypes: [] },
  { type: "พักเกิน", enabled: true, isPaid: true, countMin: 0, countMax: 0, countMethod: "เริ่มนับทันที", moneyMin: 0, moneyMax: 0, moneyMethod: "เริ่มคำนวณทันที", calculationMethod: "1 เท่าของค่าแรง", roundingMethod: "ไม่ปัดเศษ", calculationTargets: [], calculationDayTypes: ["วันทำงาน"] },
  { type: "พักไว", enabled: true, isPaid: true, countMin: 0, countMax: 45, countMethod: "เริ่มนับทันที", moneyMin: 0, moneyMax: 0, moneyMethod: "เริ่มคำนวณทันที", calculationMethod: "0 เท่าของค่าแรง", roundingMethod: "ไม่ปัดเศษ", calculationTargets: [], calculationDayTypes: ["วันทำงาน"] },
  { type: "กลับก่อน", enabled: true, isPaid: true, countMin: 0, countMax: 0, countMethod: "เริ่มนับทันที", moneyMin: 0, moneyMax: 0, moneyMethod: "เริ่มคำนวณทันที", calculationMethod: "1 เท่าของค่าแรง", roundingMethod: "ไม่ปัดเศษ", calculationTargets: [], calculationDayTypes: ["วันทำงาน"] },
  { type: "กลับช้า", enabled: true, isPaid: true, countMin: 0, countMax: 0, countMethod: "เริ่มนับทันที", moneyMin: 10, moneyMax: 0, moneyMethod: "เริ่มได้รับเงินหลังเวลาเลิกงาน 10 นาที", calculationMethod: "1 เท่าของค่าแรง", roundingMethod: "ไม่ปัดเศษ", calculationTargets: [], calculationDayTypes: ["วันทำงาน"] },
] as const;

const GENERAL_DEFAULTS = { workDays: "actual", workHours: "actual", payrollCalculation: "full", allowHolidayWork: true } as const;
const SHIFT_DEFAULTS = {
  selectedShift: "WC002",
  weeklyShifts: Array(7).fill("WC002"),
  selectedDayType: "วันหยุดพนักงาน",
  weeklyDayTypes: ["วันทำงาน", "วันทำงาน", "วันทำงาน", "วันทำงาน", "วันทำงาน", "วันหยุดพนักงาน", "วันหยุดพนักงาน"],
} as const;

function overtimeDefault(ruleNumber: number) {
  return { ruleNumber, enabled: true, startMinutes: 0, countingChoice: "after", payMethod: "wage-rate", wageRate: ruleNumber === 2 ? 1.5 : ruleNumber >= 4 ? 3 : 1, roundMoney: "none", maxHours: "shift", roundHours: "none", calculationTargets: [] };
}

function missingTable(error: unknown) {
  const value = error as { code?: unknown; message?: unknown } | null;
  return value?.code === "P2021" || typeof value?.message === "string" && /does not exist|relation .* does not exist/i.test(value.message);
}

export async function GET(request: Request) {
  const employeeId = new URL(request.url).searchParams.get("employeeId")?.trim();
  if (!employeeId) return NextResponse.json({ error: "กรุณาระบุพนักงาน" }, { status: 400 });

  const startedAt = performance.now();
  try {
    const company = await getActiveCompany();
    if (!company) return NextResponse.json({ error: "กรุณาเลือกบริษัทก่อนใช้งาน" }, { status: 403 });
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId: company.id, deletedAt: null },
      select: { id: true },
    });
    if (!employee) return NextResponse.json({ error: "ไม่พบข้อมูลพนักงาน" }, { status: 404 });

    const reads = await Promise.allSettled([
      prisma.individualWorkTimeSetting.findMany({ where: { employeeId } }),
      prisma.individualShiftHolidaySetting.findUnique({ where: { employeeId } }),
      prisma.individualOvertimeSetting.findMany({ where: { employeeId } }),
      prisma.individualGeneralSetting.findUnique({ where: { employeeId } }),
    ]);
    const unexpected = reads.find((result) => result.status === "rejected" && !missingTable(result.reason));
    if (unexpected?.status === "rejected") throw unexpected.reason;

    const workTimeRecords = reads[0].status === "fulfilled" ? reads[0].value : [];
    const workTimeByType = new Map(workTimeRecords.map((record) => [record.workTimeType, record]));
    const workTime = WORK_TIME_DEFAULTS.map((fallback) => {
      const record = workTimeByType.get(fallback.type);
      return record ? { ...record, type: fallback.type } : fallback;
    });

    const overtimeRecords = reads[2].status === "fulfilled" ? reads[2].value : [];
    const overtimeByRule = new Map(overtimeRecords.map((record) => [record.ruleNumber, record]));
    const overtime = Array.from({ length: 8 }, (_, index) => {
      const fallback = overtimeDefault(index + 1);
      const record = overtimeByRule.get(index + 1);
      return record ? { ...record, wageRate: Number(record.wageRate) } : fallback;
    });

    return NextResponse.json({
      workTime,
      shiftHoliday: reads[1].status === "fulfilled" ? reads[1].value ?? SHIFT_DEFAULTS : SHIFT_DEFAULTS,
      overtime,
      general: reads[3].status === "fulfilled" ? reads[3].value ?? GENERAL_DEFAULTS : GENERAL_DEFAULTS,
      persistenceAvailable: reads.every((result) => result.status === "fulfilled"),
    }, {
      headers: {
        "Cache-Control": "private, no-store",
        "Server-Timing": `individual-settings;dur=${(performance.now() - startedAt).toFixed(1)}`,
        Vary: "Cookie",
      },
    });
  } catch (error) {
    console.error("GET /api/payroll/individual-settings-snapshot failed:", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดการตั้งค่ารายบุคคลได้" }, { status: 500 });
  }
}
