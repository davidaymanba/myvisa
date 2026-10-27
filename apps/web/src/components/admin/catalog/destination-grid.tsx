"use client";

import type { CountryListItem } from "@myvisa/shared";
import { useQuery } from "@tanstack/react-query";
import { CloudOff, EyeOff, Plus, Search, Sparkles } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useDeferredValue, useState } from "react";
import { Flag } from "@/components/brand/flag";
import { PassportStamp } from "@/components/brand/passport-stamp";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api/client";
import { unsplash } from "@/lib/images";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "../page-header";
import { adminKeys, useCan } from "../use-admin";

const FILTERS = ["all", "popular", "hidden"] as const;

export function DestinationGrid() {
  const t = useTranslations("admin.catalog");
  const tc = useTranslations("admin.common");
  const locale = useLocale();
  const can = useCan();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim().toLowerCase());
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: adminKeys.countries, queryFn: () => api<CountryListItem[]>("/admin/countries") });

  const destinations = (data ?? [])
    .filter((c) => c.isDestination)
    .filter((c) => (filter === "popular" ? c.isPopular : filter === "hidden" ? !c.isActive : true))
    .filter((c) => !q || c.nameAr.includes(q) || c.nameEn.toLowerCase().includes(q) || c.iso2.toLowerCase() === q || c.slug.includes(q));

  return (
    <>
      <AdminPageHeader
        index="02"
        eyebrow={t("eyebrow")}
        title={t("title")}
        lead={t("lead")}
        actions={
          can("catalog:write") && (
            <Button asChild size="lg">
              <Link href="/admin/destinations/new">
                <Plus aria-hidden />
                {t("newCountry")}
              </Link>
            </Button>
          )
        }
      />

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <LayoutGroup id="destination-filters">
          <div role="tablist" className="inline-flex w-fit items-center gap-1 rounded-full border border-border bg-surface p-1 shadow-xs">
            {FILTERS.map((f) => (
              <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={cn("relative rounded-full px-4 py-2 text-body-sm font-medium transition-colors", filter === f ? "text-background" : "text-muted-foreground hover:text-foreground")}>
                {filter === f && <motion.span layoutId="filter-pill" className="absolute inset-0 -z-0 rounded-full bg-foreground" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <span className="relative">{t(`filters.${f}`)}</span>
              </button>
            ))}
          </div>
        </LayoutGroup>
        <label className="relative flex h-12 w-full items-center sm:max-w-xs">
          <Search className="pointer-events-none absolute start-4 size-4 text-muted-foreground" aria-hidden />
          <span className="sr-only">{tc("search")}</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} className="h-full w-full rounded-full border border-border-strong/70 bg-surface ps-11 pe-4 text-body shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15" />
        </label>
      </div>

      {isError ? (
        <ErrorState title={tc("loadError")} icon={<CloudOff />} retryLabel={tc("retry")} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/5] rounded-[1.75rem]" />
          ))}
        </div>
      ) : destinations.length === 0 ? (
        <EmptyState icon={<Search />} title={t("emptyTitle")} description={t("emptyBody")} />
      ) : (
        <motion.ul layout className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {destinations.map((c, i) => (
              <motion.li
                key={c.id}
                layout
                initial={{ opacity: 0, scale: 0.94, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5, delay: Math.min(i, 12) * 0.035, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link href={`/admin/destinations/${c.id}`} className="group relative block aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-ink-900 shadow-sm ring-1 ring-black/5 transition-shadow duration-500 hover:shadow-xl">
                  {c.imageId && <Image src={unsplash(c.imageId, 800)} alt="" fill sizes="(min-width: 1536px) 22vw, (min-width: 1280px) 30vw, (min-width: 640px) 45vw, 90vw" className={cn("object-cover transition-transform duration-[1.6s] ease-[var(--ease-out-expo)] group-hover:scale-110", !c.isActive && "grayscale")} />}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/30 to-ink-950/10" />
                  <div className="dark absolute inset-0 flex flex-col justify-between p-5 text-foreground">
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-black/30 py-1 pe-3 ps-1 backdrop-blur-md">
                        <Flag code={c.iso2} className="h-5 w-7 rounded-full object-cover" />
                        <span lang="en" className="text-caption font-semibold tracking-wide">
                          {c.iso2}
                        </span>
                      </span>
                      <span lang="en" className="font-display text-display-md leading-none text-white/25 tabular">
                        {String(c.sortOrder + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap gap-1.5">
                        {c.isPopular && (
                          <Badge tone="gold">
                            <Sparkles aria-hidden />
                            {t("popular")}
                          </Badge>
                        )}
                        {!c.isActive && (
                          <Badge tone="danger">
                            <EyeOff aria-hidden />
                            {t("hidden")}
                          </Badge>
                        )}
                      </div>
                      <h2 className="font-display text-[clamp(1.9rem,1.5rem+1vw,2.5rem)] leading-[1.05]">{locale === "ar" ? c.nameAr : c.nameEn}</h2>
                      <p className="flex items-center justify-between text-body-sm text-foreground/70">
                        <span>{t("visas", { count: c.serviceCount })}</span>
                        <span className="translate-y-2 opacity-0 transition duration-500 group-hover:translate-y-0 group-hover:opacity-100">→</span>
                      </p>
                    </div>
                  </div>
                  <PassportStamp shape="circle" tone="gold" top={c.nameEn.toUpperCase()} bottom="EDIT" code={c.iso2.toUpperCase()} rotate={-14} className="pointer-events-none absolute end-4 top-14 w-24 scale-125 opacity-0 transition-all duration-500 group-hover:scale-100 group-hover:opacity-90 [&_svg]:mix-blend-normal" />
                </Link>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </>
  );
}
