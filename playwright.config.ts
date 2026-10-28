import { defineConfig, devices } from "@playwright/test";

/**
 * Browser end-to-end tests against a running stack (web + API + infra, seeded, mock payments, OTP_DEV_CODE).
 * Locally: start the apps, then `pnpm test:browser`. CI starts everything first (see .github/workflows/ci.yml).
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100",
    locale: "ar-SA",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...(process.env.CHROME_PATH ? { launchOptions: { executablePath: process.env.CHROME_PATH } } : {}),
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
});
