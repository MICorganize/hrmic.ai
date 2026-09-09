import { NextResponse } from "next/server";
import { z } from "zod";

const metricInput = z.object({
  id: z.string().max(128),
  name: z.string().max(64),
  value: z.number().finite(),
  rating: z.enum(["good", "needs-improvement", "poor"]),
  navigationType: z.string().max(64),
  path: z.string().startsWith("/").max(512),
});

export async function POST(request: Request) {
  const payload = metricInput.safeParse(await request.json().catch(() => null));
  if (payload.success && process.env.PERFORMANCE_LOGGING === "true") {
    console.info(JSON.stringify({ event: "web_vital", ...payload.data }));
  }

  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
