import { connection, NextResponse } from "next/server";

import { getPublicCompanies } from "@/lib/public-companies";

/**
 * The login form needs a small, public company directory so users can identify
 * their organization before authenticating. Do not add plan, contact, or
 * tenant details to this response.
 */
export async function GET() {
  await connection();
  const startedAt = performance.now();
  try {
    const companies = await getPublicCompanies();
    return NextResponse.json(
      { companies },
      {
        headers: {
          // The browser keeps a short copy while Vercel's shared CDN absorbs
          // cold starts for the public, non-personalized company directory.
          "Cache-Control": "public, max-age=60, s-maxage=600, stale-while-revalidate=86400",
          "Server-Timing": `public-company-data;dur=${(performance.now() - startedAt).toFixed(1)}`,
        },
      }
    );
  } catch (error) {
    console.error("GET /public-company-data failed:", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดรายชื่อบริษัทได้" }, { status: 500 });
  }
}
