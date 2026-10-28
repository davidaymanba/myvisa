"use client";

import type { Region } from "@myvisa/shared";
import { SearchX, Search } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useDeferredValue, useState, type ReactNode } from "react";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/utils";

export interface GridItem {
  slug: string;
  region: Region;
  /** Lower-cased names in both languages, for search. */
  haystack: string;
  card: ReactNode;
}

/** Region chips (with a sliding active pill) + search, over a grid that re-flows with layout animation. */
export function DestinationGrid({ items, regions }: { items: GridItem[]; regions: Region[] }) {
  const t = useTranslations("destinationsPage");
  const tc = useTranslations("common");
  const [region, setRegion] = useState<Region | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query.trim().toLowerCase());
  const visible = items.filter((i) => (region === "ALL" || i.region === region) && (!deferred || i.haystack.includes(deferred)));

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <LayoutGroup id="regions">
          <div role="tablist" aria-label={t("eyebrow")} className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {(["ALL", ...regions] as const).map((r) => {
              const active = region === r;
              return (
                <button
                  key={r}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setRegion(r)}
                  className={cn("relative h-11 shrink-0 rounded-full px-5 text-body-sm font-medium transition-colors", active ? "text-background" : "text-muted-foreground hover:text-foreground")}
                >
                  {active && <motion.span layoutId="region-pill" className="absolute inset-0 rounded-full bg-foreground" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
                  <span className="relative">{r === "ALL" ? t("all") : tc(`regions.${r}`)}</span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>
        <label className="relative flex h-12 w-full items-center gap-3 rounded-full border border-border-strong/70 bg-surface px-5 shadow-xs transition-shadow focus-within:border-ring focus-within:ring-4 focus-within:ring-ring/15 lg:w-80">
          <Search className="size-4 text-muted-foreground" aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} aria-label={t("search")} className="h-full flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70" />
        </label>
      </div>

      <p className="text-body-sm text-muted-foreground" aria-live="polite">
        {t("count", { count: visible.length })}
      </p>

      {visible.length === 0 ? (
        <EmptyState icon={<SearchX aria-hidden />} title={t("empty")} description={t("emptyBody")} />
      ) : (
        <motion.ul layout className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:gap-7">
          <AnimatePresence mode="popLayout">
            {visible.map((item) => (
              <motion.li
                key={item.slug}
                layout
                initial={{ opacity: 0, scale: 0.92, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.25 } }}
                transition={{ type: "spring", stiffness: 260, damping: 30 }}
              >
                {item.card}
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  );
}
