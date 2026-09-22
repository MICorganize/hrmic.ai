import "server-only";

import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Session } from "next-auth";
import { cache } from "react";

import { auth } from "@/auth";
import { Prisma } from "@/generated/prisma/client";
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

type AuthorizationRow = {
  id: string;
  name: string;
  code: string | null;
  employeeLimit: number | null;
  hasAccess: boolean;
  /** jsonb, which drivers may hand back either parsed or as a string. */
  roles: Array<{ code: string; name: string }> | string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
      // A tampered cookie must not reach the database as an invalid uuid.
      if (!UUID_PATTERN.test(companyId)) return { company: null };

      // One statement answers every part of the authorization question: the
      // user scope, the tenant match, the company state, explicit company
      // access, and the tenant-management roles. Prisma resolves nested
      // selects as separate statements, so the previous shape spent four round
      // trips before a page's own query could even start.
      const [row] = await prisma.$queryRaw<AuthorizationRow[]>(Prisma.sql`
        SELECT company."id" AS "id",
               company."name" AS "name",
               company."companyCode" AS "code",
               company."employeeLimit" AS "employeeLimit",
               EXISTS (
                 SELECT 1 FROM "UserCompanyAccess" access
                 WHERE access."userId" = account."id" AND access."companyId" = company."id"
               ) AS "hasAccess",
               COALESCE(
                 (
                   SELECT json_agg(DISTINCT jsonb_build_object('code', role."code", 'name', role."name"))
                   FROM "UserRole" assignment
                   INNER JOIN "Role" role ON role."id" = assignment."roleId"
                   WHERE assignment."userId" = account."id"
                 ),
                 '[]'::json
               ) AS "roles"
        FROM "User" account
        INNER JOIN "Company" company
                ON company."id" = ${companyId}::uuid
               AND company."tenantId" = account."tenantId"
               AND company."status"::text = 'active'
               AND company."deletedAt" IS NULL
        WHERE account."id" = ${userId}::uuid
          AND account."status"::text = 'active'
          AND account."deletedAt" IS NULL
      `);
      if (!row) return { company: null };

      const roles = typeof row.roles === "string"
        ? JSON.parse(row.roles) as Array<{ code: string; name: string }>
        : row.roles;
      if (!hasTenantManagementRole(roles) && !row.hasAccess) return { company: null };

      return {
        company: {
          id: row.id,
          name: row.name,
          code: row.code,
          employeeLimit: row.employeeLimit,
        },
      };
  };

  // Authorized projections live for AUTHORIZATION_CACHE_TTL_SECONDS. With Redis
  // the generation marker is shared, so an access change is visible to every
  // instance at once. Without Redis the marker is process-local: mutations
  // handled by this instance invalidate immediately and other instances catch
  // up within the TTL. Deployments that must read the database on every request
  // can set AUTHORIZATION_CACHE_WITHOUT_REDIS=database.
  const authoritativeEveryRequest =
    !redis && process.env.AUTHORIZATION_CACHE_WITHOUT_REDIS === "database";
  const snapshot = authoritativeEveryRequest
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
  // `auth()` mints its CSRF cookie with crypto.getRandomValues(), which cannot
  // be observed while prerendering. Stop the prerender before the session read
  // so the caller's Suspense boundary streams this at request time instead.
  await connection();
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
