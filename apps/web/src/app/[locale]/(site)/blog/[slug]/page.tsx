import type { AppLocale } from "@myvisa/shared";
import { ArrowUpRight, Clock3 } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { CopyLink, ReadingProgress, Toc } from "@/components/blog/article-chrome";
import { PostCard } from "@/components/blog/blog-grid";
import { Markdown, outline } from "@/components/blog/markdown";
import { PassportStamp } from "@/components/brand/passport-stamp";
import { FadeIn } from "@/components/motion/fade-in";
import { SplitReveal } from "@/components/motion/split-reveal";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getArticle, getBlog } from "@/lib/api/server";
import { unsplash } from "@/lib/images";
import { SITE_URL, jsonLd, localePath, pageMetadata } from "@/lib/seo";

export async function generateStaticParams() {
  const posts = await getBlog();
  return routing.locales.flatMap((locale) => posts.map((p) => ({ locale, slug: p.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getArticle(slug);
  if (!post) return {};
  const translated = locale === "ar" || Boolean(post.body.en);
  const meta = pageMetadata({
    locale,
    path: `/blog/${slug}`,
    title: post.title[locale] ?? post.title.ar,
    description: post.excerpt[locale] ?? post.excerpt.ar ?? "",
    image: post.coverImageId ? unsplash(post.coverImageId, 1200) : undefined,
  });
  return {
    ...meta,
    openGraph: { ...meta.openGraph, type: "article", publishedTime: post.publishedAt, modifiedTime: post.updatedAt, tags: post.tags },
    // An Arabic-only guide under /en would be duplicate content: point search engines at the Arabic page.
    ...(translated ? {} : { robots: { index: false, follow: true }, alternates: { canonical: localePath("ar", `/blog/${slug}`) } }),
  };
}

export default function ArticlePage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = use(params);
  setRequestLocale(locale);
  const post = use(getArticle(slug));
  if (!post) notFound();
  const t = useTranslations("blog");
  const tc = useTranslations("common");
  const format = useFormatter();
  const l = locale as AppLocale;
  const translated = l === "ar" || Boolean(post.body.en);
  const body = (translated ? post.body[l] : null) ?? post.body.ar;
  const title = (translated ? post.title[l] : null) ?? post.title.ar;
  const toc = outline(body);
  const related = use(getBlog())
    .filter((p) => p.slug !== slug && (l === "ar" || p.title.en))
    .sort((a, b) => b.tags.filter((x) => post.tags.includes(x)).length - a.tags.filter((x) => post.tags.includes(x)).length)
    .slice(0, 3);
  const url = `${SITE_URL}${localePath(locale, `/blog/${slug}`)}`;

  return (
    <>
      <ReadingProgress />
      <header data-surface="dark" className="dark relative isolate flex min-h-[78svh] items-end overflow-hidden bg-ink-950 text-foreground">
        {post.coverImageId && <Image src={unsplash(post.coverImageId, 2000)} alt={post.coverAlt ?? ""} fill priority sizes="100vw" className="-z-20 object-cover opacity-55" />}
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-ink-950/70 to-ink-950/20" />
        <div className="container-page flex flex-col gap-6 pb-16 pt-36 sm:pb-20">
          <FadeIn>
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-caption text-foreground/60">
              <Link href="/" className="-my-1 py-1 hover:text-foreground">
                {tc("breadcrumbHome")}
              </Link>
              <span aria-hidden>/</span>
              <Link href="/blog" className="-my-1 py-1 hover:text-foreground">
                {t("eyebrow")}
              </Link>
            </nav>
          </FadeIn>
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span key={tag} lang="en" className="rounded-full border border-white/20 px-3 py-1 text-caption text-foreground/80">
                #{tag}
              </span>
            ))}
          </div>
          <SplitReveal as="h1" trigger="mount" delay={0.1} className="max-w-5xl text-[clamp(2.4rem,1.4rem+4.2vw,5.5rem)] font-medium leading-[1.02] tracking-[-0.03em] [:lang(ar)_&]:leading-[1.25]" lines={[{ text: title }]} />
          <FadeIn delay={0.4} className="flex flex-wrap items-center gap-x-5 gap-y-2 text-body-sm text-foreground/70">
            {post.author && <span>{t("by", { name: post.author })}</span>}
            <time dateTime={post.publishedAt}>{t("published", { date: format.dateTime(new Date(post.publishedAt), { day: "numeric", month: "long", year: "numeric" }) })}</time>
            <span className="flex items-center gap-1.5">
              <Clock3 className="size-4" aria-hidden />
              {t("minutes", { count: (translated ? post.readingMinutes[l] : null) ?? post.readingMinutes.ar })}
            </span>
          </FadeIn>
        </div>
      </header>

      <div className="container-page grid grid-cols-1 gap-12 py-16 sm:py-20 lg:grid-cols-12">
        <aside className="hidden lg:col-span-3 lg:block">
          <div className="sticky top-28 flex flex-col gap-8">
            <Toc items={toc} />
            <div className="flex flex-col gap-3">
              <span className="eyebrow text-muted-foreground">{t("share")}</span>
              <CopyLink />
            </div>
          </div>
        </aside>
        <article className="min-w-0 lg:col-span-7" lang={translated ? locale : "ar"} dir={translated ? undefined : "rtl"}>
          {!translated && <p className="mb-8 rounded-2xl bg-info-soft px-5 py-3 text-body-sm text-info">{t("arabicOnly")}</p>}
          {(translated ? post.excerpt[l] : post.excerpt.ar) && <p className="mb-10 border-s-4 border-primary ps-5 font-display text-title leading-relaxed text-foreground/90">{translated ? post.excerpt[l] : post.excerpt.ar}</p>}
          <Markdown source={body} />
          <div className="mt-12 lg:hidden">
            <CopyLink />
          </div>
        </article>
      </div>

      <section className="container-page pb-16">
        <div data-surface="dark" className="dark relative isolate overflow-hidden rounded-[2.5rem] bg-ink-950 px-8 py-14 text-foreground sm:px-14">
          <div aria-hidden className="absolute -end-24 -top-24 -z-10 size-96 animate-drift rounded-full bg-teal-500/30 blur-[100px]" />
          <PassportStamp animated shape="oval" tone="gold" top="MYVISA · GUIDE" bottom="READY" code="✓" rotate={-12} className="pointer-events-none absolute -bottom-6 end-8 hidden w-40 opacity-70 sm:block [&_svg]:mix-blend-normal" />
          <div className="flex max-w-xl flex-col gap-4">
            <h2 className="font-display text-display-md">{t("cta.title")}</h2>
            <p className="text-body-lg text-foreground/70">{t("cta.lead")}</p>
            <Button asChild size="lg" className="w-fit">
              <Link href="/apply">
                {t("cta.button")}
                <ArrowUpRight className="flip-rtl" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="container-page pb-24">
          <h2 className="mb-8 font-display text-display-md">{t("related")}</h2>
          <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p, i) => (
              <PostCard key={p.slug} post={p} index={i} />
            ))}
          </div>
        </section>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "BlogPosting",
              headline: title,
              description: post.excerpt[l] ?? post.excerpt.ar ?? undefined,
              image: post.coverImageId ? unsplash(post.coverImageId, 1200) : undefined,
              datePublished: post.publishedAt,
              dateModified: post.updatedAt,
              inLanguage: translated ? locale : "ar",
              mainEntityOfPage: url,
              keywords: post.tags.join(", "),
              author: { "@type": "Organization", name: l === "ar" ? "ماي فيزا" : "myvisa", url: SITE_URL },
              publisher: { "@type": "Organization", name: l === "ar" ? "ماي فيزا" : "myvisa", url: SITE_URL },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: tc("breadcrumbHome"), item: `${SITE_URL}${localePath(locale, "/")}` },
                { "@type": "ListItem", position: 2, name: t("eyebrow"), item: `${SITE_URL}${localePath(locale, "/blog")}` },
                { "@type": "ListItem", position: 3, name: title, item: url },
              ],
            },
          ],
        })}
      />
    </>
  );
}
