import { NextResponse } from "next/server";

import { getActiveCompany } from "@/lib/active-company";
import { getCachedDashboardEmployeeSummary } from "@/lib/employee/summary";

/**
 * The dashboard shell is rendered before this request finishes. Keep this
 * endpoint limited to the aggregates shown in dashboard cards.
 */
export async function GET() {
  const startedAt = performance.now();
  try {
    const company = await getActiveCompany();
    if (!company) {
      return NextResponse.json({ error: "ไม่พบบริษัทที่เลือก" }, { status: 403 });
    }

    const summary = await getCachedDashboardEmployeeSummary(company.id);
    // The portal header needs this same already-authorized company identity.
    // Returning it with the dashboard snapshot avoids a second authenticated
    // `/api/active-company` request during the post-login critical path.
    return NextResponse.json({ company, summary }, {
      headers: {
        "Cache-Control": "private, no-store",
        "Server-Timing": `dashboard-summary;dur=${(performance.now() - startedAt).toFixed(1)}`,
        Vary: "Cookie",
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard/summary failed:", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดข้อมูล Dashboard ได้" }, { status: 500 });
  }
}
