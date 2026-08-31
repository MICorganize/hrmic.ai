import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function periodDates(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    end: new Date(Date.UTC(year, monthNumber, 1)),
  };
}

function numberValue(value: { toString(): string } | number | null | undefined) {
  return value == null ? 0 : Number(value.toString());
}

function isDisabledCalculation(value: string | null | undefined) {
  return !value || /ไม่คิด|none|disable|false/i.test(value);
}

async function getEmployeeCalculation(employeeId: string, month: string) {
  const { start, end } = periodDates(month);
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, deletedAt: null },
    include: {
      Salary: {
        where: { effectiveDate: { lte: end } },
        orderBy: { effectiveDate: "desc" },
        take: 1,
      },
      SocialSecurity: true,
      TaxInformation: true,
      ProvidentFund: true,
      AttendanceRecord: { where: { date: { gte: start, lt: end } } },
      LeaveRequest: {
        where: {
          status: "approved",
          startDate: { lt: end },
          endDate: { gte: start },
        },
      },
    },
  });

  if (!employee) return null;

  const salary = employee.Salary[0];
  const grossPay = numberValue(salary?.baseSalary ?? employee.baseSalary) + numberValue(salary?.allowance);
  const socialSecurity = isDisabledCalculation(employee.SocialSecurity?.calculationType)
    ? 0
    : numberValue(employee.SocialSecurity?.fixedAmount) || Math.min(grossPay, 15000) * 0.05;
  const providentFund = employee.ProvidentFund
    ? grossPay * (numberValue(employee.ProvidentFund.employeeRate) / 100)
    : 0;
  const tax = isDisabledCalculation(employee.TaxInformation?.calculationType)
    ? 0
    : numberValue(employee.TaxInformation?.fixedAmount);

  const attendance = employee.AttendanceRecord;
  const workingDays = attendance.filter((record) => record.status === "present" || record.status === "late").length;
  const actualMinutes = attendance.reduce((total, record) => {
    if (!record.checkIn || !record.checkOut) return total;
    return total + Math.max(0, Math.round((record.checkOut.getTime() - record.checkIn.getTime()) / 60000));
  }, 0);

  return {
    employee,
    period: { start, end },
    calculated: {
      grossPay,
      socialSecurity,
      providentFund,
      tax,
      deductions: socialSecurity + providentFund + tax,
      netPay: grossPay - socialSecurity - providentFund - tax,
    },
    time: {
      workingDays,
      leaveDays: employee.LeaveRequest.reduce((total, request) => total + numberValue(request.days), 0),
      actualMinutes,
    },
  };
}

async function historyFor(employeeId: string) {
  const events = await prisma.employeeTimeline.findMany({
    where: { employeeId },
    orderBy: [{ createdAt: "desc" }, { eventDate: "desc" }],
    take: 50,
    select: { id: true, title: true, description: true, eventDate: true, createdAt: true, createdBy: true },
  });
  const userIds = [...new Set(events.map((event) => event.createdBy).filter((id): id is string => Boolean(id)))];
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
    : [];
  const names = new Map(users.map((user) => [user.id, user.name]));
  return events.map((event) => ({
    id: event.id,
    date: event.createdAt.toISOString(),
    editor: event.createdBy ? names.get(event.createdBy) ?? "ระบบ" : "ระบบ",
    note: event.description ?? event.title,
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId")?.trim();
  const month = searchParams.get("month")?.trim();
  if (!employeeId || !month || !MONTH_PATTERN.test(month)) {
    return NextResponse.json({ error: "ระบุพนักงานและงวดเงินเดือนไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const data = await getEmployeeCalculation(employeeId, month);
    if (!data) return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 });
    const payrollRun = await prisma.payrollRun.findUnique({
      where: { period: month },
      include: { PayrollItem: { where: { employeeId } } },
    });
    const item = payrollRun?.PayrollItem[0];
    const history = await historyFor(employeeId);

    return NextResponse.json({
      calculation: item
        ? {
            id: item.id,
            status: payrollRun?.status ?? "draft",
            grossPay: numberValue(item.grossPay),
            deductions: numberValue(item.deductions),
            netPay: numberValue(item.netPay),
            calculatedAt: item.createdAt.toISOString(),
          }
        : null,
      preview: data.calculated,
      time: data.time,
      socialSecurity: data.calculated.socialSecurity,
      providentFund: data.calculated.providentFund,
      tax: data.calculated.tax,
      history,
    });
  } catch (error) {
    console.error("GET /api/payroll/personal failed:", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดข้อมูลคำนวณเงินเดือนรายบุคคลได้" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { employeeId?: string; month?: string; action?: "calculate" | "reset" } | null;
  const employeeId = body?.employeeId?.trim();
  const month = body?.month?.trim();
  if (!employeeId || !month || !MONTH_PATTERN.test(month) || !body?.action) {
    return NextResponse.json({ error: "คำขอคำนวณเงินเดือนไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const data = await getEmployeeCalculation(employeeId, month);
    if (!data) return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 });

    if (body.action === "reset") {
      const run = await prisma.payrollRun.findUnique({ where: { period: month }, select: { id: true } });
      if (run) {
        await prisma.$transaction([
          prisma.payrollItem.deleteMany({ where: { payrollRunId: run.id, employeeId } }),
          prisma.employeeTimeline.create({
            data: {
              id: crypto.randomUUID(),
              employeeId,
              eventType: "salaryChange",
              title: "รีเซ็ตการคำนวณเงินเดือน (รายบุคคล)",
              description: `รีเซ็ตงวด ${month}`,
              eventDate: new Date(),
            },
          }),
        ]);
      }
    } else {
      await prisma.$transaction(async (tx) => {
        const now = new Date();
        const run = await tx.payrollRun.upsert({
          where: { period: month },
          create: { id: crypto.randomUUID(), period: month, status: "processing", updatedAt: now, runAt: now },
          update: { status: "processing", updatedAt: now, runAt: now },
        });
        await tx.payrollItem.upsert({
          where: { payrollRunId_employeeId: { payrollRunId: run.id, employeeId } },
          create: {
            id: crypto.randomUUID(),
            payrollRunId: run.id,
            employeeId,
            grossPay: data.calculated.grossPay,
            deductions: data.calculated.deductions,
            netPay: data.calculated.netPay,
          },
          update: {
            grossPay: data.calculated.grossPay,
            deductions: data.calculated.deductions,
            netPay: data.calculated.netPay,
          },
        });
        await tx.employeeTimeline.create({
          data: {
            id: crypto.randomUUID(),
            employeeId,
            eventType: "salaryChange",
            title: "คำนวณเงินเดือน (รายบุคคล)",
            description: `คำนวณงวด ${month} ยอดสุทธิ ${data.calculated.netPay.toFixed(2)} บาท`,
            eventDate: now,
          },
        });
      });
    }

    return GET(new Request(`http://local/api/payroll/personal?employeeId=${encodeURIComponent(employeeId)}&month=${month}`));
  } catch (error) {
    console.error("POST /api/payroll/personal failed:", error);
    return NextResponse.json({ error: "ไม่สามารถบันทึกการคำนวณเงินเดือนได้" }, { status: 500 });
  }
}
