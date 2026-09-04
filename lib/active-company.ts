import "server-only";

import { cookies } from "next/headers";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const ACTIVE_COMPANY_COOKIE = "hrmic_active_company";

export type ActiveCompany = {
  id: string;
  name: string;
  code: string | null;
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
export async function getAccessibleCompany(companyId: string): Promise<ActiveCompany | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findFirst({
    where: { id: session.user.id, status: "active", deletedAt: null },
    select: {
      id: true,
      tenantId: true,
      UserRole: { select: { Role: { select: { code: true, name: true } } } },
    },
  });
  if (!user) return null;

  const isTenantAdmin = hasTenantManagementRole(user.UserRole.map(({ Role }) => Role));
  const company = await prisma.company.findFirst({
    where: {
      id: companyId,
      tenantId: user.tenantId,
      deletedAt: null,
      ...(isTenantAdmin ? {} : { UserCompanyAccess: { some: { userId: user.id } } }),
    },
    select: { id: true, name: true, companyCode: true },
  });

  return company ? { id: company.id, name: company.name, code: company.companyCode } : null;
}

/**
 * Resolves the company selected by "เข้าสู่ระบบบริษัท". The cookie is only an
 * identifier; its value is authorized against the current session every time.
 */
export async function getActiveCompany(): Promise<ActiveCompany | null> {
  const companyId = (await cookies()).get(ACTIVE_COMPANY_COOKIE)?.value;
  return companyId ? getAccessibleCompany(companyId) : null;
}
