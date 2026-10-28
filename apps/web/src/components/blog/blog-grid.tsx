"use client";

import type { AppLocale, BlogSummary } from "@myvisa/shared";
import { ArrowUpRight, Clock3 } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import Image from "next/image";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { unsplash } from "@/lib/images";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/** The latest guide, magazine-cover style. */
export function FeaturedPost({ post }: { post: BlogSummary }) {
  const t = useTranslations("blog");
  const locale = useLocale() as AppLocale;
  const format = useFormatter();
  const title = post.title[locale] ?? post.title.ar;
  return (
    <motion.article initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.9, ease: EASE }} className="group relative isolate overflow-hidden rounded-[2.5rem] bg-ink-950 text-sand-100">
      <Link href={`/blog/${post.slug}`} className="grid min-h-[28rem] lg:grid-cols-2">
        <div className="relative min-h-64 overflow-hidden">
          {post.coverImageId && <Image src={unsplash(post.coverImageId, 1400)} alt={post.coverAlt ?? ""} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover transition-transform duration-[1.6s] ease-out group-hover:scale-105" />}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-transparent lg:bg-gradient-to-l rtl:lg:bg-gradient-to-r" />
        </div>
        <div className="relative flex flex-col justify-end gap-5 p-8 sm:p-12">
          <div aria-hidden className="absolute -end-20 -top-20 -z-10 size-80 animate-drift rounded-full bg-teal-500/30 blur-[90px]" />
          <span className="eyebrow text-gold-300">{t("featured")}</span>
          <h2 className="font-display text-[clamp(2rem,1.4rem+2.4vw,3.5rem)] leading-[1.15]">{title}</h2>
          {(post.excerpt[locale] ?? post.excerpt.ar) && <p className="max-w-lg text-body-lg text-sand-100/70">{post.excerpt[locale] ?? post.excerpt.ar}</p>}
          <div className="flex flex-wrap items-center gap-4 text-caption text-sand-100/60">
            <span>{format.dateTime(new Date(post.publishedAt), { day: "numeric", month: "long", year: "numeric" })}</span>
            <span className="flex items-center gap-1.5">
              <Clock3 className="size-3.5" aria-hidden />
              {t("minutes", { count: post.readingMinutes[locale] ?? post.readingMinutes.ar })}
            </span>
          </div>
          <span className="mt-2 inline-flex w-fit items-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground transition-transform group-hover:-translate-y-0.5">
            {t("read")}
            <ArrowUpRight className="size-4 flip-rtl" aria-hidden />
          </span>
        </div>
      </Link>
    </motion.article>
  );
}

export function PostCard({ post, index = 0 }: { post: BlogSummary; index?: number }) {
  const t = useTranslations("blog");
  const locale = useLocale() as AppLocale;
  const format = useFormatter();
  return (
    <motion.article layout initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: index * 0.06, duration: 0.6, ease: EASE }} className="group">
      <Link href={`/blog/${post.slug}`} className="flex h-full flex-col gap-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-muted">
          {post.coverImageId && <Image src={unsplash(post.coverImageId, 800)} alt={post.coverAlt ?? ""} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-110" />}
          <div className="absolute inset-x-3 top-3 flex flex-wrap gap-1.5">
            {post.tags.slice(0, 2).map((tag) => (
              <span key={tag} lang="en" className="rounded-full bg-ink-950/60 px-2.5 py-1 text-[0.7rem] font-medium text-sand-100 backdrop-blur">
                #{tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 px-1">
          <span className="text-caption text-muted-foreground">
            {format.dateTime(new Date(post.publishedAt), { day: "numeric", month: "short", year: "numeric" })} · {t("minutes", { count: post.readingMinutes[locale] ?? post.readingMinutes.ar })}
          </span>
          <h3 className="font-display text-title leading-snug transition-colors group-hover:text-secondary-text">{post.title[locale] ?? post.title.ar}</h3>
          {(post.excerpt[locale] ?? post.excerpt.ar) && <p className="line-clamp-2 text-body-sm text-muted-foreground">{post.excerpt[locale] ?? post.excerpt.ar}</p>}
        </div>
      </Link>
    </motion.article>
  );
}

/** Tag chips that filter the grid in place. */
export function BlogGrid({ posts }: { posts: BlogSummary[] }) {
  const t = useTranslations("blog");
  const [tag, setTag] = useState<string | null>(null);
  const tags = [...new Set(posts.flatMap((p) => p.tags))];
  const shown = tag ? posts.filter((p) => p.tags.includes(tag)) : posts;
  return (
    <div className="flex flex-col gap-8">
      {tags.length > 1 && (
        <LayoutGroup id="blog-tags">
          <div className="flex flex-wrap gap-2" role="tablist">
            {[null, ...tags].map((x) => {
              const on = tag === x;
              return (
                <button key={x ?? "all"} type="button" role="tab" aria-selected={on} onClick={() => setTag(x)} className={cn("relative isolate rounded-full px-4 py-2 text-body-sm font-medium transition-colors", on ? "text-background" : "text-muted-foreground hover:text-foreground")}>
                  {on && <motion.span layoutId="blog-tag" className="absolute inset-0 -z-10 rounded-full bg-foreground" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                  {x === null ? t("all") : <span lang="en">#{x}</span>}
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      )}
      <motion.div layout className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {shown.map((p, i) => (
            <PostCard key={p.slug} post={p} index={i} />
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
