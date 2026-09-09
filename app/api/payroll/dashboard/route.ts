import { NextResponse } from "next/server";

import { getActiveCompany } from "@/lib/active-company";
import { getPayrollDashboard, parsePayrollMonth } from "@/lib/payroll/dashboard";

/**
 * Kept for client-side month changes. The initial dashboard is loaded by the
 * page server component so it does not need to wait for this HTTP round trip.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const monthKey = searchParams.get("month");

  if (!monthKey || !parsePayrollMonth(monthKey)) {
    return NextResponse.json({ error: "รูปแบบเดือนต้องเป็น YYYY-MM" }, { status: 400 });
  }

  try {
    const company = await getActiveCompany();
    return NextResponse.json(await getPayrollDashboard(company?.id, monthKey));
  } catch (error) {
    console.error("GET /api/payroll/dashboard failed:", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดข้อมูล Dashboard เงินเดือนได้" }, { status: 500 });
  }
}
