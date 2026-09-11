import { connection, NextResponse } from "next/server";

import { getPublicCompanies } from "@/lib/public-companies";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * Keeps the public Login directory warm after deploys and between low-traffic
 * periods. Vercel sends CRON_SECRET as a bearer token for configured crons.
 */
export async function GET(request: Request) {
  await connection();
  if (!isAuthorized(request)) return new NextResponse(null, { status: 404 });

  try {
    const companies = await getPublicCompanies();
    return NextResponse.json(
      { warmed: true, companyCount: companies.length },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/internal/warm-caches failed:", error);
    return NextResponse.json({ warmed: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
