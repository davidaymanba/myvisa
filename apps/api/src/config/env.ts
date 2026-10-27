import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const bool = z.enum(["true", "false", "1", "0"]).transform((v) => v === "true" || v === "1");
const list = z.string().transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean));
const optionalString = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined));

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    API_PORT: z.coerce.number().int().default(4100),
    DATABASE_URL: z.url(),
    REDIS_URL: z.url(),
    CORS_ORIGINS: list.default([]),
    WEB_URL: z.url().default("http://localhost:3100"),
    COOKIE_DOMAIN: optionalString,
    COOKIE_SECURE: bool.optional(),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
    TRUST_PROXY: bool.default(true),

    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
    REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
    HASH_PEPPER: z.string().min(16),
    OTP_TTL_SECONDS: z.coerce.number().int().min(60).max(900).default(300),
    OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
    OTP_RESEND_SECONDS: z.coerce.number().int().min(10).max(600).default(60),
    OTP_MAX_PER_HOUR: z.coerce.number().int().min(1).max(50).default(5),
    OTP_DEV_CODE: z
      .string()
      .regex(/^\d{6}$/)
      .optional()
      .or(z.literal("").transform(() => undefined)),

    SMS_PROVIDER: z.enum(["console", "unifonic", "taqnyat"]).default("console"),
    UNIFONIC_APP_SID: optionalString,
    UNIFONIC_SENDER_ID: optionalString,
    TAQNYAT_BEARER_TOKEN: optionalString,
    TAQNYAT_SENDER: optionalString,

    WEB_REVALIDATE_URL: optionalString,
    REVALIDATE_SECRET: optionalString,
    SENTRY_DSN: optionalString,
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production") {
      if (env.OTP_DEV_CODE) ctx.addIssue({ code: "custom", path: ["OTP_DEV_CODE"], message: "must be empty in production" });
      if (env.SMS_PROVIDER === "console") ctx.addIssue({ code: "custom", path: ["SMS_PROVIDER"], message: "console SMS is for development only" });
      if (env.JWT_ACCESS_SECRET.includes("change-me")) ctx.addIssue({ code: "custom", path: ["JWT_ACCESS_SECRET"], message: "set a real secret" });
      if (env.HASH_PEPPER.includes("change-me")) ctx.addIssue({ code: "custom", path: ["HASH_PEPPER"], message: "set a real pepper" });
    }
    if (env.SMS_PROVIDER === "unifonic" && !env.UNIFONIC_APP_SID) ctx.addIssue({ code: "custom", path: ["UNIFONIC_APP_SID"], message: "required for unifonic" });
    if (env.SMS_PROVIDER === "taqnyat" && !env.TAQNYAT_BEARER_TOKEN) ctx.addIssue({ code: "custom", path: ["TAQNYAT_BEARER_TOKEN"], message: "required for taqnyat" });
  });

export type Env = z.output<typeof envSchema>;

/** Loads the repo-root .env (dev convenience; real deployments set env vars) and validates it. Fails fast on bad config. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (source === process.env) {
    // Repo root, from src/config/env.ts (tests, tsx) or from the bundled dist/main.js.
    const rootEnv = fileURLToPath(new URL("../../../../.env", import.meta.url));
    const fromDist = fileURLToPath(new URL("../../../.env", import.meta.url));
    for (const file of [rootEnv, fromDist]) {
      if (existsSync(file)) {
        process.loadEnvFile(file);
        break;
      }
    }
  }
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

export const ENV = Symbol("ENV");
