import EmployeeDashboardClient from "./employee-dashboard-client";
import { getActiveCompany } from "@/lib/active-company";
import { getCachedEmployeeSummary } from "@/lib/employee/summary";

async function loadInitialEmployeeDashboard() {
  const company = await getActiveCompany();
  if (!company) return null;
  const summary = await getCachedEmployeeSummary(company.id, 1);
  return { ...summary, company };
}

/**
 * Start the authoritative summary in the RSC request and stream its promise
 * into the interactive shell. This preserves immediate shell rendering while
 * removing the browser's initial /api/employee round trip.
 */
export default function OrganizationEmployeePage() {
  return <EmployeeDashboardClient initialStats={loadInitialEmployeeDashboard()} />;
}
