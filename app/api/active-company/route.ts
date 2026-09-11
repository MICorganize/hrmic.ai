import { NextResponse } from "next/server";
import { z } from "zod";

import { ACTIVE_COMPANY_COOKIE, getAccessibleCompany, getActiveCompany } from "@/lib/active-company";

const selectionInput = z.object({ companyId: z.string().uuid() });

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 12,
};

// This response contains tenant-scoped data. Keep it out of shared/CDN caches,
// but permit the browser to reuse it briefly while navigating within the portal.
// `Vary: Cookie` prevents a cache entry from being reused after a company switch.
const privateCacheHeaders = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie",
};

export async function GET() {
  const company = await getActiveCompany();
  return NextResponse.json({ company }, { headers: privateCacheHeaders });
}

export async function POST(request: Request) {
  const input = selectionInput.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "ข้อมูลบริษัทไม่ถูกต้อง" }, { status: 400 });

  const company = await getAccessibleCompany(input.data.companyId);
  if (!company) return NextResponse.json({ error: "คุณไม่มีสิทธิ์เข้าสู่บริษัทนี้" }, { status: 403 });

  const response = NextResponse.json({ company });
  response.cookies.set(ACTIVE_COMPANY_COOKIE, company.id, cookieOptions);
  return response;
}

export function DELETE() {
  const response = NextResponse.json({ company: null });
  response.cookies.set(ACTIVE_COMPANY_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return response;
}
