import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const WORK_TIME_TYPES = ["มาเช้า", "สาย", "พักเกิน", "พักไว", "กลับก่อน", "กลับช้า"] as const;

type WorkTimeType = (typeof WORK_TIME_TYPES)[number];
type WorkTimeSetting = {
  type: WorkTimeType;
  enabled: boolean;
  isPaid: boolean;
  countMin: number;
  countMax: number;
  countMethod: string;
  moneyMin: number | null;
  moneyMax: number | null;
  moneyMethod: string | null;
  calculationMethod: string | null;
  roundingMethod: string | null;
  calculationTargets: string[];
  calculationDayTypes: string[];
};

const DEFAULT_SETTINGS: WorkTimeSetting[] = [
  { type: "มาเช้า", enabled: true, isPaid: true, countMin: 0, countMax: 15, countMethod: "เริ่มนับทันที", moneyMin: 0, moneyMax: 15, moneyMethod: "เริ่มคำนวณทันที", calculationMethod: "1 เท่าของค่าแรง", roundingMethod: "ไม่ปัดเศษ", calculationTargets: [], calculationDayTypes: ["วันทำงาน"] },
  { type: "สาย", enabled: true, isPaid: false, countMin: 0, countMax: 480, countMethod: "เริ่มนับทันที", moneyMin: null, moneyMax: null, moneyMethod: null, calculationMethod: null, roundingMethod: null, calculationTargets: [], calculationDayTypes: [] },
  { type: "พักเกิน", enabled: true, isPaid: true, countMin: 0, countMax: 0, countMethod: "เริ่มนับทันที", moneyMin: 0, moneyMax: 0, moneyMethod: "เริ่มคำนวณทันที", calculationMethod: "1 เท่าของค่าแรง", roundingMethod: "ไม่ปัดเศษ", calculationTargets: [], calculationDayTypes: ["วันทำงาน"] },
  { type: "พักไว", enabled: true, isPaid: true, countMin: 0, countMax: 45, countMethod: "เริ่มนับทันที", moneyMin: 0, moneyMax: 0, moneyMethod: "เริ่มคำนวณทันที", calculationMethod: "0 เท่าของค่าแรง", roundingMethod: "ไม่ปัดเศษ", calculationTargets: [], calculationDayTypes: ["วันทำงาน"] },
  { type: "กลับก่อน", enabled: true, isPaid: true, countMin: 0, countMax: 0, countMethod: "เริ่มนับทันที", moneyMin: 0, moneyMax: 0, moneyMethod: "เริ่มคำนวณทันที", calculationMethod: "1 เท่าของค่าแรง", roundingMethod: "ไม่ปัดเศษ", calculationTargets: [], calculationDayTypes: ["วันทำงาน"] },
  { type: "กลับช้า", enabled: true, isPaid: true, countMin: 0, countMax: 0, countMethod: "เริ่มนับทันที", moneyMin: 10, moneyMax: 0, moneyMethod: "เริ่มได้รับเงินหลังเวลาเลิกงาน 10 นาที", calculationMethod: "1 เท่าของค่าแรง", roundingMethod: "ไม่ปัดเศษ", calculationTargets: [], calculationDayTypes: ["วันทำงาน"] },
];

function isWorkTimeType(value: unknown): value is WorkTimeType {
  return typeof value === "string" && WORK_TIME_TYPES.includes(value as WorkTimeType);
}

function integer(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function choiceList(value: unknown, allowed: readonly string[]) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !allowed.includes(item))) return null;
  return [...new Set(value)];
}

function isMissingSettingsTable(error: unknown) {
  const prismaError = error as { code?: unknown; message?: unknown } | null;
  return prismaError?.code === "P2021" ||
    typeof prismaError?.message === "string" && /IndividualWorkTimeSetting|does not exist|relation .* does not exist/i.test(prismaError.message);
}

function responseSettings(records: Array<Omit<WorkTimeSetting, "type"> & { workTimeType: string }>) {
  const recordByType = new Map(records.map((record) => [record.workTimeType, record]));
  return DEFAULT_SETTINGS.map((fallback) => {
    const record = recordByType.get(fallback.type);
    return record
      ? {
          type: fallback.type,
          countMin: record.countMin,
          countMax: record.countMax,
          countMethod: record.countMethod,
          moneyMin: record.moneyMin,
          moneyMax: record.moneyMax,
          moneyMethod: record.moneyMethod,
          calculationMethod: record.calculationMethod,
          roundingMethod: record.roundingMethod,
          enabled: record.enabled,
          isPaid: record.isPaid,
          calculationTargets: record.calculationTargets,
          calculationDayTypes: record.calculationDayTypes,
        }
      : fallback;
  });
}

