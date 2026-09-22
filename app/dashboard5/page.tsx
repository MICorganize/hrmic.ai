import type { Metadata } from "next";
import { Suspense } from "react";
import { unstable_rethrow } from "next/navigation";

import Dashboard5Client from "./dashboard5-client";
import { getActiveCompany } from "@/lib/active-company";
import { getCachedDashboardEmployeeSummary } from "@/lib/employee/summary";

export const metadata: Metadata = {
  title: "Dashboard 5",
  description: "แดชบอร์ดบริหารงานบุคคลและติดตามงานของ HRMic.ai",
};

async function Dashboard5WithData() {
  try {
    const company = await getActiveCompany();
    const summary = company ? await getCachedDashboardEmployeeSummary(company.id) : null;
    return <Dashboard5Client summary={summary} companyName={company?.name ?? null} />;
  } catch (error) {
    unstable_rethrow(error);
    console.error("Unable to render Dashboard 5 metrics:", error);
    return <Dashboard5Client />;
  }
}

export default function Dashboard5Page() {
  return (
    <Suspense fallback={<Dashboard5Client loading />}>
      <Dashboard5WithData />
    </Suspense>
  );
}
