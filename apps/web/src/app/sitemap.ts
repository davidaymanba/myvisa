import { SERVICE_CATEGORIES } from "@myvisa/shared";
import type { MetadataRoute } from "next";
import { getBlog, getCatalog } from "@/lib/api/server";
import { SITE_URL, localePath } from "@/lib/seo";

const STATIC = ["/", "/destinations", "/visa-finder", "/services", "/pricing", "/blog", "/about", "/contact", "/track", "/terms", "/refund-policy", "/privacy"];

const url = (locale: "ar" | "en", path: string) => `${SITE_URL}${localePath(locale, path)}`;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ destinations }, posts] = await Promise.all([getCatalog(), getBlog()]);
  const paths = [...STATIC, ...destinations.map((d) => `/destinations/${d.slug}`), ...SERVICE_CATEGORIES.map((s) => `/services/${s.slug}`)];
  const pages: MetadataRoute.Sitemap = paths.map((path) => ({
    url: url("ar", path),
    changeFrequency: path.startsWith("/destinations/") ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path.startsWith("/destinations") ? 0.8 : 0.6,
    alternates: { languages: { ar: url("ar", path), en: url("en", path) } },
  }));
  // Guides only list an English alternate when the English version exists.
  const guides: MetadataRoute.Sitemap = posts.map((p) => ({
    url: url("ar", `/blog/${p.slug}`),
    lastModified: p.updatedAt,
    changeFrequency: "monthly",
    priority: 0.7,
    alternates: { languages: { ar: url("ar", `/blog/${p.slug}`), ...(p.title.en ? { en: url("en", `/blog/${p.slug}`) } : {}) } },
  }));
  return [...pages, ...guides];
}
