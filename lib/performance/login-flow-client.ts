"use client";

type LoginFlowEvent =
  | "login-submit"
  | "login-authenticated"
  | "company-authorized"
  | "dashboard-shell-visible";

const LOGIN_START_MARK = "hrmic:login-submit";

function isEnabled() {
  return process.env.NEXT_PUBLIC_PERFORMANCE_LOGGING === "true";
}

/** Records anonymous timing only; credentials and company identifiers never leave the browser. */
export function markLoginFlow(event: LoginFlowEvent) {
  if (!isEnabled() || typeof window === "undefined") return;

  const now = performance.now();
  if (event === "login-submit") performance.mark(LOGIN_START_MARK);
  const startedAt = performance.getEntriesByName(LOGIN_START_MARK).at(-1)?.startTime ?? now;
  const payload = JSON.stringify({
    event,
    elapsedMs: Math.round((now - startedAt) * 10) / 10,
    path: window.location.pathname,
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/metrics/login-flow", new Blob([payload], { type: "application/json" }));
    return;
  }
  void fetch("/api/metrics/login-flow", {
    method: "POST",
    body: payload,
    keepalive: true,
    headers: { "Content-Type": "application/json" },
  });
}
