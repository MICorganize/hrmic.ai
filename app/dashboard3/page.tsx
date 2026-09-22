import type { Metadata } from "next";
import { Suspense } from "react";
import { unstable_rethrow } from "next/navigation";

import Dashboard3Client from "./dashboard3-client";
import { getActiveCompany } from "@/lib/active-company";
import { getCachedDashboardEmployeeSummary } from "@/lib/employee/summary";

export const metadata: Metadata = {
  title: "Dashboard 3",
  description: "ภาพรวมข้อมูลทรัพยากรบุคคลและผู้ช่วยอัจฉริยะของ HRMic.ai",
};

async function Dashboard3WithData() {
  try {
    const company = await getActiveCompany();
    const summary = company ? await getCachedDashboardEmployeeSummary(company.id) : null;
    return <Dashboard3Client summary={summary} companyName={company?.name ?? null} />;
  } catch (error) {
    unstable_rethrow(error);
    console.error("Unable to render Dashboard 3 metrics:", error);
    return <Dashboard3Client />;
  }
}

export default function Dashboard3Page() {
  return (
    <Suspense fallback={<Dashboard3Client loading />}>
      <Dashboard3WithData />
    </Suspense>
  );
}
