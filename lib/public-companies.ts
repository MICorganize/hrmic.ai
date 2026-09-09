import "server-only";

import { readCacheKey, readThroughCache, invalidateReadCache } from "@/lib/cache/read-through";
import { prisma } from "@/lib/prisma";
import type { PublicCompany } from "@/lib/public-company-types";

export type { PublicCompany } from "@/lib/public-company-types";

const PUBLIC_COMPANIES_CACHE_TTL_SECONDS = 60 * 10;
const publicCompaniesCacheKey = readCacheKey("public-companies");

function logPerformance(event: string, durationMs: number, fields: Record<string, number> = {}) {
  if (process.env.PERFORMANCE_LOGGING !== "true") return;
  console.info(JSON.stringify({ event, durationMs: Number(durationMs.toFixed(1)), ...fields }));
}

async function loadPublicCompanies(): Promise<PublicCompany[]> {
  const startedAt = performance.now();
  try {
    const companies = await prisma.company.findMany({
      where: { status: "active", deletedAt: null },
      orderBy: [{ companyCode: "asc" }, { name: "asc" }],
      select: { id: true, companyCode: true, companyNameTH: true, name: true },
    });

    return companies.map((company) => ({
      id: company.id,
      code: company.companyCode ?? company.name,
      name: company.companyNameTH ?? company.name,
    }));
  } finally {
    logPerformance("db.public_companies", performance.now() - startedAt);
  }
}

/** Shared public directory for login routes; cached in memory and Redis when available. */
export async function getPublicCompanies() {
  const startedAt = performance.now();
  const companies = await readThroughCache(
    publicCompaniesCacheKey,
    PUBLIC_COMPANIES_CACHE_TTL_SECONDS,
    loadPublicCompanies
  );
  logPerformance("cache.public_companies", performance.now() - startedAt, { companyCount: companies.length });
  return companies;
}

/** Call after a company is created or its public identity/status changes. */
export function invalidatePublicCompanies() {
  return invalidateReadCache(publicCompaniesCacheKey);
}
