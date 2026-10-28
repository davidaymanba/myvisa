// Browser walkthrough of the customer dashboard and public tracking (Arabic UI by default), one screenshot per page.
// Usage: node scripts/account-tour.mjs <base-url> <out-dir>   env: W=390 (viewport), LOCALE=en, DARK=1
// Needs web + API running, `pnpm db:seed-demo` loaded (customer 0500000002) and OTP_DEV_CODE=000000.
import { chromium } from "playwright-core";
const base = process.argv[2] ?? "http://localhost:3100";
const S = `${process.argv[3] ?? "."}/`;
const W = +(process.env.W ?? 1440);
const L = process.env.LOCALE === "en" ? "/en" : "";
const tag = `${W}${L ? "-en" : ""}${process.env.DARK ? "-dark" : ""}`;
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const ctx = await b.newContext({ viewport: { width: W, height: 900 }, colorScheme: process.env.DARK ? "dark" : "light" });
const p = await ctx.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(String(e.stack ?? e).slice(0, 600)));
p.on("console", (m) => m.type() === "error" && !m.text().includes("401") && errors.push(m.text().slice(0, 200)));
const shot = async (name, full = true) => {
  await p.waitForTimeout(1200);
  // Scroll through so scroll-triggered sections reveal themselves before the full-page capture.
  if (full) {
    const h = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 500) {
      await p.evaluate((top) => window.scrollTo(0, top), y);
      await p.waitForTimeout(120);
    }
    await p.evaluate(() => window.scrollTo(0, 0));
  }
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${S}${tag}-${name}.png`, fullPage: full });
  console.log("shot", name, "overflow", await p.evaluate(() => document.documentElement.scrollWidth - innerWidth));
};

await p.goto(`${base}${L}/account`, { waitUntil: "networkidle" });
await p.waitForTimeout(2600);
await shot("0-login", false);
await p.locator("input[type=tel]").fill("0500000002");
await p.locator("form button[type=submit]").first().click();
await p.waitForTimeout(900);
await p.locator('input[autocomplete="one-time-code"]').fill("000000");
await p.waitForURL(/\/account$/, { timeout: 15000 });
await shot("1-overview");
for (const [path, name] of [["/account/orders", "2-orders"], ["/account/travelers", "3-travelers"], ["/account/documents", "4-vault"], ["/account/notifications", "5-notifications"], ["/account/invoices", "6-invoices"], ["/account/profile", "7-profile"]]) {
  await p.goto(`${base}${L}${path}`, { waitUntil: "networkidle" });
  await shot(name);
}
// Order pages: the one waiting on the customer, and the one with the conversation.
await p.goto(`${base}${L}/account/orders`, { waitUntil: "networkidle" });
const links = await p.locator('a[href*="/account/orders/"]').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href").split("#")[0]))]);
for (const [i, href] of links.slice(0, 3).entries()) {
  await p.goto(`${base}${href}`, { waitUntil: "networkidle" });
  await shot(`8-order-${i}`);
}
await p.goto(`${base}${L}/account/invoices`, { waitUntil: "networkidle" });
const inv = await p.locator('a[href*="/account/invoices/"]').first().getAttribute("href");
if (inv) {
  await p.goto(`${base}${inv}`, { waitUntil: "networkidle" });
  await shot("9-invoice");
}
// Public tracking with the delivered order's number.
const number = await p.evaluate(() => document.body.innerText.match(/MV-\d{2}-[0-9A-Z]{6}/)?.[0]);
await p.goto(`${base}${L}/track?order=${number}`, { waitUntil: "networkidle" });
await shot("10-track-form", false);
await p.locator("input[type=tel]").fill("0500000002");
await p.locator("form button[type=submit]").click();
await p.waitForTimeout(900);
await p.locator('input[autocomplete="one-time-code"]').fill("000000");
await p.waitForTimeout(3500);
await shot("11-track-result");
console.log(errors.length ? `ERRORS:\n${errors.join("\n")}` : "no page errors");
await b.close();
