// Visual QA for the admin panel: signs in through the real OTP flow (dev code), then screenshots each screen.
// Usage: node scripts/admin-tour.mjs <base-url> <out-dir> [width=1440] [light|dark] [phone=0500000001] [code=000000]
// Needs the web app and the API running, with OTP_DEV_CODE set on the API.
import { chromium } from "playwright-core";

const [,, base = "http://localhost:3100", out = ".", width = "1440", scheme = "light", phone = "0500000001", code = "000000"] = process.argv;
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const ctx = await b.newContext({ viewport: { width: +width, height: 900 }, colorScheme: scheme });
const p = await ctx.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));

// Sign in via the API proxy so the browser context receives the session cookies.
let res = await ctx.request.post(`${base}/api/v1/auth/otp/request`, { data: { phone } });
if (res.status() === 429) {
  const wait = (await res.json()).retryAfter ?? 60;
  console.log(`cooldown ${wait}s`);
  await new Promise((r) => setTimeout(r, (wait + 1) * 1000));
  res = await ctx.request.post(`${base}/api/v1/auth/otp/request`, { data: { phone } });
}
res = await ctx.request.post(`${base}/api/v1/auth/otp/verify`, { data: { phone, code } });
if (!res.ok()) throw new Error(`login failed: ${res.status()} ${await res.text()}`);

// ":order" / ":customer" in a path become the most urgent open order and its customer.
const queue = await (await ctx.request.get(`${base}/api/v1/admin/orders?view=all&pageSize=50`)).json().catch(() => ({ items: [] }));
const urgent = queue.items?.find((o) => o.status === "ACTION_REQUIRED") ?? queue.items?.find((o) => o.status === "APPOINTMENT_BOOKED") ?? queue.items?.[0];
const pages = (process.env.PAGES?.split(",") ?? ["/admin", "/admin/orders", "/admin/orders/:order", "/admin/customers", "/admin/customers/:customer", "/admin/reports", "/admin/coupons", "/admin/staff", "/admin/destinations", "/admin/settings", "/admin/inbox", "/admin/audit"]).map((path) =>
  path.replace(":order", urgent?.id ?? "none").replace(":customer", urgent?.customer.id ?? "none"),
);
for (const path of pages) {
  await p.goto(`${base}${path}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  // Let scroll-triggered sections reveal themselves before a full-page capture.
  if (process.env.FULL === "1") {
    const h = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 500) await p.evaluate((top) => window.scrollTo(0, top), y).then(() => p.waitForTimeout(100));
    await p.evaluate(() => window.scrollTo(0, 0));
  }
  await p.waitForTimeout(900);
  const name = path.replace(/^\/(en\/)?admin\/?/, "").replace(/\//g, "_").replace(/_[a-z0-9]{20,}$/, "_detail") || "overview";
  await p.screenshot({ path: `${out}/${scheme}-${width}-${name}.png`, fullPage: process.env.FULL === "1" });
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log(path, "overflow", overflow);
}
console.log("errors", errors.length ? errors : "none");
await b.close();