export async function GET(request: Request) {
  const employeeId = new URL(request.url).searchParams.get("employeeId")?.trim();
  if (!employeeId) return NextResponse.json({ error: "กรุณาระบุพนักงาน" }, { status: 400 });

  try {
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, deletedAt: null }, select: { id: true } });
    if (!employee) return NextResponse.json({ error: "ไม่พบข้อมูลพนักงาน" }, { status: 404 });

    const records = await prisma.individualWorkTimeSetting.findMany({ where: { employeeId } });
    return NextResponse.json({ settings: responseSettings(records) });
  } catch (error) {
    if (isMissingSettingsTable(error)) {
      // Keep the original defaults usable while a deployment is applying the
      // accompanying migration.  A save remains unavailable until then.
      return NextResponse.json({ settings: DEFAULT_SETTINGS, persistenceAvailable: false });
    }
    console.error("GET /api/payroll/individual-work-time failed:", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดการตั้งค่าเวลาการทำงานได้" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const employeeId = typeof body?.employeeId === "string" ? body.employeeId.trim() : "";
  const type = body?.type;
  const countMin = integer(body?.countMin);
  const countMax = integer(body?.countMax);
  const moneyMin = body?.moneyMin === null ? null : integer(body?.moneyMin);
  const moneyMax = body?.moneyMax === null ? null : integer(body?.moneyMax);
  const countMethod = optionalText(body?.countMethod);
  const calculationTargets = choiceList(body?.calculationTargets, ["ประกันสังคม", "กองทุนสำรองเลี้ยงชีพ", "ภาษี", "ภาษีลาออก"]);
  const calculationDayTypes = choiceList(body?.calculationDayTypes, ["วันทำงาน", "วันหยุด", "วันหยุดนักขัตฤกษ์"]);
  // วันทำงานเป็นเงื่อนไขบังคับของรายการที่จ่ายเงิน และถูกล็อกไว้ใน
  // UI จึงเติมให้ที่ API ด้วย เพื่อรองรับข้อมูลรายการเดิมที่ยังไม่มีค่านี้
  // และป้องกันการบันทึกล้มเหลวเมื่อผู้ใช้ไม่ได้เปลี่ยนช่องดังกล่าว.
  const normalizedCalculationDayTypes = calculationDayTypes === null
    ? null
    : body?.isPaid === true
      ? [...new Set(["วันทำงาน", ...calculationDayTypes])]
      : calculationDayTypes;

  const hasValidMoneyMin = body?.moneyMin === null || moneyMin !== null;
  const hasValidMoneyMax = body?.moneyMax === null || moneyMax !== null;
  if (!employeeId || !isWorkTimeType(type) || typeof body?.enabled !== "boolean" || typeof body?.isPaid !== "boolean" || countMin === null || countMax === null || countMin > 600 || countMax > 600 || !countMethod || !hasValidMoneyMin || !hasValidMoneyMax || moneyMin !== null && moneyMin > 15 || moneyMax !== null && moneyMax > 15 || calculationTargets === null || normalizedCalculationDayTypes === null) {
    return NextResponse.json({ error: "ข้อมูลการตั้งค่าเวลาการทำงานไม่ถูกต้อง" }, { status: 400 });
  }
  if (countMax !== 0 && countMax < countMin || moneyMin !== null && moneyMax !== null && moneyMax !== 0 && moneyMax < moneyMin) {
    return NextResponse.json({ error: "ค่าสูงสุดต้องไม่น้อยกว่าค่าต่ำสุด" }, { status: 400 });
  }

  const setting = {
    countMin,
    countMax,
    enabled: body.enabled,
    isPaid: body.isPaid,
    countMethod,
    moneyMin,
    moneyMax,
    moneyMethod: optionalText(body?.moneyMethod),
    calculationMethod: optionalText(body?.calculationMethod),
    roundingMethod: optionalText(body?.roundingMethod),
    calculationTargets,
    calculationDayTypes: normalizedCalculationDayTypes,
  };

  try {
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, deletedAt: null }, select: { id: true } });
    if (!employee) return NextResponse.json({ error: "ไม่พบข้อมูลพนักงาน" }, { status: 404 });

    await prisma.$transaction([
      prisma.individualWorkTimeSetting.upsert({
        where: { employeeId_workTimeType: { employeeId, workTimeType: type } },
        create: { id: crypto.randomUUID(), employeeId, workTimeType: type, ...setting },
        update: setting,
      }),
      prisma.employeeTimeline.create({
        data: {
          id: crypto.randomUUID(),
          employeeId,
          eventType: "salaryChange",
          title: "แก้ไขการตั้งค่าเวลาการทำงาน (รายบุคคล)",
          description: `แก้ไขประเภทเวลาการทำงาน: ${type}`,
          eventDate: new Date(),
        },
      }),
    ]);

    const records = await prisma.individualWorkTimeSetting.findMany({ where: { employeeId } });
    return NextResponse.json({ settings: responseSettings(records) });
  } catch (error) {
    if (isMissingSettingsTable(error)) {
      return NextResponse.json({ error: "ยังไม่พบตารางการตั้งค่าเวลาการทำงาน กรุณานำ migration ฐานข้อมูลไปใช้ก่อนบันทึก" }, { status: 503 });
    }
    console.error("PATCH /api/payroll/individual-work-time failed:", error);
    return NextResponse.json({ error: "ไม่สามารถบันทึกการตั้งค่าเวลาการทำงานได้" }, { status: 500 });
  }
}
