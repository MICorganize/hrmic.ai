import { NextResponse } from "next/server";

import { verifyPassword } from "@/lib/encryption/password";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      employeeIds?: string[];
      username?: string;
      password?: string;
      purgeAll?: boolean;
    } | null;

    if (!body) {
      return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 400 });
    }

    const { employeeIds, username, password, purgeAll } = body;

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

    // Build the where clause
    let where: Record<string, unknown>;

    if (purgeAll) {
      // Purge ALL soft-deleted employees (no retention check)
      where = { deletedAt: { not: null } };
    } else if (Array.isArray(employeeIds) && employeeIds.length > 0) {
      // Purge specific employees — must be soft-deleted
      where = {
        id: { in: employeeIds },
        deletedAt: { not: null },
      };
    } else {
      return NextResponse.json(
        { error: "กรุณาเลือกพนักงานที่ต้องการลบถาวร" },
        { status: 400 }
      );
    }

    // Find employees to purge
    const employees = await prisma.employee.findMany({
      where,
      select: {
        id: true,
        employeeNumber: true,
        firstNameTH: true,
        lastNameTH: true,
      },
    });

    if (employees.length === 0) {
      return NextResponse.json(
        { error: "ไม่พบพนักงานที่ต้องการลบถาวร" },
        { status: 404 }
      );
    }

    const employeeIdsToPurge = employees.map((e) => e.id);

    // Hard delete — cascade will handle related records
    const result = await prisma.employee.deleteMany({
      where: { id: { in: employeeIdsToPurge } },
    });

    return NextResponse.json({
      success: true,
      purged: result.count,
      employees: employees.map((e) => ({
        id: e.id,
        name: `${e.firstNameTH} ${e.lastNameTH}`.trim(),
        number: e.employeeNumber,
      })),
    });
  } catch (err) {
    console.error("POST /api/employee/purge failed:", err);
    return NextResponse.json(
      { error: "ไม่สามารถลบข้อมูลถาวรได้ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
