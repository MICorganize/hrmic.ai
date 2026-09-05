import { NextResponse } from "next/server";

import { getActiveCompany } from "@/lib/active-company";
import { prisma } from "@/lib/prisma";

/** Employee rows for the organization-wide payroll calculation table. */
export async function GET() {
  try {
    const company = await getActiveCompany();
    if (!company) {
      return NextResponse.json({ error: "กรุณาเลือกบริษัทก่อนคำนวณเงินเดือน" }, { status: 401 });
    }

    const employees = await prisma.employee.findMany({
      where: { companyId: company.id, deletedAt: null },
      orderBy: [{ employeeCode: "asc" }, { employeeNumber: "asc" }],
      select: {
        id: true,
        employeeNumber: true,
        employeeCode: true,
        firstNameTH: true,
        lastNameTH: true,
        nickname: true,
        Branch: { select: { name: true } },
        Department: { select: { name: true } },
        Position: { select: { name: true } },
      },
    });

    return NextResponse.json({
      employees: employees.map((employee) => ({
        id: employee.id,
        code: employee.employeeCode ?? employee.employeeNumber,
        name: `${employee.firstNameTH} ${employee.lastNameTH}${employee.nickname ? ` (${employee.nickname})` : ""}`.trim(),
        branch: employee.Branch?.name ?? "-",
        dept: employee.Department?.name ?? "-",
        position: employee.Position?.name ?? "-",
      })),
    });
  } catch (error) {
    console.error("GET /api/payroll/organization-employees failed:", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดรายชื่อพนักงานสำหรับคำนวณเงินเดือนได้" }, { status: 500 });
  }
}
