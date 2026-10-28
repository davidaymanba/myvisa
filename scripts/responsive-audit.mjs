// Responsive QA: visits every screen (public site, apply, account, admin) at phone widths and reports what breaks
// the layout — page-level horizontal scroll, elements that stick out of the viewport, clipped text, tiny tap targets.
// Usage: node scripts/responsive-audit.mjs <base-url> <out-dir> [chromium|webkit]
//   WIDTHS=320,375,390,430  LOCALES=ar,en  AREAS=public,apply,account,admin  SHOTS=1 (viewport screenshots per page)
//   ONLY=/admin/orders,/account (exact paths, skips discovery of the rest)
// Needs the web app and the API running with OTP_DEV_CODE; sessions are cached in <out-dir>/state-*.json.
import { chromium, webkit, devices } from "playwright-core";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const [,, base = "http://localhost:3100", out = "responsive", engine = "chromium"] = process.argv;
const WIDTHS = (process.env.WIDTHS ?? "320,375,390,430").split(",").map(Number);
const LOCALES = (process.env.LOCALES ?? "ar,en").split(",");
const AREAS = (process.env.AREAS ?? "public,apply,account,admin").split(",");
const SHOTS = process.env.SHOTS === "1";
mkdirSync(out, { recursive: true });

const browser =
  engine === "webkit"
    ? await webkit.launch()
    : await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const iphone = devices["iPhone 15"];
const ctxOptions = (width, storageState) => ({
  viewport: { width, height: Math.round(width * 2.16) },
  deviceScaleFactor: 2,
  isMobile: engine !== "webkit" ? true : undefined,
  hasTouch: true,
  userAgent: iphone.userAgent,
  storageState,
});

/** A context signed in as `phone`; reuses the cached session, refreshes it, or signs in with the dev OTP. */
async function session(name, phone) {
  const file = `${out}/state-${name}.json`;
  const ctx = await browser.newContext({ ...ctxOptions(390), storageState: existsSync(file) ? file : undefined });
  const me = () => ctx.request.get(`${base}/api/v1/auth/me`).then((r) => r.ok());
  if (!(await me())) {
    const csrf = (await ctx.cookies()).find((c) => c.name === "mv_csrf")?.value;
    await ctx.request.post(`${base}/api/v1/auth/refresh`, { headers: { origin: base, ...(csrf ? { "x-csrf-token": csrf } : {}) } });
  }
  if (!(await me())) {
    await ctx.clearCookies(); // stale CSRF/refresh cookies would make the OTP endpoints demand a token
    let res = await ctx.request.post(`${base}/api/v1/auth/otp/request`, { data: { phone } });
    if (res.status() === 429) throw new Error(`${name}: OTP rate-limited (${await res.text()})`);
    res = await ctx.request.post(`${base}/api/v1/auth/otp/verify`, { data: { phone, code: "000000" } });
    if (!res.ok()) throw new Error(`${name}: login failed ${res.status()} ${await res.text()}`);
  }
  await ctx.storageState({ path: file });
  const state = await ctx.storageState();
  await ctx.close();
  return state;
}

const states = {
  admin: AREAS.includes("admin") ? await session("admin", "0500000001") : undefined,
  account: AREAS.includes("account") ? await session("customer", "0500000002") : undefined,
};

/** First link on `listPath` whose href matches `re` (used to reach detail pages without hard-coding ids). */
async function firstLink(state, listPath, re) {
  const ctx = await browser.newContext({ ...ctxOptions(1280), storageState: state });
  const p = await ctx.newPage();
  await p.goto(`${base}${listPath}`, { waitUntil: "networkidle" }).catch(() => {});
  await p.waitForTimeout(800);
  const hrefs = await p.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
  await ctx.close();
  return hrefs.find((h) => re.test(h ?? "")) ?? null;
}

const routes = { public: [], apply: [], account: [], admin: [] };
routes.public = ["/", "/destinations", "/visa-finder", "/services", "/pricing", "/about", "/contact", "/blog", "/track", "/privacy", "/terms", "/refund-policy", "/not-a-page"];
routes.apply = ["/apply", "/account/login", "/admin/login", "/pay/mock"];
routes.account = ["/account", "/account/orders", "/account/travelers", "/account/documents", "/account/invoices", "/account/notifications", "/account/profile"];
routes.admin = ["/admin", "/admin/orders", "/admin/customers", "/admin/reports", "/admin/coupons", "/admin/staff", "/admin/destinations", "/admin/destinations/new", "/admin/blog", "/admin/blog/new", "/admin/inbox", "/admin/testimonials", "/admin/settings", "/admin/audit"];

