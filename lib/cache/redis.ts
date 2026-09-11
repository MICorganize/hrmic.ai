import { Redis } from "@upstash/redis";

const globalForRedis = globalThis as unknown as { redis?: Redis | null };

const PLACEHOLDER_VALUE = /(?:your[-_.]|example|placeholder|replace[-_.]?with)/i;

function requestTimeoutMs() {
  const configured = Number.parseInt(process.env.REDIS_REQUEST_TIMEOUT_MS ?? "750", 10);
  return Number.isFinite(configured) ? Math.min(5_000, Math.max(100, configured)) : 750;
}

/** Reject sample values before the SDK spends seconds retrying an invalid host. */
export function isUsableRedisConfig(url: string | undefined, token: string | undefined) {
  if (!url || !token || PLACEHOLDER_VALUE.test(url) || PLACEHOLDER_VALUE.test(token)) return false;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

type RedisFailureState = { nextLogAt: Map<string, number> };
const globalForRedisFailures = globalThis as unknown as { redisFailureState?: RedisFailureState };
const redisFailureState = globalForRedisFailures.redisFailureState ?? { nextLogAt: new Map<string, number>() };
if (process.env.NODE_ENV !== "production") globalForRedisFailures.redisFailureState = redisFailureState;

/** Log at most once per operation per minute so a cache outage stays visible without flooding logs. */
export function reportRedisFailure(operation: string, error: unknown) {
  const now = Date.now();
  if ((redisFailureState.nextLogAt.get(operation) ?? 0) > now) return;
  redisFailureState.nextLogAt.set(operation, now + 60_000);
  const reason = error instanceof Error ? error.name : "UnknownError";
  console.warn(`[cache] Redis ${operation} failed (${reason}); using the database/in-memory fallback.`);
}

// A cache outage or an omitted Upstash configuration must never make an HR
// request unavailable. Read-through callers therefore receive `null` and
// transparently fall back to PostgreSQL when Redis is not configured.
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const hasRedisConfig = isUsableRedisConfig(redisUrl, redisToken);
const hasAnyRedisConfig = Boolean(redisUrl || redisToken);

if (process.env.NODE_ENV === "production" && hasAnyRedisConfig && !hasRedisConfig) {
  console.warn(
    "Upstash Redis configuration is invalid or still contains sample values; Redis has been disabled for this instance."
  );
} else if (process.env.NODE_ENV === "production" && !hasRedisConfig) {
  console.warn("Upstash Redis is not configured; read caches are limited to each server instance.");
}

export const redis = globalForRedis.redis ?? (hasRedisConfig
  ? new Redis({
      url: redisUrl!,
      token: redisToken!,
      // Each command gets a fresh signal. Failed cache reads must never hold
      // the request path open for the SDK/network's multi-second timeout.
      signal: () => AbortSignal.timeout(requestTimeoutMs()),
      retry: false,
      enableTelemetry: false,
    })
  : null
);

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
