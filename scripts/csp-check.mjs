// Loads pages and prints Content-Security-Policy violations and console errors (QA helper).
// Usage: node scripts/csp-check.mjs <base-url> <path> [path...]
import { chromium } from "playwright-core";
const [, , base = "http://localhost:3100", ...paths] = process.argv;
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const p = await b.newPage({ viewport: { width: +(process.env.W ?? 390), height: 844 } });
const found = [];
await p.addInitScript(() => document.addEventListener("securitypolicyviolation", (e) => console.error(`Refused (CSP) ${e.violatedDirective} ${e.blockedURI} ${e.sourceFile}:${e.lineNumber}`)));
p.on("console", (m) => /Content Security Policy|Refused/.test(m.text()) && found.push(m.text().slice(0, 300)));
for (const path of paths.length ? paths : ["/"]) {
  await p.goto(base + path, { waitUntil: "load" });
  await p.waitForTimeout(2500);
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(1500);
}
console.log(found.length ? [...new Set(found)].join("\n") : "no CSP violations");
await b.close();
