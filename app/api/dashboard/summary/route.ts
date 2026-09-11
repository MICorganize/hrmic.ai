import { NextResponse } from "next/server";

import { getActiveCompany } from "@/lib/active-company";
import { getCachedDashboardEmployeeSummary } from "@/lib/employee/summary";

/** Compatibility endpoint for non-RSC consumers; the portal no longer calls it. */
export async function GET() {
  const startedAt = performance.now();
  try {
    const companyStartedAt = performance.now();
    const company = await getActiveCompany();
    const companyDuration = performance.now() - companyStartedAt;
    if (!company) return NextResponse.json({ error: "ไม่พบบริษัทที่เลือก" }, { status: 403 });

    const summaryStartedAt = performance.now();
    const summary = await getCachedDashboardEmployeeSummary(company.id);
    const summaryDuration = performance.now() - summaryStartedAt;
    return NextResponse.json({ company, summary }, {
      headers: {
        "Cache-Control": "private, no-store",
        "Server-Timing": [
          `active-company;dur=${companyDuration.toFixed(1)}`,
          `dashboard-data;dur=${summaryDuration.toFixed(1)}`,
          `dashboard-summary;dur=${(performance.now() - startedAt).toFixed(1)}`,
        ].join(", "),
        Vary: "Cookie",
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard/summary failed:", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดข้อมูล Dashboard ได้" }, { status: 500 });
  }
}
