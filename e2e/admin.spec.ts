import { expect, test, type BrowserContext } from "@playwright/test";
import { signInViaApi } from "./helpers";

const ADMIN = process.env.E2E_ADMIN_PHONE ?? "0500000001";

// One OTP sign-in for the whole file (codes have a resend cooldown); every test reuses the session.
test.describe.configure({ mode: "serial" });
let staff: BrowserContext;
test.beforeAll(async ({ browser, baseURL }) => {
  staff = await browser.newContext({ baseURL, locale: "ar-SA" });
  await signInViaApi(staff.request, ADMIN);
});
test.afterAll(() => staff.close());

test("staff work an order from the board", async () => {
  const page = await staff.newPage();
  await page.goto("/admin/orders");
  await expect(page.getByRole("heading", { name: "مكتب العمليات" })).toBeVisible();

  // Table view is deterministic to click through.
  await page.getByRole("radio", { name: "جدول" }).click();
  await page.getByRole("tab", { name: "الكل" }).click();
  const first = page.locator("table a[href*='/admin/orders/']").first();
  await expect(first).toBeVisible();
  await first.click();

  await expect(page.getByRole("heading", { name: "مراجعة المستندات" })).toBeVisible();
  const note = `ملاحظة اختبار ${Date.now()}`;
  await page.getByPlaceholder("اكتب ملاحظة للفريق…").fill(note);
  await page.getByRole("button", { name: "إضافة", exact: true }).click();
  await expect(page.getByText(note)).toBeVisible();
});

test("reports and the audit trail load for the super admin", async () => {
  const page = await staff.newPage();
  await page.goto("/admin/reports");
  await expect(page.getByText("إجمالي المحصّل")).toBeVisible();
  await page.goto("/admin/audit");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("main li, main tr").first()).toBeVisible();
});
