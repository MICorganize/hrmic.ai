import { NextResponse } from "next/server";

import { getActiveCompany } from "@/lib/active-company";
import { companyPeriodKey } from "@/lib/payroll/company-period";
import { prisma } from "@/lib/prisma";
import { CLOSED_PAYROLL_PERIOD_MESSAGE, isPayrollPeriodClosed } from "@/lib/payroll/period-lock";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type PayrollRunSummary = {
  paymentDate: Date | null;
  taxPaymentDate: Date | null;
  status: "draft" | "processing" | "approved" | "paid";
  closedAt: Date | null;
  _count: { PayrollItem: number };
};

function dateKey(value: Date | null) {
  return value?.toISOString().slice(0, 10) ?? "";
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date
    : null;
}

function requestedMonth(request: Request) {
  const month = new URL(request.url).searchParams.get("month")?.trim();
  return month && MONTH_PATTERN.test(month) ? month : null;
}

function responseState(run: PayrollRunSummary | null) {
  return {
    paymentDate: dateKey(run?.paymentDate ?? null),
    taxPaymentDate: dateKey(run?.taxPaymentDate ?? null),
    isClosed: run?.status === "paid",
    closedAt: run?.closedAt?.toISOString() ?? null,
    employeeCount: run?._count.PayrollItem ?? 0,
  };
}

export async function GET(request: Request) {
  const month = requestedMonth(request);
  if (!month) return NextResponse.json({ error: "รูปแบบเดือนต้องเป็น YYYY-MM" }, { status: 400 });

  try {
    const company = await getActiveCompany();
    const period = companyPeriodKey(month, company?.id);
    const run = await prisma.payrollRun.findUnique({
      where: { period },
      select: {
        paymentDate: true,
        taxPaymentDate: true,
        status: true,
        closedAt: true,
        _count: { select: { PayrollItem: true } },
      },
    });
    return NextResponse.json(responseState(run));
  } catch (error) {
    console.error("GET /api/payroll/close-period failed:", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดข้อมูลปิดงวดบัญชีได้" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as { month?: unknown; paymentDate?: unknown; taxPaymentDate?: unknown } | null;
  const month = typeof body?.month === "string" && MONTH_PATTERN.test(body.month) ? body.month : null;
  const paymentDate = parseDate(body?.paymentDate);
  const taxPaymentDate = parseDate(body?.taxPaymentDate);

  if (!month || !paymentDate || !taxPaymentDate) {
    return NextResponse.json({ error: "กรุณาระบุวันที่จ่ายและวันที่จ่ายภาษีให้ถูกต้อง" }, { status: 400 });
  }

  try {
    const company = await getActiveCompany();
    const period = companyPeriodKey(month, company?.id);
    if (await isPayrollPeriodClosed(period)) {
      return NextResponse.json({ error: CLOSED_PAYROLL_PERIOD_MESSAGE }, { status: 409 });
    }
    const run = await prisma.payrollRun.upsert({
      where: { period },
      create: {
        id: crypto.randomUUID(),
        period,
        paymentDate,
        taxPaymentDate,
        updatedAt: new Date(),
      },
      update: { paymentDate, taxPaymentDate, updatedAt: new Date() },
      select: {
        paymentDate: true,
        taxPaymentDate: true,
        status: true,
        closedAt: true,
        _count: { select: { PayrollItem: true } },
      },
    });
    return NextResponse.json(responseState(run));
  } catch (error) {
    console.error("PUT /api/payroll/close-period failed:", error);
    return NextResponse.json({ error: "ไม่สามารถบันทึกวันที่จ่ายได้" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { month?: unknown } | null;
  const month = typeof body?.month === "string" && MONTH_PATTERN.test(body.month) ? body.month : null;
  if (!month) return NextResponse.json({ error: "รูปแบบเดือนต้องเป็น YYYY-MM" }, { status: 400 });

  try {
    const company = await getActiveCompany();
    const period = companyPeriodKey(month, company?.id);
    const existing = await prisma.payrollRun.findUnique({
      where: { period },
      select: { id: true, paymentDate: true, taxPaymentDate: true, status: true, _count: { select: { PayrollItem: true } } },
    });
    if (!existing?._count.PayrollItem) {
      return NextResponse.json({ error: "ยังไม่มีผลการคำนวณเงินเดือนสำหรับงวดนี้" }, { status: 400 });
    }
    if (!existing.paymentDate || !existing.taxPaymentDate) {
      return NextResponse.json({ error: "กรุณาบันทึกวันที่จ่ายและวันที่จ่ายภาษีก่อนปิดงวดบัญชี" }, { status: 400 });
    }

    const run = await prisma.payrollRun.update({
      where: { id: existing.id },
      data: { status: "paid", closedAt: new Date(), updatedAt: new Date() },
      select: {
        paymentDate: true,
        taxPaymentDate: true,
        status: true,
        closedAt: true,
        _count: { select: { PayrollItem: true } },
      },
    });
    return NextResponse.json(responseState(run));
  } catch (error) {
    console.error("POST /api/payroll/close-period failed:", error);
    return NextResponse.json({ error: "ไม่สามารถปิดงวดบัญชีได้" }, { status: 500 });
  }
}

/** Reopens a closed payroll period while retaining its saved payment dates. */
export async function DELETE(request: Request) {
  const month = requestedMonth(request);
  if (!month) return NextResponse.json({ error: "รูปแบบเดือนต้องเป็น YYYY-MM" }, { status: 400 });

  try {
    const company = await getActiveCompany();
    const period = companyPeriodKey(month, company?.id);
    const existing = await prisma.payrollRun.findUnique({
      where: { period },
      select: { id: true, status: true },
    });
    if (!existing) return NextResponse.json({ error: "ไม่พบงวดบัญชีที่ต้องการปลดล็อก" }, { status: 404 });

    const run = existing.status === "paid"
      ? await prisma.payrollRun.update({
          where: { id: existing.id },
          data: { status: "processing", closedAt: null, updatedAt: new Date() },
          select: {
            paymentDate: true,
            taxPaymentDate: true,
            status: true,
            closedAt: true,
            _count: { select: { PayrollItem: true } },
          },
        })
      : await prisma.payrollRun.findUniqueOrThrow({
          where: { id: existing.id },
          select: {
            paymentDate: true,
            taxPaymentDate: true,
            status: true,
            closedAt: true,
            _count: { select: { PayrollItem: true } },
          },
        });

    return NextResponse.json(responseState(run));
  } catch (error) {
    console.error("DELETE /api/payroll/close-period failed:", error);
    return NextResponse.json({ error: "ไม่สามารถปลดล็อกงวดบัญชีได้" }, { status: 500 });
  }
}
