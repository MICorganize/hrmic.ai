import { NextResponse } from "next/server";

import { verifyPassword } from "@/lib/encryption/password";
import { getActiveCompany } from "@/lib/active-company";
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

    // Validate inputs
    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json(
        { error: "กรุณาเลือกพนักงานที่ต้องการลบ" },
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

    // Check that all employee IDs exist and are not already deleted
    const company = await getActiveCompany();
    const existingEmployees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        deletedAt: null,
        ...(company ? { companyId: company.id } : {}),
      },
      select: { id: true },
    });

    if (existingEmployees.length === 0) {
      return NextResponse.json(
        { error: "ไม่พบพนักงานที่ต้องการลบ" },
        { status: 404 }
      );
    }

    const existingIds = new Set(existingEmployees.map((e) => e.id));
    const notFoundIds = employeeIds.filter((id) => !existingIds.has(id));

    // Soft delete — set deletedAt and deletedBy
    const now = new Date();
    const result = await prisma.employee.updateMany({
      where: {
        id: { in: [...existingIds] },
        ...(company ? { companyId: company.id } : {}),
      },
      data: {
        deletedAt: now,
        deletedBy: user.id,
      },
    });

    // Log to timeline for each deleted employee
    const timelineEntries = existingEmployees.map((emp) => ({
      id: crypto.randomUUID(),
      employeeId: emp.id,
      eventType: "leaveCompany" as const,
      title: "ลบข้อมูลพนักงาน (Soft Delete)",
      description: `ลบพนักงานโดย ${user.name ?? user.email}`,
      eventDate: now,
      createdBy: user.id,
    }));

    if (timelineEntries.length > 0) {
      await prisma.employeeTimeline.createMany({ data: timelineEntries });
    }

    return NextResponse.json({
      success: true,
      deleted: result.count,
      notFound: notFoundIds,
    });
  } catch (err) {
    console.error("POST /api/employee/delete failed:", err);
    return NextResponse.json(
      { error: "ไม่สามารถลบข้อมูลพนักงานได้ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
