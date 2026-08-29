import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code")?.trim();

    if (!code) {
      return NextResponse.json({ duplicate: false });
    }

    const existing = await prisma.employee.findFirst({
      where: { employeeCode: code, deletedAt: null },
      select: { id: true, employeeNumber: true, firstNameTH: true, lastNameTH: true },
    });

    if (existing) {
      return NextResponse.json({
        duplicate: true,
        existingEmployee: {
          employeeNumber: existing.employeeNumber,
          fullName: `${existing.firstNameTH} ${existing.lastNameTH}`.trim(),
        },
      });
    }

    return NextResponse.json({ duplicate: false });
  } catch (err) {
    console.error("GET /api/employee/check-code failed:", err);
    return NextResponse.json({ duplicate: false });
  }
}
