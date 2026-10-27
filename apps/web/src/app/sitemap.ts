import { DESTINATIONS, SERVICE_CATEGORIES } from "@myvisa/shared";
import type { MetadataRoute } from "next";
import { SITE_URL, localePath } from "@/lib/seo";

const STATIC = ["/", "/destinations", "/visa-finder", "/services", "/pricing", "/about", "/contact", "/terms", "/refund-policy", "/privacy"];

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [...STATIC, ...DESTINATIONS.map((d) => `/destinations/${d.slug}`), ...SERVICE_CATEGORIES.map((s) => `/services/${s.slug}`)];
  return paths.map((path) => ({
    url: `${SITE_URL}${localePath("ar", path)}`,
    changeFrequency: path.startsWith("/destinations/") ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path.startsWith("/destinations") ? 0.8 : 0.6,
    alternates: { languages: { ar: `${SITE_URL}${localePath("ar", path)}`, en: `${SITE_URL}${localePath("en", path)}` } },
  }));
}
