import { NextResponse } from "next/server";

import { getPublicCompanies } from "@/lib/public-companies";

export const dynamic = "force-dynamic";

/**
 * The login form needs a small, public company directory so users can identify
 * their organization before authenticating. Do not add plan, contact, or
 * tenant details to this response.
 */
export async function GET() {
  const startedAt = performance.now();
  try {
    const companies = await getPublicCompanies();
    return NextResponse.json(
      { companies },
      {
        headers: {
          "Cache-Control": "public, max-age=600, stale-while-revalidate=86400",
          "Server-Timing": `public-company-data;dur=${(performance.now() - startedAt).toFixed(1)}`,
        },
      }
    );
  } catch (error) {
    console.error("GET /public-company-data failed:", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดรายชื่อบริษัทได้" }, { status: 500 });
  }
}
