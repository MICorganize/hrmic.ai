"use client";

import { useEffect } from "react";

import { markLoginFlow } from "@/lib/performance/login-flow-client";

/** Keeps login-flow telemetry out of the server-rendered dashboard shell. */
export function DashboardShellTelemetry() {
  useEffect(() => {
    markLoginFlow("dashboard-shell-visible");
  }, []);

  return null;
}
