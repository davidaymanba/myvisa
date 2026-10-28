import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const DEV_CODE = process.env.E2E_OTP_CODE ?? "000000";

/** A fresh Saudi mobile per run (5XXXXXXXX), so OTP rate limits never collide between runs. */
export function freshMobile(): string {
  return `05${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
}

export const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

/** Signs a browser context in through the real OTP endpoints (dev code), like a returning user would. */
export async function signInViaApi(request: APIRequestContext, phone: string) {
  const e164 = `+966${phone.replace(/^0/, "")}`;
  const sent = await request.post("/api/v1/auth/otp/request", { data: { phone: e164 } });
  expect([202, 429]).toContain(sent.status());
  const ok = await request.post("/api/v1/auth/otp/verify", { data: { phone: e164, code: DEV_CODE } });
  expect(ok.status()).toBe(200);
}

/** Fills the 6-digit OTP input the way a phone keyboard's autofill does. */
export async function enterCode(page: Page) {
  await page.locator('input[autocomplete="one-time-code"]').fill(DEV_CODE);
}
