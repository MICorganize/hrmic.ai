import { Redis } from "@upstash/redis";

const globalForRedis = globalThis as unknown as { redis?: Redis | null };

// A cache outage or an omitted Upstash configuration must never make an HR
// request unavailable. Read-through callers therefore receive `null` and
// transparently fall back to PostgreSQL when Redis is not configured.
const hasRedisConfig = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

if (process.env.NODE_ENV === "production" && !hasRedisConfig) {
  // A process-local fallback remains correct, but it cannot share warm
  // dashboard data across server instances. Make this visible at deploy time
  // instead of discovering it from a slow cold request in production.
  console.warn("Upstash Redis is not configured; read caches are limited to each server instance.");
}

export const redis = globalForRedis.redis ?? (hasRedisConfig ? Redis.fromEnv() : null);

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
