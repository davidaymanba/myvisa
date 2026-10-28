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

    API_PUBLIC_URL: z.url().default("http://localhost:4100"),

    S3_ENDPOINT: optionalString,
    S3_REGION: z.string().default("us-east-1"),
    S3_BUCKET: z.string().min(3).default("myvisa-documents"),
    S3_ACCESS_KEY: z.string().min(1),
    S3_SECRET_KEY: z.string().min(1),
    S3_FORCE_PATH_STYLE: bool.default(false),
    S3_SSE: z.enum(["none", "AES256"]).default("none"),
    S3_AUTO_CREATE_BUCKET: bool.default(false),
    CLAMAV_HOST: optionalString,
    CLAMAV_PORT: z.coerce.number().int().default(3310),

    DATA_ENCRYPTION_KEY: z
      .string()
      .refine((v) => Buffer.from(v, "base64").length === 32, "must be 32 bytes, base64 (openssl rand -base64 32)"),
    BLIND_INDEX_KEY: z.string().min(16),
    QUEUE_WORKERS: bool.default(true),
    /** Serve Swagger UI at /docs. Defaults to on, except in production (the API map is not public). */
    API_DOCS: bool.optional(),

    PAYMENT_PROVIDER: z.enum(["mock", "moyasar", "tap"]).default("mock"),
    MOYASAR_SECRET_KEY: optionalString,
    MOYASAR_WEBHOOK_SECRET: optionalString,
    TAP_SECRET_KEY: optionalString,

    EMAIL_PROVIDER: z.enum(["console", "smtp", "resend"]).default("console"),
    EMAIL_FROM: z.string().default("myvisa <no-reply@myvisa.sa>"),
    SMTP_URL: optionalString,
    RESEND_API_KEY: optionalString,
    WHATSAPP_PROVIDER: z.enum(["console", "meta"]).default("console"),
    WHATSAPP_TOKEN: optionalString,
    WHATSAPP_PHONE_NUMBER_ID: optionalString,
    /** ZATCA EGS signing key (secp256k1 PEM) and production CSID certificate, from onboarding. */
    ZATCA_EGS_PRIVATE_KEY: optionalString,
    ZATCA_EGS_CERTIFICATE: optionalString,

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
      if (env.BLIND_INDEX_KEY.includes("change-me")) ctx.addIssue({ code: "custom", path: ["BLIND_INDEX_KEY"], message: "set a real key" });
      if (env.PAYMENT_PROVIDER === "mock") ctx.addIssue({ code: "custom", path: ["PAYMENT_PROVIDER"], message: "the mock gateway is for development only" });
      if (env.S3_AUTO_CREATE_BUCKET) ctx.addIssue({ code: "custom", path: ["S3_AUTO_CREATE_BUCKET"], message: "create buckets with infrastructure, not at runtime" });
      if (!env.CLAMAV_HOST) ctx.addIssue({ code: "custom", path: ["CLAMAV_HOST"], message: "uploads must be virus-scanned in production" });
      if (!env.WEB_URL.startsWith("https://")) ctx.addIssue({ code: "custom", path: ["WEB_URL"], message: "the site must be served over https in production" });
    }
    if (env.SMS_PROVIDER === "unifonic" && !env.UNIFONIC_APP_SID) ctx.addIssue({ code: "custom", path: ["UNIFONIC_APP_SID"], message: "required for unifonic" });
    if (env.PAYMENT_PROVIDER === "moyasar" && (!env.MOYASAR_SECRET_KEY || !env.MOYASAR_WEBHOOK_SECRET)) ctx.addIssue({ code: "custom", path: ["MOYASAR_SECRET_KEY"], message: "secret key and webhook secret required for moyasar" });
    if (env.PAYMENT_PROVIDER === "tap" && !env.TAP_SECRET_KEY) ctx.addIssue({ code: "custom", path: ["TAP_SECRET_KEY"], message: "required for tap" });
    if (env.EMAIL_PROVIDER === "resend" && !env.RESEND_API_KEY) ctx.addIssue({ code: "custom", path: ["RESEND_API_KEY"], message: "required for resend" });
    if (env.EMAIL_PROVIDER === "smtp" && !env.SMTP_URL) ctx.addIssue({ code: "custom", path: ["SMTP_URL"], message: "required for smtp" });
    if (env.WHATSAPP_PROVIDER === "meta" && (!env.WHATSAPP_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID)) ctx.addIssue({ code: "custom", path: ["WHATSAPP_TOKEN"], message: "token and phone number id required for meta" });
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
