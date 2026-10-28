import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    // Private and transactional areas carry noindex too; this keeps crawlers from spending time there.
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", ...["", "/en"].flatMap((p) => [`${p}/style-guide`, `${p}/admin`, `${p}/account`, `${p}/apply`, `${p}/pay`])] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
