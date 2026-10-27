import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { type Env, envSchema } from "../src/config/env";

const rootEnv = fileURLToPath(new URL("../../../.env", import.meta.url));
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://myvisa:myvisa@localhost:5442/myvisa_test";
const redis = new URL(process.env.REDIS_URL ?? "redis://localhost:6390");
redis.pathname = "/15";
export const TEST_REDIS_URL = redis.toString();

export function testEnv(overrides: Partial<Record<string, string>> = {}): Env {
  return envSchema.parse({
    NODE_ENV: "test",
    DATABASE_URL: TEST_DATABASE_URL,
    REDIS_URL: TEST_REDIS_URL,
    WEB_URL: "http://localhost:3100",
    CORS_ORIGINS: "http://localhost:3100",
    JWT_ACCESS_SECRET: "test-access-secret-test-access-secret-test",
    HASH_PEPPER: "test-pepper-test-pepper",
    OTP_DEV_CODE: "000000",
    SMS_PROVIDER: "console",
    LOG_LEVEL: "silent",
    TRUST_PROXY: "true",
    ...overrides,
  });
}
