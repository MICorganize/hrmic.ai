import { NextResponse } from "next/server";

import { getActiveCompany } from "@/lib/active-company";
import { parsePayrollMonth } from "@/lib/payroll/dashboard";
import { getPayrollPageSnapshot } from "@/lib/payroll/snapshot";

/** BFF endpoint for client-side month changes: one auth check and one request. */
export async function GET(request: Request) {
  const month = new URL(request.url).searchParams.get("month");
  if (!month || !parsePayrollMonth(month)) {
    return NextResponse.json({ error: "รูปแบบเดือนต้องเป็น YYYY-MM" }, { status: 400 });
  }

  const startedAt = performance.now();
  try {
    const company = await getActiveCompany();
    if (!company) return NextResponse.json({ error: "กรุณาเลือกบริษัทก่อนใช้งาน" }, { status: 403 });
    const snapshot = await getPayrollPageSnapshot(company.id, month);
    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "private, no-store",
        "Server-Timing": `payroll-snapshot;dur=${(performance.now() - startedAt).toFixed(1)}`,
        Vary: "Cookie",
      },
    });
  } catch (error) {
    console.error("GET /api/payroll/snapshot failed:", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดข้อมูลเงินเดือนได้" }, { status: 500 });
  }
}
