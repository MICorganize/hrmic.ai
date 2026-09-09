import DashboardClient from "./DashboardClient";

/** Render the dashboard shell immediately; client cards hydrate from the cached API snapshot. */
export default function DashboardPage() {
  return <DashboardClient />;
}
