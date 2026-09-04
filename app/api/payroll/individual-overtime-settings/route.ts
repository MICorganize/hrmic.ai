import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { CLOSED_PAYROLL_PERIOD_MESSAGE, isPayrollPeriodClosed } from "@/lib/payroll/period-lock";

export const dynamic = "force-dynamic";

const RULE_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const COUNTING_CHOICES = ["immediate", "after"] as const;
const PAY_METHODS = ["wage-rate", "minute", "formula", "holiday"] as const;
const ROUND_MONEY_OPTIONS = ["none", "round"] as const;
const MAX_HOURS_OPTIONS = ["shift", "8", "12", "16", "24"] as const;
const ROUND_HOURS_OPTIONS = ["none", "10", "15", "20", "30", "60"] as const;
const CALCULATION_TARGETS = ["ประกันสังคม", "กองทุนสำรองเลี้ยงชีพ", "ภาษี", "ภาษีลาออก"] as const;

type OvertimeSetting = {
  ruleNumber: number;
  enabled: boolean;
  startMinutes: number;
  countingChoice: string;
  payMethod: string;
  wageRate: number;
  roundMoney: string;
  maxHours: string;
  roundHours: string;
  calculationTargets: string[];
};

function defaultSetting(ruleNumber: number): OvertimeSetting {
  return {
    ruleNumber,
    enabled: true,
    startMinutes: 0,
    countingChoice: "after",
    payMethod: "wage-rate",
    wageRate: ruleNumber === 2 ? 1.5 : ruleNumber >= 4 ? 3 : 1,
    roundMoney: "none",
    maxHours: "shift",
    roundHours: "none",
    calculationTargets: [],
  };
}

function isOneOf<T extends readonly string[]>(value: unknown, options: T): value is T[number] {
  return typeof value === "string" && options.includes(value as T[number]);
}

function integer(value: unknown, maximum: number) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= maximum ? value : null;
}

function rate(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1000 ? value : null;
}

function targets(value: unknown) {
  if (!Array.isArray(value) || value.some((item) => !isOneOf(item, CALCULATION_TARGETS))) return null;
  return [...new Set(value)];
}

function isMissingSettingsTable(error: unknown) {
  const prismaError = error as { code?: unknown; message?: unknown } | null;
  return prismaError?.code === "P2021" ||
    typeof prismaError?.message === "string" && /IndividualOvertimeSetting|does not exist|relation .* does not exist/i.test(prismaError.message);
}

function responseSettings(records: Array<Omit<OvertimeSetting, "wageRate"> & { wageRate: { toNumber: () => number } | number }>) {
  const recordByRule = new Map(records.map((record) => [record.ruleNumber, record]));
  return RULE_NUMBERS.map((ruleNumber) => {
    const record = recordByRule.get(ruleNumber);
    return record ? { ...record, wageRate: Number(record.wageRate) } : defaultSetting(ruleNumber);
  });
}

export async function GET(request: Request) {
  const employeeId = new URL(request.url).searchParams.get("employeeId")?.trim();
  if (!employeeId) return NextResponse.json({ error: "กรุณาระบุพนักงาน" }, { status: 400 });

  try {
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, deletedAt: null }, select: { id: true } });
    if (!employee) return NextResponse.json({ error: "ไม่พบข้อมูลพนักงาน" }, { status: 404 });

    const records = await prisma.individualOvertimeSetting.findMany({ where: { employeeId } });
    return NextResponse.json({ settings: responseSettings(records) });
  } catch (error) {
    if (isMissingSettingsTable(error)) return NextResponse.json({ settings: RULE_NUMBERS.map(defaultSetting), persistenceAvailable: false });
    console.error("GET /api/payroll/individual-overtime-settings failed:", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดการตั้งค่าโอทีได้" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const employeeId = typeof body?.employeeId === "string" ? body.employeeId.trim() : "";
  const month = typeof body?.month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(body.month) ? body.month : null;
  const ruleNumber = integer(body?.ruleNumber, 8);
  const startMinutes = integer(body?.startMinutes, 600);
  const wageRate = rate(body?.wageRate);
  const calculationTargets = targets(body?.calculationTargets);

  if (!employeeId || !month || ruleNumber === null || !RULE_NUMBERS.includes(ruleNumber as (typeof RULE_NUMBERS)[number]) || typeof body?.enabled !== "boolean" || startMinutes === null || !isOneOf(body?.countingChoice, COUNTING_CHOICES) || !isOneOf(body?.payMethod, PAY_METHODS) || wageRate === null || !isOneOf(body?.roundMoney, ROUND_MONEY_OPTIONS) || !isOneOf(body?.maxHours, MAX_HOURS_OPTIONS) || !isOneOf(body?.roundHours, ROUND_HOURS_OPTIONS) || calculationTargets === null) {
    return NextResponse.json({ error: "ข้อมูลการตั้งค่าโอทีไม่ถูกต้อง" }, { status: 400 });
  }

  const setting = {
    enabled: body.enabled,
    startMinutes,
    countingChoice: body.countingChoice,
    payMethod: body.payMethod,
    wageRate,
    roundMoney: body.roundMoney,
    maxHours: body.maxHours,
    roundHours: body.roundHours,
    calculationTargets,
  };

  try {
    if (await isPayrollPeriodClosed(month)) {
      return NextResponse.json({ error: CLOSED_PAYROLL_PERIOD_MESSAGE }, { status: 409 });
    }
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, deletedAt: null }, select: { id: true } });
    if (!employee) return NextResponse.json({ error: "ไม่พบข้อมูลพนักงาน" }, { status: 404 });

    await prisma.$transaction([
      prisma.individualOvertimeSetting.upsert({
        where: { employeeId_ruleNumber: { employeeId, ruleNumber } },
        create: { id: crypto.randomUUID(), employeeId, ruleNumber, ...setting },
        update: setting,
      }),
      prisma.employeeTimeline.create({
        data: {
          id: crypto.randomUUID(),
          employeeId,
          eventType: "salaryChange",
          title: "แก้ไขการตั้งค่าโอที (รายบุคคล)",
          description: `แก้ไขโอที (#${ruleNumber})`,
          eventDate: new Date(),
        },
      }),
    ]);

    const records = await prisma.individualOvertimeSetting.findMany({ where: { employeeId } });
    return NextResponse.json({ settings: responseSettings(records) });
  } catch (error) {
    if (isMissingSettingsTable(error)) {
      return NextResponse.json({ error: "ยังไม่พบตารางการตั้งค่าโอที กรุณานำ migration ฐานข้อมูลไปใช้ก่อนบันทึก" }, { status: 503 });
    }
    console.error("PATCH /api/payroll/individual-overtime-settings failed:", error);
    return NextResponse.json({ error: "ไม่สามารถบันทึกการตั้งค่าโอทีได้" }, { status: 500 });
  }
}
