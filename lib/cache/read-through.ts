import "server-only";

import { createHash } from "node:crypto";

import { redis, reportRedisFailure } from "@/lib/cache/redis";

const CACHE_PREFIX = "hrmic:read:v1";

type ReadCacheState = {
  inFlightReads: Map<string, Promise<unknown>>;
  memoryReads: Map<string, { expiresAt: number; value: unknown }>;
  memoryVersions: Map<string, number>;
};

const globalForReadCache = globalThis as unknown as { readCacheState?: ReadCacheState };
const readCacheState = globalForReadCache.readCacheState ?? {
  inFlightReads: new Map<string, Promise<unknown>>(),
  memoryReads: new Map<string, { expiresAt: number; value: unknown }>(),
  memoryVersions: new Map<string, number>(),
};

// Keep short-lived values stable through Turbopack hot reloads. In production
// the module itself is long-lived, while Redis remains the shared cache.
if (process.env.NODE_ENV !== "production") {
  globalForReadCache.readCacheState = readCacheState;
}

const { inFlightReads, memoryReads, memoryVersions } = readCacheState;

function logCacheTiming(namespace: string, layer: "memory" | "redis" | "coalesced" | "database", startedAt: number) {
  if (process.env.PERFORMANCE_LOGGING !== "true") return;
  console.info(JSON.stringify({ event: "read_cache", namespace, layer, durationMs: Number((performance.now() - startedAt).toFixed(1)) }));
}

/** Builds short, opaque cache keys so request text and tenant identifiers are not exposed in Redis keys. */
export function readCacheKey(namespace: string, ...parts: string[]) {
  const digest = createHash("sha256").update(parts.join("\0")).digest("base64url");
  return `${CACHE_PREFIX}:${namespace}:${digest}`;
}

/**
 * Returns a monotonically increasing scope version. Including this value in a
 * read-model cache key makes every committed mutation immediately select a
 * fresh cache generation, without scanning or deleting cursor-paginated keys.
 */
export async function readCacheVersion(namespace: string, ...parts: string[]) {
  const key = readCacheKey("version", namespace, ...parts);
  if (redis) {
    try {
      const version = await redis.get<number>(key);
      return String(version ?? 0);
    } catch (error) {
      reportRedisFailure("version-read", error);
      // A local version still gives correct invalidation for this instance.
    }
  }
  return String(memoryVersions.get(key) ?? 0);
}

/** Advances a scope version after a successful database mutation. */
export async function bumpReadCacheVersion(namespace: string, ...parts: string[]) {
  const key = readCacheKey("version", namespace, ...parts);
  if (redis) {
    try {
      const version = await redis.incr(key);
      memoryVersions.set(key, version);
      return String(version);
    } catch (error) {
      reportRedisFailure("version-increment", error);
      // Continue with the process-local fallback when Redis is unavailable.
    }
  }
  const version = (memoryVersions.get(key) ?? 0) + 1;
  memoryVersions.set(key, version);
  return String(version);
}

/**
 * Cache read-only, tenant-scoped data with a bounded TTL. Redis is optional:
 * cache failures deliberately fall through to the authoritative database.
 */
export async function readThroughCache<T>(key: string, ttlSeconds: number, load: () => Promise<T>) {
  const startedAt = performance.now();
  const now = Date.now();
  const memoryEntry = memoryReads.get(key);
  if (memoryEntry && memoryEntry.expiresAt > now) {
    logCacheTiming("read-through", "memory", startedAt);
    return memoryEntry.value as T;
  }
  if (memoryEntry) memoryReads.delete(key);

  if (redis) {
    try {
      const cached = await redis.get<T>(key);
      if (cached !== null) {
        memoryReads.set(key, { value: cached, expiresAt: Date.now() + ttlSeconds * 1_000 });
        logCacheTiming("read-through", "redis", startedAt);
        return cached;
      }
    } catch (error) {
      reportRedisFailure("read", error);
      // The database remains available when Redis has a transient failure.
    }
  }

  // A cache miss must result in one database query, not one query per
  // simultaneous browser refresh. This is process-local by design; Redis is
  // still the cross-instance cache and this closes the common same-instance
  // stampede window.
  const active = inFlightReads.get(key) as Promise<T> | undefined;
  if (active) {
    logCacheTiming("read-through", "coalesced", startedAt);
    return active;
  }

  const pending = (async () => {
    try {
      const value = await load();
      logCacheTiming("read-through", "database", startedAt);
      // Keep a process-local copy as well.  Local development and deployments
      // without Redis still get the same short-lived read-through behavior,
      // while the cache key remains tenant-scoped and opaque.
      memoryReads.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1_000 });
      if (redis) {
        try {
          await redis.set(key, value, { ex: ttlSeconds });
        } catch (error) {
          reportRedisFailure("write", error);
          // Caching is an optimization, not a dependency of a successful request.
        }
      }
      return value;
    } finally {
      inFlightReads.delete(key);
    }
  })();

  inFlightReads.set(key, pending);
  return pending;
}

