import "server-only";

import { bumpReadCacheVersion, readCacheKey, readCacheVersion, readThroughVersionedCache, writeReadCache } from "@/lib/cache/read-through";

type ReadModel = "workforce" | "payroll-dashboard";

function scopes(companyId?: string | null) {
  return companyId ? [companyId, "all"] : ["all"];
}

/** Builds an opaque cache key tied to the current company read-model version. */
export async function versionedReadModelCacheKey(
  model: ReadModel,
  namespace: string,
  companyId: string | null | undefined,
  ...parts: string[]
) {
  const scope = companyId ?? "all";
  const version = await readCacheVersion(model, scope);
  return readCacheKey(namespace, scope, version, ...parts);
}

/**
 * Makes all cached projections for a company (and the aggregate "all" scope)
 * obsolete immediately after a committed mutation.
 */
export async function invalidateReadModel(model: ReadModel, companyId?: string | null) {
  await Promise.all(scopes(companyId).map((scope) => bumpReadCacheVersion(model, scope)));
}

/** Uses a versioned, tenant-scoped snapshot with one Redis round trip on hits. */
export function readVersionedReadModel<T>(
  model: ReadModel,
  namespace: string,
  companyId: string | null | undefined,
  parts: string[],
  ttlSeconds: number,
  load: () => Promise<T>
) {
  const scope = companyId ?? "all";
  return readThroughVersionedCache(model, [scope], namespace, [scope, ...parts], ttlSeconds, load);
}

/**
 * Seeds the exact versioned-cache shape read by readVersionedReadModel. The
 * version remains part of the value, so a concurrent or remote invalidation
 * makes this entry unreachable instead of serving stale tenant data.
 */
export async function seedVersionedReadModel<T>(
  model: ReadModel,
  namespace: string,
  companyId: string | null | undefined,
  parts: string[],
  ttlSeconds: number,
  value: T
) {
  const scope = companyId ?? "all";
  const version = await readCacheVersion(model, scope);
  const key = readCacheKey(namespace, scope, ...parts);
  await writeReadCache(key, ttlSeconds, { version, value });
}
