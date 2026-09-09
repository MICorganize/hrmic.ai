import { NextResponse } from "next/server";
import { z } from "zod";

const flowMetricInput = z.object({
  event: z.enum(["login-submit", "login-authenticated", "company-authorized", "dashboard-shell-visible"]),
  elapsedMs: z.number().finite().min(0).max(120_000),
  path: z.string().startsWith("/").max(512),
});

/** Accepts anonymous client timing only when performance logging is enabled. */
export async function POST(request: Request) {
  const payload = flowMetricInput.safeParse(await request.json().catch(() => null));
  if (payload.success && process.env.PERFORMANCE_LOGGING === "true") {
    console.info(JSON.stringify({ event: "login_flow", flowEvent: payload.data.event, elapsedMs: payload.data.elapsedMs, path: payload.data.path }));
  }

  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
