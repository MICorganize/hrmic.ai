import { NextResponse } from "next/server";

import { getActiveCompany } from "@/lib/active-company";
import { getPayrollDashboardEmployeeCount, parsePayrollMonth } from "@/lib/payroll/dashboard";

/** Returns the first dashboard number without waiting for the other aggregates. */
export async function GET(request: Request) {
  const monthKey = new URL(request.url).searchParams.get("month");
  if (!monthKey || !parsePayrollMonth(monthKey)) {
    return NextResponse.json({ error: "รูปแบบเดือนต้องเป็น YYYY-MM" }, { status: 400 });
  }

  try {
    const company = await getActiveCompany();
    return NextResponse.json(await getPayrollDashboardEmployeeCount(company?.id, monthKey));
  } catch (error) {
    console.error("GET /api/payroll/dashboard/employee-count failed:", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดจำนวนพนักงานได้" }, { status: 500 });
  }
}
