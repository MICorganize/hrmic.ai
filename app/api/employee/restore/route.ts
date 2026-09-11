import { NextResponse } from "next/server";

import { verifyPassword } from "@/lib/encryption/password";
import { getActiveCompany } from "@/lib/active-company";
import { effectiveEmployeeLimit, employeeCapacityMessage } from "@/lib/employee/limit";
import { refreshEmployeeSummarySnapshot } from "@/lib/employee/summary";
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
    const company = await getActiveCompany();
    if (!company) return NextResponse.json({ error: "กรุณาเลือกบริษัทก่อนใช้งาน" }, { status: 403 });
    const existingEmployees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        deletedAt: { not: null },
        companyId: company.id,
      },
      select: { id: true, companyId: true, firstNameTH: true, lastNameTH: true, employeeNumber: true },
    });

    if (existingEmployees.length === 0) {
      return NextResponse.json(
        { error: "ไม่พบพนักงานที่ต้องการกู้คืน" },
        { status: 404 }
      );
    }

    const existingIds = existingEmployees.map((e) => e.id);
    const companyIds = [...new Set(existingEmployees.map((employee) => employee.companyId))];
    const [companies, activeCounts] = await Promise.all([
      prisma.company.findMany({
        where: { id: { in: companyIds }, deletedAt: null },
        select: { id: true, employeeLimit: true },
      }),
      prisma.employee.groupBy({
        by: ["companyId"],
        where: { companyId: { in: companyIds }, deletedAt: null },
        _count: { _all: true },
      }),
    ]);
    const companyLimits = new Map(companies.map((company) => [company.id, effectiveEmployeeLimit(company.employeeLimit)]));
    const activeCountByCompany = new Map(activeCounts.map((entry) => [entry.companyId, entry._count._all]));
    const restoringCountByCompany = new Map<string, number>();
    for (const employee of existingEmployees) {
      restoringCountByCompany.set(employee.companyId, (restoringCountByCompany.get(employee.companyId) ?? 0) + 1);
    }
    for (const [companyId, restoringCount] of restoringCountByCompany) {
      const employeeLimit = companyLimits.get(companyId) ?? effectiveEmployeeLimit(null);
      if ((activeCountByCompany.get(companyId) ?? 0) + restoringCount > employeeLimit) {
        return NextResponse.json({ error: employeeCapacityMessage(employeeLimit) }, { status: 409 });
      }
    }

    // Restore — clear deletedAt and deletedBy
    const now = new Date();
    const result = await prisma.employee.updateMany({
      where: { id: { in: existingIds }, companyId: company.id },
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
    if (company) await refreshEmployeeSummarySnapshot(company.id);

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
