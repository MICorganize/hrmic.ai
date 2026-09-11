import "server-only";

import { cookies } from "next/headers";
import type { Session } from "next-auth";
import { cache } from "react";

import { auth } from "@/auth";
import { bumpReadCacheVersion, readThroughVersionedCache } from "@/lib/cache/read-through";
import { redis } from "@/lib/cache/redis";
import { prisma } from "@/lib/prisma";

export const ACTIVE_COMPANY_COOKIE = "hrmic_active_company";

export type ActiveCompany = {
  id: string;
  name: string;
  code: string | null;
  employeeLimit: number | null;
};

type AccessibleCompanySnapshot = { company: ActiveCompany | null };

function authorizationCacheTtlSeconds() {
  const configured = Number.parseInt(process.env.AUTHORIZATION_CACHE_TTL_SECONDS ?? "30", 10);
  return Number.isFinite(configured) ? Math.min(60, Math.max(5, configured)) : 30;
}

/**
 * Advances the company access generation after a company or its access list
 * changes. Every server instance then ignores snapshots from the old
 * generation without scanning Redis keys.
 */
export function invalidateCompanyAuthorization(companyId: string) {
  return bumpReadCacheVersion("authorization-company", companyId);
}

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

  const userId = session.user.id;

  const loadAuthorization = async (): Promise<AccessibleCompanySnapshot> => {
      // These checks are independent after the signed session has supplied
      // the user id. One cache miss performs them concurrently; subsequent
      // private API calls reuse the authorized, tenant-scoped projection.
      const [user, company] = await Promise.all([
        prisma.user.findFirst({
          where: { id: userId, status: "active", deletedAt: null },
          select: {
            id: true,
            tenantId: true,
            UserRole: { select: { Role: { select: { code: true, name: true } } } },
          },
        }),
        prisma.company.findFirst({
          where: { id: companyId, status: "active", deletedAt: null },
          select: {
            id: true,
            tenantId: true,
            name: true,
            companyCode: true,
            employeeLimit: true,
            UserCompanyAccess: { where: { userId }, select: { userId: true }, take: 1 },
          },
        }),
      ]);
      if (!user || !company || company.tenantId !== user.tenantId) return { company: null };

      const isTenantAdmin = hasTenantManagementRole(user.UserRole.map(({ Role }) => Role));
      if (!isTenantAdmin && company.UserCompanyAccess.length === 0) return { company: null };

      return {
        company: {
          id: company.id,
          name: company.name,
          code: company.companyCode,
          employeeLimit: company.employeeLimit,
        },
      };
  };

  // In a multi-instance production deployment a process-local authorization
  // cache cannot receive revocation generations from another instance. If the
  // shared Redis layer is not configured, prefer an authoritative DB read.
  const snapshot = process.env.NODE_ENV === "production" && !redis
    ? await loadAuthorization()
    : await readThroughVersionedCache<AccessibleCompanySnapshot>(
    "authorization-company",
    [companyId],
    "accessible-company",
    [companyId, userId],
    authorizationCacheTtlSeconds(),
    loadAuthorization
  );

  return snapshot.company;
}

/**
 * Resolves the company selected by "เข้าสู่ระบบบริษัท". The cookie is only an
 * identifier; its value is authorized against the current session every time.
 */
const resolveActiveCompanyForRequest = cache(async (): Promise<ActiveCompany | null> => {
  // Runtime APIs may suspend during PPR. Resolve them sequentially so an
  // interrupted prerender never leaves the other promise rejecting later.
  const cookieStore = await cookies();
  const session = await auth();
  // Company switches use the httpOnly cookie. The initial selection is a
  // signed JWT claim, so employee login does not need an extra POST request.
  const companyId = cookieStore.get(ACTIVE_COMPANY_COOKIE)?.value ?? session?.user?.activeCompanyId;
  return companyId ? getAccessibleCompany(companyId, session) : null;
});

/** Lets a portal template and its page share one access lookup per RSC render. */
export function getActiveCompany(): Promise<ActiveCompany | null> {
  return resolveActiveCompanyForRequest();
}
