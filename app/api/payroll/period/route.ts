import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type PayrollPeriod = {
  startDate: string;
  endDate: string;
  isConfigured: boolean;
};

function defaultPeriod(month: string): PayrollPeriod {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return {
    startDate: `${month}-01`,
    endDate: `${month}-${String(lastDay).padStart(2, "0")}`,
    isConfigured: false,
  };
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date
    : null;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function responsePeriod(month: string, run: { periodStart: Date | null; periodEnd: Date | null } | null): PayrollPeriod {
  if (!run?.periodStart || !run.periodEnd) return defaultPeriod(month);
  return {
    startDate: dateKey(run.periodStart),
    endDate: dateKey(run.periodEnd),
    isConfigured: true,
  };
}

function requestedMonth(request: Request) {
  const month = new URL(request.url).searchParams.get("month")?.trim();
  return month && MONTH_PATTERN.test(month) ? month : null;
}

export async function GET(request: Request) {
  const month = requestedMonth(request);
  if (!month) return NextResponse.json({ error: "รูปแบบเดือนต้องเป็น YYYY-MM" }, { status: 400 });

  try {
    const run = await prisma.payrollRun.findUnique({
      where: { period: month },
      select: { periodStart: true, periodEnd: true },
    });
    return NextResponse.json(responsePeriod(month, run));
  } catch (error) {
    console.error("GET /api/payroll/period failed:", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดงวดเงินเดือนได้" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    month?: unknown;
    startDate?: unknown;
    endDate?: unknown;
  } | null;
  const month = typeof body?.month === "string" && MONTH_PATTERN.test(body.month) ? body.month : null;
  const startDate = parseDate(body?.startDate);
  const endDate = parseDate(body?.endDate);

  if (!month || !startDate || !endDate || startDate > endDate) {
    return NextResponse.json({ error: "กรุณาระบุช่วงวันที่ของงวดเงินเดือนให้ถูกต้อง" }, { status: 400 });
  }

  try {
    const now = new Date();
    const run = await prisma.payrollRun.upsert({
      where: { period: month },
      create: {
        id: crypto.randomUUID(),
        period: month,
        periodStart: startDate,
        periodEnd: endDate,
        updatedAt: now,
      },
      update: { periodStart: startDate, periodEnd: endDate, updatedAt: now },
      select: { periodStart: true, periodEnd: true },
    });
    return NextResponse.json(responsePeriod(month, run));
  } catch (error) {
    console.error("PUT /api/payroll/period failed:", error);
    return NextResponse.json({ error: "ไม่สามารถบันทึกงวดเงินเดือนได้" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const month = requestedMonth(request);
  if (!month) return NextResponse.json({ error: "รูปแบบเดือนต้องเป็น YYYY-MM" }, { status: 400 });

  try {
    await prisma.payrollRun.updateMany({
      where: { period: month },
      data: { periodStart: null, periodEnd: null, updatedAt: new Date() },
    });
    return NextResponse.json(defaultPeriod(month));
  } catch (error) {
    console.error("DELETE /api/payroll/period failed:", error);
    return NextResponse.json({ error: "ไม่สามารถรีเซ็ตงวดเงินเดือนได้" }, { status: 500 });
  }
}
