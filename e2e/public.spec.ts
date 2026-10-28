import { expect, test } from "@playwright/test";

test("home, language switch and a destination @mobile", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await page.goto("/destinations/france");
  await expect(page.locator('script[type="application/ld+json"]').first()).toBeAttached();
});

test("travel guides render with structured data @mobile", async ({ page }) => {
  await page.goto("/blog");
  await expect(page.getByRole("heading", { name: "اقرأ قبل أن تقدّم" })).toBeVisible();
  await page.goto("/blog/visa-photo-guide");
  await expect(page.locator("article h2").first()).toBeVisible();
  const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(ld).toContain("BlogPosting");
});

test("robots, sitemap and security headers", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /admin");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/blog/schengen-visa-checklist");
  const home = await request.get("/");
  const csp = home.headers()["content-security-policy"] ?? "";
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).not.toContain("unsafe-eval");
  expect(home.headers()["x-content-type-options"]).toBe("nosniff");
});