if (!process.env.ONLY) {
  const add = (area, href) => href && routes[area].push(href.replace(/^\/en(?=\/)/, ""));
  if (AREAS.includes("public")) {
    add("public", await firstLink(undefined, "/destinations", /^\/destinations\/[a-z-]+$/));
    add("public", await firstLink(undefined, "/services", /^\/services\/[a-z-]+$/));
    add("public", await firstLink(undefined, "/blog", /^\/blog\/[a-z0-9-]+$/));
  }
  if (states.account) {
    add("account", await firstLink(states.account, "/account/orders", /^\/account\/orders\/[^/?#]+$/));
    add("account", await firstLink(states.account, "/account/invoices", /^\/account\/invoices\/[^/?#]+$/));
  }
  if (states.admin) {
    const order = await firstLink(states.admin, "/admin/orders?layout=table", /^\/admin\/orders\/[^/?#]+$/);
    add("admin", order);
    add("admin", await firstLink(states.admin, "/admin/customers", /^\/admin\/customers\/[^/?#]+$/));
    add("admin", await firstLink(states.admin, "/admin/destinations", /^\/admin\/destinations\/(?!new)[^/?#]+$/));
    add("admin", await firstLink(states.admin, "/admin/blog", /^\/admin\/blog\/(?!new)[^/?#]+$/));
    if (order) add("admin", await firstLink(states.admin, order, /^\/admin\/invoices\/[^/?#]+$/));
  }
}

const only = process.env.ONLY?.split(",");
const jobs = only
  ? only.map((path) => ({ area: path.startsWith("/admin") && path !== "/admin/login" ? "admin" : path.startsWith("/account") && path !== "/account/login" ? "account" : "public", path }))
  : AREAS.flatMap((area) => routes[area].map((path) => ({ area, path })));

/** Runs in the page: everything that makes a phone layout break, as plain data. */
function inspect() {
  const vw = document.documentElement.clientWidth;
  const label = (el) => {
    const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).slice(0, 6).join(".") : "";
    const text = (el.innerText ?? el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
    return `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${cls ? "." + cls : ""}${text ? ` "${text}"` : ""}`;
  };
  const visible = (el, r) => {
    if (r.width === 0 || r.height === 0) return false;
    const s = getComputedStyle(el);
    return s.visibility !== "hidden" && s.display !== "none" && +s.opacity > 0.02;
  };
  // An ancestor that clips horizontally hides the overflow, unless it is itself sticking out. A horizontal
  // scroller (rails, kanban columns) is intentional, so anything inside one counts as handled.
  const clippedBy = (el) => {
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.overflowX === "auto" || s.overflowX === "scroll") return true;
      if (s.overflowX !== "visible" || s.contain.includes("paint")) {
        const r = a.getBoundingClientRect();
        if (r.left >= -1 && r.right <= vw + 1) return true;
        // An off-screen clipping box (a card in a rail) is fine if a scroller further up contains it.
        continue;
      }
      if (s.position === "fixed") return false;
    }
    return false;
  };
  const offenders = [];
  const clipped = [];
  const tiny = [];
  const all = document.body.querySelectorAll("*");
  for (const el of all) {
    if (el.closest("[aria-hidden='true'], svg, [data-audit-ignore], .sr-only")) continue;
    const r = el.getBoundingClientRect();
    if (!visible(el, r)) continue;
    if ((r.right > vw + 1 || r.left < -1) && !clippedBy(el)) {
      const parent = el.parentElement?.getBoundingClientRect();
      const parentOut = parent && (parent.right > vw + 1 || parent.left < -1) && !clippedBy(el.parentElement);
      if (!parentOut) offenders.push({ el: label(el), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) });
    }
    const s = getComputedStyle(el);
    // 1px boxes are visually-hidden labels (sr-only, max-sm:sr-only), not clipped text.
    if (r.width > 1 && el.childElementCount === 0 && el.textContent.trim() && el.scrollWidth > el.clientWidth + 1 && s.overflowX !== "visible" && s.textOverflow !== "ellipsis" && !s.webkitLineClamp?.match(/^\d/))
      clipped.push(label(el));
    if (el.matches("a[href], button, [role='button'], input:not([type='hidden']), select, [role='tab'], [role='checkbox'], [role='radio']") && (r.width < 24 || r.height < 24) && !el.closest("p, li > p, .prose"))
      tiny.push(`${label(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  const fontTooSmall = [...document.querySelectorAll("input, textarea, select")].filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16 && el.type !== "hidden" && el.offsetParent).map(label);
  return {
    overflow: document.documentElement.scrollWidth - vw,
    offenders: offenders.slice(0, 12),
    clipped: [...new Set(clipped)].slice(0, 8),
    tiny: [...new Set(tiny)].slice(0, 10),
    tinyCount: tiny.length,
    inputZoom: fontTooSmall.slice(0, 5),
    url: location.pathname,
  };
}

const report = [];
for (const width of WIDTHS) {
  const ctxs = {};
  for (const area of ["public", "account", "admin"]) ctxs[area] = await browser.newContext(ctxOptions(width, area === "public" ? undefined : states[area]));
  for (const { area, path } of jobs) {
    for (const loc of LOCALES) {
      const url = `${base}${loc === "en" ? "/en" : ""}${path === "/" && loc === "en" ? "" : path}`;
      const p = await (ctxs[area === "apply" ? "public" : area] ?? ctxs.public).newPage();
      const errors = [];
      p.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
      try {
        await p.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
      } catch (e) {
        errors.push(`goto: ${e.message.slice(0, 120)}`);
      }
      await p.waitForTimeout(1200);
      // Scroll through so scroll-driven sections lay themselves out, checking at every stop.
      // Data screens grow after their queries settle, so the height is re-read at every stop.
      const height = () => p.evaluate(() => document.documentElement.scrollHeight).catch(() => 0);
      await p.waitForFunction(() => !document.querySelector(".skeleton-shimmer"), null, { timeout: 8000 }).catch(() => {});
      const vh = p.viewportSize().height;
      const found = { overflow: 0, offenders: new Map(), clipped: new Set(), tiny: new Set(), tinyCount: 0, inputZoom: new Set() };
      let shot = 0;
      for (let y = 0; y < (await height()) && y < 40 * vh; y += vh * 0.8) {
        await p.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y).catch(() => {});
        await p.mouse.wheel(0, 1).catch(() => {});
        await p.waitForTimeout(350);
        const r = await p.evaluate(inspect).catch((e) => ({ error: e.message }));
        if (r.error) { errors.push(r.error.slice(0, 120)); break; }
        found.overflow = Math.max(found.overflow, r.overflow);
        for (const o of r.offenders) found.offenders.set(o.el, o);
        r.clipped.forEach((c) => found.clipped.add(c));
        r.tiny.forEach((c) => found.tiny.add(c));
        found.tinyCount = Math.max(found.tinyCount, r.tinyCount);
        r.inputZoom.forEach((c) => found.inputZoom.add(c));
        if (SHOTS && width === WIDTHS[0] && shot < 12) {
          const name = `${area}${path.replace(/[/?=&]/g, "_")}-${loc}-${width}-${String(shot++).padStart(2, "0")}.png`;
          await p.screenshot({ path: `${out}/${name}`, scale: "css" }).catch(() => {});
        }
      }
      const entry = {
        width, loc, area, path, final: p.url().replace(base, ""),
        overflow: found.overflow,
        offenders: [...found.offenders.values()].slice(0, 12),
        clipped: [...found.clipped].slice(0, 8),
        tiny: [...found.tiny].slice(0, 8), tinyCount: found.tinyCount,
        inputZoom: [...found.inputZoom],
        errors,
      };
      report.push(entry);
      const flag = entry.overflow > 0 || entry.offenders.length || entry.errors.length ? "✗" : entry.clipped.length || entry.inputZoom.length ? "~" : "✓";
      console.log(`${flag} ${width} ${loc} ${path}${entry.final.endsWith(path) || entry.final === "/" || entry.final === "/en" ? "" : ` → ${entry.final}`}  overflow=${entry.overflow} out=${entry.offenders.length} clip=${entry.clipped.length} tiny=${entry.tinyCount} zoom=${entry.inputZoom.length}${errors.length ? ` errors=${errors.length}` : ""}`);
      await p.close();
    }
  }
  for (const c of Object.values(ctxs)) await c.close();
}
writeFileSync(`${out}/report-${engine}.json`, JSON.stringify(report, null, 2));
await browser.close();
