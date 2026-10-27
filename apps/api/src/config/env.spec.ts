import { describe, expect, it } from "vitest";
import { envSchema } from "./env";

const base = { DATABASE_URL: "postgresql://x@h/x", REDIS_URL: "redis://h:1", JWT_ACCESS_SECRET: "a-real-secret-that-is-long-enough-000000", HASH_PEPPER: "a-real-pepper-value" };

describe("env", () => {
  it("applies safe defaults", () => {
    const env = envSchema.parse(base);
    expect(env).toMatchObject({ NODE_ENV: "development", JWT_ACCESS_TTL_SECONDS: 900, OTP_MAX_ATTEMPTS: 5, SMS_PROVIDER: "console" });
  });

  it("refuses development shortcuts in production", () => {
    const result = envSchema.safeParse({ ...base, NODE_ENV: "production", OTP_DEV_CODE: "000000", JWT_ACCESS_SECRET: "dev-access-secret-change-me-dev-access-secret" });
    expect(result.success).toBe(false);
    const paths = result.error!.issues.map((i) => i.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["OTP_DEV_CODE", "SMS_PROVIDER", "JWT_ACCESS_SECRET"]));
  });

  it("rejects short secrets", () => {
    expect(envSchema.safeParse({ ...base, JWT_ACCESS_SECRET: "short" }).success).toBe(false);
  });
});
