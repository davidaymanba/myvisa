// Counts the requests a page keeps making after load (QA helper for runaway loops).
// Usage: node scripts/request-watch.mjs <url> [seconds=8]
import { chromium } from "playwright-core";
const [, , url, seconds = "8"] = process.argv;
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const p = await b.newPage();
const counts = new Map();
p.on("request", (r) => {
  const key = r.url().replace(/\?.*$/, "").slice(-80);
  counts.set(key, (counts.get(key) ?? 0) + 1);
});
await p.goto(url, { waitUntil: "load" });
counts.clear();
await p.waitForTimeout(+seconds * 1000);
console.log([...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10));
await b.close();
