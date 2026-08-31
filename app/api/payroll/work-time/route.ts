import { NextResponse } from "next/server";
import type { AttendanceStatus, LeaveType, WorkDayType } from "@/generated/prisma/client";

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

function parseWorkDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

function parseBangkokTime(date: Date, value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return undefined;
  const [hours, minutes] = value.split(":").map(Number);
  // Date-only payroll data is stored in UTC; clock-in/out is entered in Bangkok time.
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hours - 7, minutes));
}

const EDITABLE_ATTENDANCE_STATUS = new Set(["present", "late", "absent", "leave"]);
const EDITABLE_LEAVE_TYPES = new Set(["annual", "sick", "personal", "maternity", "unpaid"]);
const EDITABLE_DAY_TYPES = new Set(["work", "publicHoliday", "employeeHoliday", "specialHoliday"]);
const DAY_TYPE_LABELS: Record<WorkDayType, string> = {
  work: "วันทำงาน",
  publicHoliday: "วันหยุดนักขัตฤกษ์",
  employeeHoliday: "วันหยุดพนักงาน",
  specialHoliday: "วันหยุดพิเศษ",
};

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
          select: { date: true, checkIn: true, checkOut: true, overtimeMinutes: true, status: true, dayType: true },
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
      const dayType: WorkDayType = attendance?.dayType ?? (weekend ? "employeeHoliday" : "work");
      const isHoliday = dayType !== "work";
      const actualDuration = duration(attendance?.checkIn ?? null, attendance?.checkOut ?? null);
      const overtime = attendance?.overtimeMinutes
        ? `${String(Math.floor(attendance.overtimeMinutes / 60)).padStart(2, "0")}:${String(attendance.overtimeMinutes % 60).padStart(2, "0")}:00`
        : undefined;

      rows.push({
        date: textDate,
        day: THAI_DAYS[date.getUTCDay()],
        type: isHoliday ? "holiday" : "work",
        status: DAY_TYPE_LABELS[dayType],
        hours: "07:30:00",
        shiftName: "WC001",
        shiftPeriods: "08:30 - 12:00 - 13:00 - 17:00",
        calculatedHours: leave || weekend ? "00:00:00" : actualDuration ?? "07:30:00",
        inTime: timeInBangkok(attendance?.checkIn ?? null),
        outTime: timeInBangkok(attendance?.checkOut ?? null),
        overtime,
        leave: leave ? LEAVE_LABELS[leave.type] ?? leave.type : undefined,
        note: leave?.reason ?? undefined,
        attendanceStatus: attendance?.status,
        dayType,
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

/** Persists the values edited from the small pencil controls in the work-time grid. */
export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
    employeeId?: unknown;
    date?: unknown;
    time?: unknown;
    slot?: unknown;
    status?: unknown;
    checkIn?: unknown;
    checkOut?: unknown;
    overtimeMinutes?: unknown;
    leaveType?: unknown;
    reason?: unknown;
    dayType?: unknown;
  } | null;
  const action = typeof body?.action === "string" ? body.action : null;
  const slot = body?.slot === "IN" || body?.slot === "OUT" ? body.slot : null;
  const employeeId = typeof body?.employeeId === "string" ? body.employeeId.trim() : "";
  const date = parseWorkDate(body?.date);
  const addedTime = date ? parseBangkokTime(date, body?.time) : undefined;
  const status = typeof body?.status === "string" ? body.status : "present";
  const checkIn = date ? parseBangkokTime(date, body?.checkIn) : undefined;
  const checkOut = date ? parseBangkokTime(date, body?.checkOut) : undefined;
  const overtimeMinutes = Number(body?.overtimeMinutes ?? 0);
  const leaveType = typeof body?.leaveType === "string" && body.leaveType ? body.leaveType : null;
  const reason = typeof body?.reason === "string" && body.reason.trim() ? body.reason.trim() : null;
  const dayType = typeof body?.dayType === "string" ? body.dayType : null;

  if (action === "setTime") {
    if (!employeeId || !date || !slot || !addedTime) {
      return NextResponse.json({ error: "กรุณาระบุเวลาในรูปแบบ HH:mm" }, { status: 400 });
    }
    try {
      const employee = await prisma.employee.findFirst({ where: { id: employeeId, deletedAt: null }, select: { id: true } });
      if (!employee) return NextResponse.json({ error: "ไม่พบข้อมูลพนักงาน" }, { status: 404 });
      const attendance = await prisma.attendanceRecord.findUnique({
        where: { employeeId_date: { employeeId, date } },
        select: { checkIn: true, checkOut: true },
      });
      if (slot === "IN" && attendance?.checkOut && addedTime >= attendance.checkOut) {
        return NextResponse.json({ error: "เวลาเข้างานต้องก่อนเวลาออกงาน" }, { status: 400 });
      }
      if (slot === "OUT" && attendance?.checkIn && addedTime <= attendance.checkIn) {
        return NextResponse.json({ error: "เวลาออกงานต้องหลังเวลาเข้างาน" }, { status: 400 });
      }
      await prisma.attendanceRecord.upsert({
        where: { employeeId_date: { employeeId, date } },
        create: {
          id: crypto.randomUUID(),
          employeeId,
          date,
          ...(slot === "IN" ? { checkIn: addedTime } : { checkOut: addedTime }),
          status: "present",
        },
        update: slot === "IN" ? { checkIn: addedTime } : { checkOut: addedTime },
      });
      return GET(new Request(`http://local/api/payroll/work-time?employeeId=${encodeURIComponent(employeeId)}&month=${dateKey(date).slice(0, 7)}`));
    } catch (error) {
      console.error("PATCH /api/payroll/work-time set time failed:", error);
      return NextResponse.json({ error: "ไม่สามารถบันทึกเวลาทำงานได้" }, { status: 500 });
    }
  }

  if (action === "removeTime") {
    if (!employeeId || !date || !slot) {
      return NextResponse.json({ error: "ข้อมูลเวลาทำงานไม่ถูกต้อง" }, { status: 400 });
    }
    try {
      const employee = await prisma.employee.findFirst({ where: { id: employeeId, deletedAt: null }, select: { id: true } });
      if (!employee) return NextResponse.json({ error: "ไม่พบข้อมูลพนักงาน" }, { status: 404 });
      const attendance = await prisma.attendanceRecord.findUnique({ where: { employeeId_date: { employeeId, date } }, select: { id: true } });
      if (attendance) {
        await prisma.attendanceRecord.update({
          where: { employeeId_date: { employeeId, date } },
          data: slot === "IN" ? { checkIn: null } : { checkOut: null },
        });
      }
      return GET(new Request(`http://local/api/payroll/work-time?employeeId=${encodeURIComponent(employeeId)}&month=${dateKey(date).slice(0, 7)}`));
    } catch (error) {
      console.error("PATCH /api/payroll/work-time remove time failed:", error);
      return NextResponse.json({ error: "ไม่สามารถลบเวลาทำงานได้" }, { status: 500 });
    }
  }

  if (action === "addTime") {
    if (!employeeId || !date || !addedTime) {
      return NextResponse.json({ error: "กรุณาระบุเวลาในรูปแบบ HH:mm" }, { status: 400 });
    }

    try {
      const employee = await prisma.employee.findFirst({ where: { id: employeeId, deletedAt: null }, select: { id: true } });
      if (!employee) return NextResponse.json({ error: "ไม่พบข้อมูลพนักงาน" }, { status: 404 });

      const attendance = await prisma.attendanceRecord.findUnique({
        where: { employeeId_date: { employeeId, date } },
        select: { checkIn: true, checkOut: true },
      });

      if (attendance?.checkOut) {
        return NextResponse.json({ error: "วันทำงานนี้มีเวลาเข้าและเวลาออกครบแล้ว" }, { status: 409 });
      }
      if (attendance?.checkIn && addedTime <= attendance.checkIn) {
        return NextResponse.json({ error: "เวลาออกงานต้องหลังเวลาเข้างาน" }, { status: 400 });
      }

      await prisma.attendanceRecord.upsert({
        where: { employeeId_date: { employeeId, date } },
        create: {
          id: crypto.randomUUID(),
          employeeId,
          date,
          checkIn: addedTime,
          status: "present",
        },
        update: attendance?.checkIn ? { checkOut: addedTime } : { checkIn: addedTime },
      });

      return GET(new Request(`http://local/api/payroll/work-time?employeeId=${encodeURIComponent(employeeId)}&month=${dateKey(date).slice(0, 7)}`));
    } catch (error) {
      console.error("PATCH /api/payroll/work-time add time failed:", error);
      return NextResponse.json({ error: "ไม่สามารถบันทึกเวลาทำงานได้" }, { status: 500 });
    }
  }

  if (dayType !== null) {
    if (!employeeId || !date || !EDITABLE_DAY_TYPES.has(dayType)) {
      return NextResponse.json({ error: "ประเภทวันทำงานไม่ถูกต้อง" }, { status: 400 });
    }
    try {
      const employee = await prisma.employee.findFirst({ where: { id: employeeId, deletedAt: null }, select: { id: true } });
      if (!employee) return NextResponse.json({ error: "ไม่พบข้อมูลพนักงาน" }, { status: 404 });
      const selectedDayType = dayType as WorkDayType;
      await prisma.attendanceRecord.upsert({
        where: { employeeId_date: { employeeId, date } },
        create: {
          id: crypto.randomUUID(),
          employeeId,
          date,
          status: selectedDayType === "work" ? "present" : "absent",
          dayType: selectedDayType,
        },
        update: { dayType: selectedDayType },
      });
      return GET(new Request(`http://local/api/payroll/work-time?employeeId=${encodeURIComponent(employeeId)}&month=${dateKey(date).slice(0, 7)}`));
    } catch (error) {
      console.error("PATCH /api/payroll/work-time day type failed:", error);
      return NextResponse.json({ error: "ไม่สามารถบันทึกประเภทวันทำงานได้" }, { status: 500 });
    }
  }

  if (!employeeId || !date || !EDITABLE_ATTENDANCE_STATUS.has(status)) {
    return NextResponse.json({ error: "ข้อมูลวันทำงานไม่ถูกต้อง" }, { status: 400 });
  }
  if (checkIn === undefined || checkOut === undefined || !Number.isInteger(overtimeMinutes) || overtimeMinutes < 0) {
    return NextResponse.json({ error: "รูปแบบเวลา หรือจำนวนโอทีไม่ถูกต้อง" }, { status: 400 });
  }
  if (checkIn && checkOut && checkOut <= checkIn) {
    return NextResponse.json({ error: "เวลาออกงานต้องหลังเวลาเข้างาน" }, { status: 400 });
  }
  if (leaveType && !EDITABLE_LEAVE_TYPES.has(leaveType)) {
    return NextResponse.json({ error: "ประเภทการลาไม่ถูกต้อง" }, { status: 400 });
  }

  const attendanceStatus = (leaveType ? "leave" : status) as AttendanceStatus;
  const selectedLeaveType = leaveType as LeaveType | null;

  try {
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, deletedAt: null }, select: { id: true } });
    if (!employee) return NextResponse.json({ error: "ไม่พบข้อมูลพนักงาน" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.attendanceRecord.upsert({
        where: { employeeId_date: { employeeId, date } },
        create: {
          id: crypto.randomUUID(),
          employeeId,
          date,
          checkIn,
          checkOut,
          overtimeMinutes,
          status: attendanceStatus,
        },
        update: {
          checkIn,
          checkOut,
          overtimeMinutes,
          status: attendanceStatus,
        },
      });

      if (selectedLeaveType) {
        const existingLeave = await tx.leaveRequest.findFirst({
          where: {
            employeeId,
            deletedAt: null,
            startDate: { lte: date },
            endDate: { gte: date },
          },
          orderBy: { createdAt: "desc" },
        });
        if (existingLeave) {
          await tx.leaveRequest.update({
            where: { id: existingLeave.id },
            data: { type: selectedLeaveType, reason, status: "approved", updatedAt: new Date() },
          });
        } else {
          await tx.leaveRequest.create({
            data: {
              id: crypto.randomUUID(),
              employeeId,
              type: selectedLeaveType,
              startDate: date,
              endDate: date,
              days: 1,
              reason,
              status: "approved",
              updatedAt: new Date(),
            },
          });
        }
      }
    });

    return GET(new Request(`http://local/api/payroll/work-time?employeeId=${encodeURIComponent(employeeId)}&month=${dateKey(date).slice(0, 7)}`));
  } catch (error) {
    console.error("PATCH /api/payroll/work-time failed:", error);
    return NextResponse.json({ error: "ไม่สามารถบันทึกข้อมูลวันทำงานได้" }, { status: 500 });
  }
}
