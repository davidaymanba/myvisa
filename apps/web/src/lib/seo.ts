import type { Metadata } from "next";
import { routing, type Locale } from "@/i18n/routing";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://myvisa.sa";

/** Locale-aware path: Arabic lives at the root, English under /en. */
export function localePath(locale: Locale, path: string) {
  const clean = path === "/" ? "" : path;
  return locale === routing.defaultLocale ? clean || "/" : `/${locale}${clean}`;
}

/** Canonical + hreflang alternates + OpenGraph for a page. */
export function pageMetadata({ locale, path, title, description, image }: { locale: Locale; path: string; title: string; description: string; image?: string }): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: localePath(locale, path),
      languages: { ar: localePath("ar", path), en: localePath("en", path), "x-default": localePath("ar", path) },
    },
    openGraph: {
      title,
      description,
      url: localePath(locale, path),
      siteName: locale === "ar" ? "ماي فيزا" : "myvisa",
      locale: locale === "ar" ? "ar_SA" : "en_SA",
      type: "website",
      // A page's own openGraph replaces the parent's, so the default share card has to be named here.
      images: [image ? { url: image, width: 1200, height: 630 } : { url: `${localePath(locale, "/") === "/" ? "" : localePath(locale, "/")}/opengraph-image`, width: 1200, height: 630, alt: "myvisa" }],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** Renders a JSON-LD script tag. */
export function jsonLd(data: Record<string, unknown>) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
