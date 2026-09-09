import "server-only";

import { cookies } from "next/headers";
import type { Session } from "next-auth";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const ACTIVE_COMPANY_COOKIE = "hrmic_active_company";

export type ActiveCompany = {
  id: string;
  name: string;
  code: string | null;
  employeeLimit: number | null;
};

function hasTenantManagementRole(roles: Array<{ code: string; name: string }>) {
  return roles.some(({ code, name }) => {
    const normalizedCode = code.toLowerCase();
    const normalizedName = name.toLowerCase();
    return ["admin", "administrator", "owner", "super_admin", "superadmin"].includes(normalizedCode)
      || ["admin", "administrator", "owner", "ผู้ดูแลระบบ"].includes(normalizedName);
  });
}

/** Returns a company only when it belongs to the signed-in user's tenant and access scope. */
export async function getAccessibleCompany(
  companyId: string,
  sessionOverride?: Session | null
): Promise<ActiveCompany | null> {
  const session = sessionOverride ?? await auth();
  if (!session?.user?.id) return null;

  // These checks are independent after the session has supplied the user id.
  // Run them together so every dashboard request avoids a sequential DB wait.
  const [user, company] = await Promise.all([
    prisma.user.findFirst({
      where: { id: session.user.id, status: "active", deletedAt: null },
      select: {
        id: true,
        tenantId: true,
        UserRole: { select: { Role: { select: { code: true, name: true } } } },
      },
    }),
    prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
      select: {
        id: true,
        tenantId: true,
        name: true,
        companyCode: true,
        employeeLimit: true,
        UserCompanyAccess: { where: { userId: session.user.id }, select: { userId: true }, take: 1 },
      },
    }),
  ]);
  if (!user || !company || company.tenantId !== user.tenantId) return null;

  const isTenantAdmin = hasTenantManagementRole(user.UserRole.map(({ Role }) => Role));
  if (!isTenantAdmin && company.UserCompanyAccess.length === 0) return null;

  return company ? { id: company.id, name: company.name, code: company.companyCode, employeeLimit: company.employeeLimit } : null;
}

/**
 * Resolves the company selected by "เข้าสู่ระบบบริษัท". The cookie is only an
 * identifier; its value is authorized against the current session every time.
 */
export async function getActiveCompany(): Promise<ActiveCompany | null> {
  const [cookieStore, session] = await Promise.all([cookies(), auth()]);
  // Company switches use the httpOnly cookie. The initial selection is a
  // signed JWT claim, so employee login does not need an extra POST request.
  const companyId = cookieStore.get(ACTIVE_COMPANY_COOKIE)?.value ?? session?.user?.activeCompanyId;
  return companyId ? getAccessibleCompany(companyId, session) : null;
}
