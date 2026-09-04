import { NextResponse } from "next/server";

import { getActiveCompany } from "@/lib/active-company";
import { prisma } from "@/lib/prisma";

export type EmployeeListItem = {
  id: string;
  employeeNumber: string;
  employeeCode: string | null;
  firstNameTH: string;
  lastNameTH: string;
  status: string;
  departmentName: string;
  positionName: string;
};

const STATUS_MAP: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  terminated: "Terminated",
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const status = searchParams.get("status")?.trim() ?? "";
    const department = searchParams.get("department")?.trim() ?? "";
    const position = searchParams.get("position")?.trim() ?? "";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 10));

    const where: Record<string, unknown> = {
      deletedAt: null, // Exclude soft-deleted employees
    };
    const company = await getActiveCompany();
    if (company) where.companyId = company.id;

    // Search filter — match employee number, code, or name
    if (search) {
      where.OR = [
        { employeeNumber: { contains: search } },
        { employeeCode: { contains: search } },
        { firstNameTH: { contains: search } },
        { lastNameTH: { contains: search } },
        { citizenId: { contains: search } },
      ];
    }

    // Status filter
    if (status && status !== "ทั้งหมด") {
      const statusKey = Object.entries(STATUS_MAP).find(
        ([, v]) => v === status
      )?.[0];
      if (statusKey) {
        where.status = statusKey;
      }
    }

    // Department filter
    if (department) {
      where.Department = { name: { contains: department } };
    }

    // Position filter
    if (position) {
      where.Position = { name: { contains: position } };
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
          status: true,
          Department: { select: { name: true } },
          Position: { select: { name: true } },
        },
        // The employee-list tab is identified by employee code (for example
        // D001 → D002), not by the system-generated employee number.
        orderBy: [{ employeeCode: "asc" }, { employeeNumber: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.employee.count({ where }),
    ]);

    const items: EmployeeListItem[] = employees.map((emp) => ({
      id: emp.id,
      employeeNumber: emp.employeeNumber,
      employeeCode: emp.employeeCode,
      firstNameTH: emp.firstNameTH,
      lastNameTH: emp.lastNameTH,
      status: STATUS_MAP[emp.status] ?? emp.status,
      departmentName: emp.Department?.name ?? "ไม่ระบุ",
      positionName: emp.Position?.name ?? "ไม่ระบุ",
    }));

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error("GET /api/employee/list failed:", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดรายชื่อพนักงานได้" },
      { status: 500 }
    );
  }
}