/** Stores a completed read model in the same local/Redis layers used by
 * readThroughCache. Callers must supply an already-authoritative value. */
export async function writeReadCache<T>(key: string, ttlSeconds: number, value: T) {
  memoryReads.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1_000 });
  if (!redis) return;

  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    reportRedisFailure("write", error);
    // The supplied value remains available locally; a later read can rebuild it.
  }
}

type VersionedCacheValue<T> = { version: string; value: T };

/**
 * Reads a version marker and its snapshot together when Redis is available.
 * A mutation changes only the marker, so stale snapshots remain unreachable
 * without requiring a Redis key scan or weakening read-model invalidation.
 */
export async function readThroughVersionedCache<T>(
  versionNamespace: string,
  versionParts: string[],
  namespace: string,
  parts: string[],
  ttlSeconds: number,
  load: () => Promise<T>
) {
  const startedAt = performance.now();
  const versionKey = readCacheKey("version", versionNamespace, ...versionParts);
  const key = readCacheKey(namespace, ...parts);
  const now = Date.now();

  let version: string;
  if (redis) {
    try {
      // Both values are required for a safe cache hit. Pipelining keeps this
      // validation to one Redis network round trip instead of two.
      const pipeline = redis.pipeline();
      pipeline.get<number>(versionKey);
      pipeline.get<VersionedCacheValue<T>>(key);
      const [storedVersion, cached] = await pipeline.exec<[number | null, VersionedCacheValue<T> | null]>();
      version = String(storedVersion ?? 0);
      if (cached?.version === version) {
        memoryReads.set(key, { value: cached, expiresAt: now + ttlSeconds * 1_000 });
        logCacheTiming(namespace, "redis", startedAt);
        return cached.value;
      }
    } catch (error) {
      reportRedisFailure("versioned-read", error);
      // The local cache and authoritative database remain valid fallbacks.
      version = String(memoryVersions.get(versionKey) ?? 0);
    }
  } else {
    version = String(memoryVersions.get(versionKey) ?? 0);
    const cached = memoryReads.get(key);
    if (cached && cached.expiresAt > now) {
      const value = cached.value as VersionedCacheValue<T>;
      if (value.version === version) {
        logCacheTiming(namespace, "memory", startedAt);
        return value.value;
      }
    }
    if (cached) memoryReads.delete(key);
  }

  const requestKey = `${key}:${version}`;
  const active = inFlightReads.get(requestKey) as Promise<T> | undefined;
  if (active) {
    logCacheTiming(namespace, "coalesced", startedAt);
    return active;
  }

  const pending = (async () => {
    try {
      const value = await load();
      logCacheTiming(namespace, "database", startedAt);
      const cached: VersionedCacheValue<T> = { version, value };
      memoryReads.set(key, { value: cached, expiresAt: Date.now() + ttlSeconds * 1_000 });
      if (redis) {
        try {
          await redis.set(key, cached, { ex: ttlSeconds });
        } catch (error) {
          reportRedisFailure("versioned-write", error);
          // A completed database read is still correct when cache storage fails.
        }
      }
      return value;
    } finally {
      inFlightReads.delete(requestKey);
    }
  })();

  inFlightReads.set(requestKey, pending);
  return pending;
}

export async function invalidateReadCache(key: string) {
  memoryReads.delete(key);
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (error) {
    reportRedisFailure("delete", error);
    // A stale entry is still bounded by its TTL.
  }
}
