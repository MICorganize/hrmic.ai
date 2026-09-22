import { unstable_rethrow } from "next/navigation";

import { getActiveCompany } from "@/lib/active-company";
import { getCachedDashboardEmployeeSummary } from "@/lib/employee/summary";

import DashboardMetrics from "./DashboardMetrics";

export function DashboardMetricsFallback() {
  return <div aria-busy className="animate-pulse"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-[124px] rounded-xl bg-slate-200" />)}</div><div className="mt-3 grid gap-3 xl:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-[252px] rounded-xl border border-[#e7eaf0] bg-white" />)}</div><div className="mt-3 grid gap-3 xl:grid-cols-2"><div className="h-[250px] rounded-xl bg-white" /><div className="h-[250px] rounded-xl bg-white" /></div></div>;
}

function DashboardMetricsError() {
  return <div role="alert" className="rounded-xl border border-red-100 bg-white px-6 py-12 text-center text-sm text-red-700 shadow-sm">ไม่สามารถโหลดข้อมูล Dashboard ได้ กรุณาลองรีเฟรชอีกครั้ง</div>;
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
