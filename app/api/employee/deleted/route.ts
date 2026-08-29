import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export type DeletedEmployeeItem = {
  id: string;
  employeeNumber: string;
  employeeCode: string | null;
  firstNameTH: string;
  lastNameTH: string;
  departmentName: string;
  positionName: string;
  deletedAt: string;
  daysRemaining: number;
};

export type DeletedEmployeeListResponse = {
  items: DeletedEmployeeItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const RETENTION_DAYS = 45;

function formatDate(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${date.getUTCFullYear()}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 10));

    const where: Record<string, unknown> = {
      deletedAt: { not: null },
    };

    if (search) {
      where.OR = [
        { employeeNumber: { contains: search } },
        { employeeCode: { contains: search } },
        { firstNameTH: { contains: search } },
        { lastNameTH: { contains: search } },
      ];
    }

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        select: {
          id: true,
          employeeNumber: true,
          employeeCode: true,
          firstNameTH: true,
          lastNameTH: true,
          deletedAt: true,
          Department: { select: { name: true } },
          Position: { select: { name: true } },
        },
        orderBy: { deletedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.employee.count({ where }),
    ]);

    const now = new Date();

    const items: DeletedEmployeeItem[] = employees.map((emp) => {
      const deletedDate = new Date(emp.deletedAt!);
      const diffMs = now.getTime() - deletedDate.getTime();
      const daysPassed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const daysRemaining = Math.max(0, RETENTION_DAYS - daysPassed);

      return {
        id: emp.id,
        employeeNumber: emp.employeeNumber,
        employeeCode: emp.employeeCode,
        firstNameTH: emp.firstNameTH,
        lastNameTH: emp.lastNameTH,
        departmentName: emp.Department?.name ?? "ไม่ระบุ",
        positionName: emp.Position?.name ?? "ไม่ระบุ",
        deletedAt: formatDate(deletedDate),
        daysRemaining,
      };
    });

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    } satisfies DeletedEmployeeListResponse);
  } catch (err) {
    console.error("GET /api/employee/deleted failed:", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดรายชื่อพนักงานที่ลบได้" },
      { status: 500 }
    );
  }
}
