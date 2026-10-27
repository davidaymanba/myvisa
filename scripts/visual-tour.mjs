// Visual QA: scrolls a page and saves viewport screenshots so design changes can be reviewed as images.
// Usage: node scripts/visual-tour.mjs <url> <out-prefix> [width=1440] [light|dark] [step=900] [max=40]
// Needs a running server (e.g. `pnpm --filter @myvisa/web start`) and Google Chrome installed (CHROME_PATH to override).
import { chromium } from "playwright-core";
const [,, url, prefix, width = "1440", scheme = "light", step = "900", max = "40"] = process.argv;
if (!url || !prefix) {
  console.error("Usage: node scripts/visual-tour.mjs <url> <out-prefix> [width] [light|dark] [step] [max]");
  process.exit(1);
}
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const p = await b.newPage({ viewport: { width: +width, height: 900 }, colorScheme: scheme });
const errors = [];
p.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
p.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
await p.goto(url, { waitUntil: "networkidle" });
await p.waitForTimeout(2600);
let i = 0;
const H = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < H && i < +max; y += +step) {
  await p.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), y);
  // nudge so Lenis/scroll listeners fire
  await p.mouse.wheel(0, 1);
  await p.waitForTimeout(1300);
  await p.screenshot({ path: `${prefix}-${String(i).padStart(2, "0")}.png` });
  i++;
}
const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
console.log("height", H, "shots", i, "overflow", overflow, "errors", errors.length ? errors.slice(0, 6) : "none");
await b.close();
