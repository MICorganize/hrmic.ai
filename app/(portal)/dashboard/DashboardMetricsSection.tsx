"use client";

import dynamic from "next/dynamic";

const DashboardMetrics = dynamic(() => import("./DashboardMetrics"), {
  ssr: false,
  loading: () => <DashboardMetricsFallback />,
});

function DashboardMetricsFallback() {
  return <><div aria-busy className="space-y-3 animate-pulse"><div className="h-[188px] rounded-lg border border-[#e5e9ed] bg-white" /><div className="grid gap-3 sm:grid-cols-2"><div className="h-[188px] rounded-lg border border-[#e5e9ed] bg-white" /><div className="h-[188px] rounded-lg border border-[#e5e9ed] bg-white" /></div><div className="h-[388px] rounded-lg border border-[#e5e9ed] bg-white" /></div><div aria-busy className="h-[388px] animate-pulse rounded-lg border border-[#e5e9ed] bg-white" /></>;
}

/** Defers private aggregates until the already-rendered dashboard shell is visible. */
export function DashboardMetricsSection() {
  return <DashboardMetrics />;
}
