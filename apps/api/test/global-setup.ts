import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Redis } from "ioredis";
import { TEST_DATABASE_URL, TEST_REDIS_URL } from "./env";

/** Migrates the disposable test database once per run. Each suite truncates and re-seeds it. */
export default async function setup() {
  const dbDir = fileURLToPath(new URL("../../../packages/db", import.meta.url));
  execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], { cwd: dbDir, env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL }, stdio: "pipe" });
  const redis = new Redis(TEST_REDIS_URL);
  await redis.flushdb();
  await redis.quit();
}
