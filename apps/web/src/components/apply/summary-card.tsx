"use client";

import { calculatePrice, formatMoney, type AppLocale, type PriceBreakdown } from "@myvisa/shared";
import { CalendarDays, Plane, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Flag } from "@/components/brand/flag";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { unsplash } from "@/lib/images";
import { cn } from "@/lib/utils";
import type { WizardDestination, WizardVisa } from "./types";

/** The sticky "boarding pass" beside every step: where, what, who, and the live total. */
export function SummaryCard({
  destination,
  visa,
  travelers,
  travelFrom,
  travelTo,
  price,
  className,
}: {
  destination?: WizardDestination;
  visa?: WizardVisa;
  travelers: number;
  travelFrom?: string | null;
  travelTo?: string | null;
  price?: PriceBreakdown;
  className?: string;
}) {
  const t = useTranslations("apply.summary");
  const tp = useTranslations("ui.price");
  const locale = useLocale() as AppLocale;
  const money = (v: number) => formatMoney(v, locale, { fractionDigits: 2 });
  const date = (d: string) => new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { day: "numeric", month: "short" }).format(new Date(d));
  const shown = price ?? (visa ? calculatePrice([{ governmentFee: visa.pricing[0]?.governmentFee ?? 0, serviceFee: visa.pricing[0]?.serviceFee ?? 0 }]) : undefined);
  const govPct = shown?.total ? (shown.governmentFees / shown.total) * 100 : 0;

  return (
    <aside className={cn("dark relative isolate overflow-hidden rounded-[2rem] bg-ink-950 text-foreground shadow-xl", className)} data-surface="dark">
      <div className="relative h-40 overflow-hidden">
        <AnimatePresence mode="popLayout">
          {destination ? (
            <motion.div key={destination.slug} className="absolute inset-0" initial={{ opacity: 0, scale: 1.12 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
              <Image src={unsplash(destination.imageId, 900)} alt="" fill sizes="420px" className="object-cover" />
            </motion.div>
          ) : (
            <div className="absolute -start-10 -top-20 size-72 animate-drift rounded-full bg-teal-500/40 blur-[70px]" />
          )}
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
        <div className="absolute inset-x-6 bottom-4 flex items-end justify-between gap-3" dir="ltr">
          <span className="flex flex-col">
            <span className="text-caption text-foreground/60">FROM</span>
            <span className="font-display text-display-md leading-none">RUH</span>
          </span>
          <Plane className="mb-1.5 size-5 text-gold-300" aria-hidden />
          <span className="flex flex-col items-end">
            <span className="text-caption text-foreground/60">TO</span>
            <span className="font-display text-display-md leading-none text-gold-300">{destination?.iata ?? "···"}</span>
          </span>
        </div>
      </div>

      <div className="perforation relative h-px" aria-hidden>
        <span className="absolute -start-3 -top-3 size-6 rounded-full bg-background" />
        <span className="absolute -end-3 -top-3 size-6 rounded-full bg-background" />
        <span className="mx-6 block border-t border-dashed border-white/15" />
      </div>

      <div className="flex flex-col gap-5 p-6">
        <div className="flex items-start gap-3">
          {destination && <Flag code={destination.iso2} className="mt-1 h-5 w-7 rounded" />}
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="eyebrow text-gold-300">{t("title")}</span>
            <span className="font-display text-heading">{destination ? destination.name[locale] : "—"}</span>
            {visa && <span className="text-body-sm text-foreground/70">{visa.name[locale]}</span>}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-body-sm">
          <div className="flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2.5">
            <Users className="size-4 text-teal-300" aria-hidden />
            <dd>{t("travelers", { count: travelers })}</dd>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2.5">
            <CalendarDays className="size-4 text-teal-300" aria-hidden />
            <dd className="tabular truncate">{travelFrom ? `${date(travelFrom)}${travelTo ? ` – ${date(travelTo)}` : ""}` : visa ? t("processing", { min: visa.processingDays[0], max: visa.processingDays[1] }) : "—"}</dd>
          </div>
        </dl>

        {shown ? (
          <div className="flex flex-col gap-3">
            <div className="flex h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
              <div className="h-full bg-teal-400 transition-[width] duration-700" style={{ width: `${govPct}%` }} />
              <div className="h-full flex-1 bg-gold-400" />
            </div>
            <div className="flex justify-between text-caption text-foreground/60">
              <span>
                {tp("legendGovernment")} · <span className="tabular">{money(shown.governmentFees)}</span>
              </span>
              <span>
                {tp("legendOurs")} · <span className="tabular">{money(shown.serviceFees - shown.discount + shown.vat)}</span>
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t border-white/10 pt-4">
              <span className="text-body-sm text-foreground/70">{t("total")}</span>
              <AnimatedNumber value={shown.total} format={money} className="tabular font-display text-display-md" />
            </div>
          </div>
        ) : (
          <p className="text-body-sm text-foreground/60">{t("pickFirst")}</p>
        )}
      </div>
    </aside>
  );
}
