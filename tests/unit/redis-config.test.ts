import { describe, expect, it } from "vitest";

import { isUsableRedisConfig } from "@/lib/cache/redis";

describe("Redis configuration guard", () => {
  it("disables missing, partial, and sample configuration", () => {
    expect(isUsableRedisConfig(undefined, undefined)).toBe(false);
    expect(isUsableRedisConfig("https://valid.upstash.io", undefined)).toBe(false);
    expect(isUsableRedisConfig("https://your-instance.upstash.io", "your-token")).toBe(false);
    expect(isUsableRedisConfig("not-a-url", "secret-token")).toBe(false);
  });

  it("accepts a complete HTTPS configuration", () => {
    expect(isUsableRedisConfig("https://apn1-calm-fox-12345.upstash.io", "AX_live-token-value")).toBe(true);
  });
});
