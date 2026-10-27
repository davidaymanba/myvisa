import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/style-guide", "/en/style-guide"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
