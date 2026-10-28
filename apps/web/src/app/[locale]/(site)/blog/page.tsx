import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";
import { BlogGrid, FeaturedPost } from "@/components/blog/blog-grid";
import { PageHero } from "@/components/layout/page-hero";
import type { Locale } from "@/i18n/routing";
import { getBlog } from "@/lib/api/server";
import { SITE_URL, jsonLd, localePath, pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog.meta" });
  return pageMetadata({ locale, path: "/blog", title: t("title"), description: t("description") });
}

export default function BlogPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("blog");
  // English readers only see guides that exist in English.
  const posts = use(getBlog()).filter((p) => locale === "ar" || p.title.en);
  const [featured, ...rest] = posts;

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} crumbs={[{ label: t("eyebrow") }]} />
      <section className="container-page flex flex-col gap-16 py-16 sm:py-24">
        {featured ? (
          <>
            <FeaturedPost post={featured} />
            {rest.length > 0 && <BlogGrid posts={rest} />}
          </>
        ) : (
          <div className="py-20 text-center">
            <p className="font-display text-heading">{t("empty")}</p>
            <p className="text-muted-foreground">{t("emptyLead")}</p>
          </div>
        )}
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@context": "https://schema.org",
          "@type": "Blog",
          name: t("meta.title"),
          url: `${SITE_URL}${localePath(locale, "/blog")}`,
          inLanguage: locale,
          blogPost: posts.slice(0, 20).map((p) => ({ "@type": "BlogPosting", headline: p.title[locale] ?? p.title.ar, url: `${SITE_URL}${localePath(locale, `/blog/${p.slug}`)}`, datePublished: p.publishedAt })),
        })}
      />
    </>
  );
}
