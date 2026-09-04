import { NextResponse } from "next/server";

import { auth } from "@/auth";

/**
 * Keep the authenticated Portal surface behind the same NextAuth session that
 * the company API uses.  The API performs its own authorization as a second
 * (non-bypassable) check.
 */
export default auth((request) => {
  if (request.auth) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
});

export const config = {
  matcher: [
    "/attendance/:path*",
    "/communication/:path*",
    "/dashboard/:path*",
    "/documents/:path*",
    "/employees/:path*",
    "/onboarding/:path*",
    "/organization/:path*",
    "/payroll/:path*",
    "/performance/:path*",
    "/profile/:path*",
    "/recruitment/:path*",
    "/reports/:path*",
    "/salary/:path*",
    "/settings/:path*",
    "/training/:path*",
    "/workflows/:path*",
  ],
};
