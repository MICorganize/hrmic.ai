"use server";

import { signIn } from "@/auth";
import { cookies } from "next/headers";
import { ACTIVE_COMPANY_COOKIE } from "@/lib/active-company";
import { credentialsSchema } from "@/lib/auth/credentials";

type LoginKind = "employee" | "company-management";

type CredentialsInput = {
  email: string;
  password: string;
  companyId?: string;
  kind: LoginKind;
};

export type AuthenticationResult =
  | { ok: true }
  | { ok: false; error: "invalidCredentials" | "genericError" };

/**
 * Runs Auth.js in the Server Action request instead of making the browser
 * fetch providers, a CSRF token, and the credentials callback sequentially.
 * Next.js validates the action origin; Auth.js still performs the complete
 * credentials, account-status, tenant, and company-access checks.
 */
export async function authenticateWithCredentials(input: CredentialsInput): Promise<AuthenticationResult> {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success || (input.kind === "employee" && !parsed.data.companyId)) {
    return { ok: false, error: "invalidCredentials" };
  }

  try {
    const result = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      ...(input.kind === "employee" ? { companyId: parsed.data.companyId } : {}),
      redirect: false,
      redirectTo: input.kind === "employee" ? "/dashboard" : "/organization/companies",
    });

    // With redirect disabled, Auth.js returns its callback URL. Its error is
    // intentionally mapped to the same public message for every failed login.
    const url = new URL(result, "http://localhost");
    if (url.searchParams.has("error")) return { ok: false, error: "invalidCredentials" };

    // Replace the previous login's company override only after credentials
    // and company access have been accepted. Every portal API now resolves
    // the same company selected in this login, including on a full reload.
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_COMPANY_COOKIE, input.kind === "employee" ? parsed.data.companyId! : "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: input.kind === "employee" ? 60 * 60 * 12 : 0,
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "genericError" };
  }
}
