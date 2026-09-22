import type { Metadata } from "next";
import { Suspense } from "react";
import { unstable_rethrow } from "next/navigation";

import Dashboard4Client from "./dashboard4-client";
import { getActiveCompany } from "@/lib/active-company";
import { getCachedDashboardEmployeeSummary } from "@/lib/employee/summary";

export const metadata: Metadata = {
  title: "Dashboard 4",
  description: "ภาพรวมการบริหารทรัพยากรบุคคลของ HRMic.ai",
};

async function Dashboard4WithData() {
  try {
    const company = await getActiveCompany();
    const summary = company ? await getCachedDashboardEmployeeSummary(company.id) : null;

    return <Dashboard4Client summary={summary} companyName={company?.name ?? null} />;
  } catch (error) {
    unstable_rethrow(error);
    console.error("Unable to render Dashboard 4 metrics:", error);
    return <Dashboard4Client />;
  }
}

export default function Dashboard4Page() {
  return (
    <Suspense fallback={<Dashboard4Client loading />}>
      <Dashboard4WithData />
    </Suspense>
  );
}
