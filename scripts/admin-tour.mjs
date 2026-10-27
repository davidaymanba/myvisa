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

const pages = process.env.PAGES?.split(",") ?? ["/admin", "/admin/destinations", "/admin/settings", "/admin/inbox", "/admin/audit"];
for (const path of pages) {
  await p.goto(`${base}${path}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(2200);
  const name = path.replace(/^\/(en\/)?admin\/?/, "").replace(/\//g, "_") || "overview";
  await p.screenshot({ path: `${out}/${scheme}-${width}-${name}.png`, fullPage: process.env.FULL === "1" });
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log(path, "overflow", overflow);
}
console.log("errors", errors.length ? errors : "none");
await b.close();
