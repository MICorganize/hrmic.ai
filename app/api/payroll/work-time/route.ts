import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const THAI_DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];
const LEAVE_LABELS: Record<string, string> = {
  annual: "ลาพักร้อน",
  sick: "ลาป่วย",
  personal: "ลากิจ",
  maternity: "ลาคลอด",
  unpaid: "ลาไม่รับค่าจ้าง",
};

function parseMonth(value: string | null) {
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
  const [year, month] = value.split("-").map(Number);
  return { year, month };
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function displayDate(value: Date) {
  return `${String(value.getUTCDate()).padStart(2, "0")}/${String(value.getUTCMonth() + 1).padStart(2, "0")}/${value.getUTCFullYear()}`;
}

function timeInBangkok(value: Date | null) {
  if (!value) return undefined;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(value);
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;
  return hour && minute ? `${hour}:${minute}` : undefined;
}

function duration(checkIn: Date | null, checkOut: Date | null) {
  if (!checkIn || !checkOut || checkOut <= checkIn) return undefined;
  const seconds = Math.floor((checkOut.getTime() - checkIn.getTime()) / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

/**
 * Returns the work-time rows from the application's persisted employee,
 * attendance, and approved-leave records.  The current schema has no work
 * cycle entity, therefore WC001 is the normal-period fallback used by the
 * original calculation screen when no per-employee schedule is stored.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId")?.trim();
  const selectedMonth = parseMonth(searchParams.get("month"));

  if (!employeeId || !selectedMonth) {
    return NextResponse.json({ error: "กรุณาระบุพนักงานและเดือนในรูปแบบ YYYY-MM" }, { status: 400 });
  }

  const periodStart = new Date(Date.UTC(selectedMonth.year, selectedMonth.month - 1, 1));
  const periodEnd = new Date(Date.UTC(selectedMonth.year, selectedMonth.month, 1));

  try {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, deletedAt: null },
      select: {
        id: true,
        employeeCode: true,
        hireDate: true,
        terminationDate: true,
        AttendanceRecord: {
          where: { date: { gte: periodStart, lt: periodEnd } },
          select: { date: true, checkIn: true, checkOut: true, overtimeMinutes: true, status: true },
        },
        LeaveRequest: {
          where: {
            deletedAt: null,
            status: "approved",
            startDate: { lt: periodEnd },
            endDate: { gte: periodStart },
          },
          select: { type: true, startDate: true, endDate: true, reason: true },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "ไม่พบข้อมูลพนักงาน" }, { status: 404 });
    }

    const attendanceByDate = new Map(employee.AttendanceRecord.map((record) => [dateKey(record.date), record]));
    const rows = [];
    const naDates = [];

    for (let cursor = new Date(periodStart); cursor < periodEnd; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const date = new Date(cursor);
      const key = dateKey(date);
      const textDate = displayDate(date);
      const beforeHire = date < employee.hireDate;
      const afterTermination = employee.terminationDate !== null && date > employee.terminationDate;

      if (beforeHire || afterTermination) {
        naDates.push(textDate);
        continue;
      }

      const leave = employee.LeaveRequest.find((request) => date >= request.startDate && date <= request.endDate);
      const attendance = attendanceByDate.get(key);
      const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
      const isHoliday = weekend || Boolean(leave);
      const actualDuration = duration(attendance?.checkIn ?? null, attendance?.checkOut ?? null);
      const overtime = attendance?.overtimeMinutes
        ? `${String(Math.floor(attendance.overtimeMinutes / 60)).padStart(2, "0")}:${String(attendance.overtimeMinutes % 60).padStart(2, "0")}:00`
        : undefined;

      rows.push({
        date: textDate,
        day: THAI_DAYS[date.getUTCDay()],
        type: isHoliday ? "holiday" : "work",
        status: leave ? LEAVE_LABELS[leave.type] ?? leave.type : weekend ? "วันหยุดพนักงาน" : "วันทำงาน",
        hours: "07:30:00",
        shiftName: "WC001",
        shiftPeriods: "08:30 - 12:00 - 13:00 - 17:00",
        calculatedHours: leave || weekend ? "00:00:00" : actualDuration ?? "07:30:00",
        inTime: timeInBangkok(attendance?.checkIn ?? null),
        outTime: timeInBangkok(attendance?.checkOut ?? null),
        overtime,
        leave: leave ? LEAVE_LABELS[leave.type] ?? leave.type : undefined,
        note: leave?.reason ?? undefined,
      });
    }

    return NextResponse.json({
      employee: { id: employee.id, code: employee.employeeCode },
      period: { start: dateKey(periodStart), end: dateKey(new Date(periodEnd.getTime() - 86400000)) },
      rows,
      naDates,
    });
  } catch (error) {
    console.error("GET /api/payroll/work-time failed:", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดตารางเวลาการทำงานได้" }, { status: 500 });
  }
}
