// End-to-end browser walkthrough of the apply wizard (Arabic UI): visa → sign-in → traveller → uploads →
// appointment → review → mock payment → confirmation, saving a screenshot per step.
// Usage: node scripts/apply-tour.mjs <base-url> <out-dir>   env: W=390 (viewport), PHONE=05XXXXXXXX, EMAIL=…
// Needs web + API running with PAYMENT_PROVIDER=mock and OTP_DEV_CODE=000000. Each phone gets 5 codes/hour.
import { writeFileSync } from "node:fs";
import { chromium } from "playwright-core";
const base = process.argv[2] ?? "http://localhost:3100";
const S = `${process.argv[3] ?? "."}/`;
writeFileSync(`${S}doc.pdf`, "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
const W = +(process.env.W ?? 1440);
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const ctx = await b.newContext({ viewport: { width: W, height: 900 }, colorScheme: "light" });
const p = await ctx.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(String(e.stack ?? e).slice(0, 600)));
p.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
const shot = async (name, full = false) => { await p.waitForTimeout(1400); await p.screenshot({ path: `${S}${W}-${name}.png`, fullPage: full }); console.log("shot", name, "overflow", await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)); };
const cont = () => p.getByRole("button", { name: /^متابعة|المتابعة إلى الدفع/ }).click();

await p.goto(`${base}/apply?to=france&purpose=TOURISM&as=SAUDI_CITIZEN`, { waitUntil: "networkidle" });
await shot("1-visa");
await p.locator('input[type=date]').nth(0).fill("2027-03-01");
await p.locator('input[type=date]').nth(1).fill("2027-03-12");
await cont();
await shot("2-gate");
await p.locator('input[type=tel]').fill(process.env.PHONE ?? "0555000111");
await p.getByRole("button", { name: "أرسل الرمز" }).click();
await p.waitForTimeout(800);
await p.locator('input[autocomplete="one-time-code"]').fill("000000");
await p.waitForTimeout(2000);
await p.fill('input[name="travelers.0.givenNameEn"]', "Noura");
await p.fill('input[name="travelers.0.surnameEn"]', "Alotaibi");
await p.fill('input[name="travelers.0.fullNameAr"]', "نورة العتيبي");
await p.fill('input[name="travelers.0.dateOfBirth"]', "1992-04-11");
await p.fill('input[name="travelers.0.passportNumber"]', `A${Date.now() % 10000000}`);
await p.fill('input[name="travelers.0.passportExpiry"]', "2031-01-01");
if (process.env.EMAIL) await p.fill('input[type=email]', process.env.EMAIL);
await shot("3-travelers", true);
await cont();
await p.waitForTimeout(2500);
await shot("4-documents-empty");
for (let i = 0; i < 20; i++) {
  const inputs = p.locator('input[type=file][multiple]');
  const n = await inputs.count();
  if (i >= n) break;
  await inputs.nth(i).setInputFiles(`${S}doc.pdf`);
  await p.waitForTimeout(700);
}
await p.waitForTimeout(4000);
await shot("5-documents-done", true);
await cont();
await p.waitForTimeout(1200);
if (await p.getByRole("button", { name: "الرياض" }).count()) {
  await p.getByRole("button", { name: "الرياض" }).click();
  await shot("6-appointment");
  await cont();
  await p.waitForTimeout(1500);
}
for (const box of await p.getByRole("checkbox").all()) await box.click();
await shot("7-review", true);
await cont();
await p.waitForTimeout(2500);
await shot("8-payment");
await p.getByRole("button", { name: /ادفع/ }).click();
await p.waitForURL(/pay\/mock/, { timeout: 15000 });
await shot("9-mock-gateway");
await p.getByRole("button", { name: /^ادفع/ }).click();
await p.waitForURL(/apply\/confirmation/, { timeout: 20000 });
await p.waitForTimeout(5000);
await shot("10-confirmation", true);
console.log("errors", errors.length ? errors : "none");
await b.close();
