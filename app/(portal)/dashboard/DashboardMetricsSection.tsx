import { unstable_rethrow } from "next/navigation";

import { getActiveCompany } from "@/lib/active-company";
import { getCachedDashboardEmployeeSummary } from "@/lib/employee/summary";

import DashboardMetrics from "./DashboardMetrics";

export function DashboardMetricsFallback() {
  return <><div aria-busy className="space-y-3 animate-pulse"><div className="h-[188px] rounded-lg border border-[#e5e9ed] bg-white" /><div className="grid gap-3 sm:grid-cols-2"><div className="h-[188px] rounded-lg border border-[#e5e9ed] bg-white" /><div className="h-[188px] rounded-lg border border-[#e5e9ed] bg-white" /></div><div className="h-[388px] rounded-lg border border-[#e5e9ed] bg-white" /></div><div aria-busy className="h-[388px] animate-pulse rounded-lg border border-[#e5e9ed] bg-white" /></>;
}

function DashboardMetricsError() {
  return <div role="alert" className="col-span-full rounded-lg border border-red-100 bg-white px-6 py-12 text-center text-sm text-red-700">ไม่สามารถโหลดข้อมูล Dashboard ได้ กรุณาลองรีเฟรชอีกครั้ง</div>;
}

async function loadDashboardMetrics() {
  try {
    const company = await getActiveCompany();
    return company ? await getCachedDashboardEmployeeSummary(company.id) : null;
  } catch (error) {
    // cookies()/auth() use an internal exception during static analysis to
    // mark this route dynamic. Let Next handle that signal itself.
    unstable_rethrow(error);
    console.error("Unable to render dashboard metrics:", error);
    return null;
  }
}

/** Fetch private aggregates on the server and stream them behind Suspense. */
export async function DashboardMetricsSection() {
  const summary = await loadDashboardMetrics();
  return summary ? <DashboardMetrics summary={summary} /> : <DashboardMetricsError />;
}
