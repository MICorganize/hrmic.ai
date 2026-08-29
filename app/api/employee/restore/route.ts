import { NextResponse } from "next/server";

import { verifyPassword } from "@/lib/encryption/password";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      employeeIds?: string[];
      username?: string;
      password?: string;
    } | null;

    if (!body) {
      return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 400 });
    }

    const { employeeIds, username, password } = body;

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json(
        { error: "กรุณาเลือกพนักงานที่ต้องการกู้คืน" },
        { status: 400 }
      );
    }

    if (!username?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: "กรุณากรอก Username และ Password" },
        { status: 400 }
      );
    }

    // Verify credentials against the User table
    const user = await prisma.user.findUnique({
      where: { email: username.trim().toLowerCase() },
    });

    if (!user?.passwordHash) {
      return NextResponse.json(
        { error: "Username หรือ Password ไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Username หรือ Password ไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    // Find soft-deleted employees that match the IDs
    const existingEmployees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        deletedAt: { not: null },
      },
      select: { id: true, firstNameTH: true, lastNameTH: true, employeeNumber: true },
    });

    if (existingEmployees.length === 0) {
      return NextResponse.json(
        { error: "ไม่พบพนักงานที่ต้องการกู้คืน" },
        { status: 404 }
      );
    }

    const existingIds = existingEmployees.map((e) => e.id);

    // Restore — clear deletedAt and deletedBy
    const now = new Date();
    const result = await prisma.employee.updateMany({
      where: { id: { in: existingIds } },
      data: {
        deletedAt: null,
        deletedBy: null,
        updatedAt: now,
      },
    });

    // Log to timeline
    const timelineEntries = existingEmployees.map((emp) => ({
      id: crypto.randomUUID(),
      employeeId: emp.id,
      eventType: "hire" as const,
      title: "กู้คืนข้อมูลพนักงาน",
      description: `กู้คืนพนักงานโดย ${user.name ?? user.email}`,
      eventDate: now,
      createdBy: user.id,
    }));

    if (timelineEntries.length > 0) {
      await prisma.employeeTimeline.createMany({ data: timelineEntries });
    }

    return NextResponse.json({
      success: true,
      restored: result.count,
      employees: existingEmployees.map((e) => ({
        id: e.id,
        name: `${e.firstNameTH} ${e.lastNameTH}`.trim(),
        number: e.employeeNumber,
      })),
    });
  } catch (err) {
    console.error("POST /api/employee/restore failed:", err);
    return NextResponse.json(
      { error: "ไม่สามารถกู้คืนข้อมูลพนักงานได้ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
