import EmployeeDashboardClient from "./employee-dashboard-client";

/**
 * Render the shell without a database read. The client fills it from the
 * company-scoped summary preload/cache; the API still authorizes every read.
 */
export default function OrganizationEmployeePage() {
  return <EmployeeDashboardClient />;
}
