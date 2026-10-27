import * as Sentry from "@sentry/nestjs";
import { loadEnv } from "./config/env";

// Must run before anything else is imported. Without a DSN, Sentry stays disabled (no-op).
const env = loadEnv();
if (env.SENTRY_DSN) {
  Sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV, tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1) });
}
