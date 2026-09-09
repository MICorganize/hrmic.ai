"use client";

import { useReportWebVitals } from "next/web-vitals";

type WebVital = Parameters<typeof useReportWebVitals>[0] extends (metric: infer Metric) => void ? Metric : never;

function reportWebVital({ id, name, value, rating, navigationType }: WebVital) {
  if (process.env.NEXT_PUBLIC_PERFORMANCE_LOGGING !== "true") return;

  const body = JSON.stringify({ id, name, value, rating, navigationType, path: window.location.pathname });
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/metrics/web-vitals", new Blob([body], { type: "application/json" }));
    return;
  }
  void fetch("/api/metrics/web-vitals", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
}

export function WebVitals() {
  useReportWebVitals(reportWebVital);
  return null;
}
