import { expect, test } from "@playwright/test";
import { PDF, enterCode, freshMobile } from "./helpers";

/**
 * The money path, end to end in the browser: visa → phone sign-in → traveller → uploads → appointment →
 * review with consents → mock gateway → confirmation; then the same order in the account and on /track.
 */
test("apply, pay, and follow the order", async ({ page }) => {
  const phone = freshMobile();
  const next = () => page.getByRole("button", { name: /^متابعة|المتابعة إلى الدفع/ }).click();

  await page.goto("/apply?to=france&purpose=TOURISM&as=SAUDI_CITIZEN");
  await page.locator("input[type=date]").nth(0).fill("2027-03-01");
  await page.locator("input[type=date]").nth(1).fill("2027-03-12");
  await next();

  // Inline phone gate.
  await page.locator("input[type=tel]").fill(phone);
  await page.getByRole("button", { name: "أرسل الرمز" }).click();
  await enterCode(page);

  // Traveller (MRZ names, a passport number unique to this run).
  await page.fill('input[name="travelers.0.givenNameEn"]', "Noura");
  await page.fill('input[name="travelers.0.surnameEn"]', "Alotaibi");
  await page.fill('input[name="travelers.0.dateOfBirth"]', "1992-04-11");
  await page.fill('input[name="travelers.0.passportNumber"]', `E${phone.slice(-7)}`);
  await page.fill('input[name="travelers.0.passportExpiry"]', "2031-01-01");
  await next();

  // One PDF per required slot, straight to storage, then the virus-scan worker clears them.
  const inputs = page.locator("input[type=file][multiple]");
  await expect(inputs.first()).toBeAttached();
  for (let i = 0; i < (await inputs.count()); i++) await inputs.nth(i).setInputFiles({ name: "scan.pdf", mimeType: "application/pdf", buffer: PDF });
  await expect(page.getByText("تم الاستلام")).toHaveCount(await inputs.count(), { timeout: 30_000 });
  await next();

  // Appointment preference (France needs a visa-centre appointment).
  await page.getByRole("button", { name: "الرياض" }).click();
  await next();

  // Review: every consent box, then pay.
  await expect(page.getByRole("heading", { name: "راجع كل شيء" })).toBeVisible();
  const boxes = page.getByRole("checkbox");
  await expect(boxes.first()).toBeVisible();
  for (const box of await boxes.all()) await box.check();
  await next();
  await page.getByRole("button", { name: /ادفع/ }).click();
  await page.waitForURL(/pay\/mock/);
  await page.getByRole("button", { name: /^ادفع/ }).click();
  await page.waitForURL(/apply\/confirmation/);
  await expect(page.getByRole("heading", { name: /تم استلام طلبك/ })).toBeVisible({ timeout: 30_000 });
  const number = (await page.getByText(/^MV-\d{2}-[0-9A-Z]{6}$/).first().textContent())!.trim();

  // The account lists it, with its invoice issued on payment.
  await page.goto("/account/orders");
  await expect(page.getByText(number).first()).toBeVisible();
  await page.goto("/account/invoices");
  await expect(page.getByText(`الطلب ${number}`)).toBeVisible();

  // Anyone with the number and the phone can track it.
  await page.goto(`/track?order=${number}`);
  await page.locator("input[type=tel]").fill(phone);
  await page.getByRole("button", { name: "أرسل الرمز" }).click();
  await enterCode(page);
  await expect(page.getByRole("heading", { name: "سجل الرحلة" })).toBeVisible();
  await expect(page.getByText("استلمنا طلبك ودفعتك")).toBeVisible();
});
