"use client";

import { calculatePrice, formatMoney, type AppLocale, type Halalas } from "@myvisa/shared";
import { motion, useInView } from "motion/react";
import { CircleHelp, Landmark, ShieldCheck, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRef } from "react";
import { Counter } from "@/components/motion/counter";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/** "Them vs us": a fogged single number next to a breakdown that assembles itself line by line. */
export function PricingExplainer({ governmentFee, serviceFee }: { governmentFee: Halalas; serviceFee: Halalas }) {
  const t = useTranslations("home.pricing");
  const locale = useLocale() as AppLocale;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -20% 0px" });
  const p = calculatePrice([{ governmentFee, serviceFee }]);
  const money = (v: number) => formatMoney(v, locale);
  const rows = [
    { icon: Landmark, label: t("gov"), note: t("govNote"), value: p.governmentFees, color: "bg-teal-400" },
    { icon: Sparkles, label: t("service"), value: p.serviceFees, color: "bg-gold-400" },
    { icon: ShieldCheck, label: t("vat"), value: p.vat, color: "bg-gold-200" },
  ];

  return (
    <div ref={ref} className="grid grid-cols-1 gap-5 lg:grid-cols-5">
      {/* Them */}
      <div className="relative flex flex-col justify-between gap-10 overflow-hidden rounded-[2rem] border border-border bg-surface-sunken p-7 lg:col-span-2">
        <div>
          <p className="eyebrow text-muted-foreground">{t("others")}</p>
          <p className="mt-3 text-body text-muted-foreground">{t("othersBody")}</p>
        </div>
        <div className="relative">
          <motion.p
            className="whitespace-nowrap font-display text-[clamp(2.5rem,2rem+4vw,5rem)] leading-none text-foreground/80"
            initial={{ filter: "blur(0px)" }}
            animate={inView ? { filter: "blur(7px)" } : undefined}
            transition={{ delay: 0.8, duration: 1.2 }}
          >
            {money(p.total)}
          </motion.p>
          <motion.span
            className="absolute inset-0 grid place-items-center"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={inView ? { opacity: 1, scale: 1 } : undefined}
            transition={{ delay: 1.4, type: "spring", stiffness: 300, damping: 18 }}
          >
            <CircleHelp className="size-14 text-muted-foreground" strokeWidth={1.5} aria-hidden />
          </motion.span>
        </div>
      </div>

      {/* Us */}
      <div className="dark relative overflow-hidden rounded-[2rem] border border-white/10 bg-ink-900 p-6 text-foreground lg:col-span-3 sm:p-9">
        <div aria-hidden className="absolute -end-20 -top-24 size-80 rounded-full bg-gold-400/20 blur-3xl" />
        <div className="relative flex flex-wrap items-baseline justify-between gap-3">
          <p className="eyebrow text-gold-300">{t("us")}</p>
          <p className="text-caption text-muted-foreground">{t("example")}</p>
        </div>

        <div className="relative mt-6 flex h-3 overflow-hidden rounded-full bg-white/10" aria-hidden>
          {rows.map((r, i) => (
            <motion.span
              key={r.label}
              className={cn("h-full", r.color)}
              initial={{ width: 0 }}
              animate={inView ? { width: `${(r.value / p.total) * 100}%` } : undefined}
              transition={{ delay: 0.3 + i * 0.35, duration: 0.9, ease: EASE }}
            />
          ))}
        </div>

        <dl className="relative mt-6 divide-y divide-white/10">
          {rows.map((r, i) => (
            <motion.div
              key={r.label}
              className="flex items-center justify-between gap-4 py-4"
              initial={{ opacity: 0, x: 24 }}
              animate={inView ? { opacity: 1, x: 0 } : undefined}
              transition={{ delay: 0.3 + i * 0.35, duration: 0.7, ease: EASE }}
            >
              <dt className="flex items-center gap-3">
                <span className={cn("grid size-9 place-items-center rounded-xl text-ink-950", r.color)}>
                  <r.icon className="size-4" aria-hidden />
                </span>
                <span className="flex flex-col">
                  <span>{r.label}</span>
                  {r.note && <span className="text-caption text-muted-foreground">{r.note}</span>}
                </span>
              </dt>
              <dd className="tabular shrink-0 whitespace-nowrap font-medium">{money(r.value)}</dd>
            </motion.div>
          ))}
        </dl>

        <div className="relative mt-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-t-2 border-white/70 pt-5">
          <span className="text-body-lg">{t("total")}</span>
          <span className="whitespace-nowrap font-display text-[clamp(1.625rem,0.4rem+6.5vw,2.5rem)] leading-none text-gold-300 sm:text-[clamp(2.5rem,1.8rem+2.8vw,4rem)]">
            <Counter value={p.total / 100} fractionDigits={Number.isInteger(p.total / 100) ? 0 : 2} suffix={locale === "ar" ? " ر.س" : ""} prefix={locale === "ar" ? "" : "SAR "} />
          </span>
        </div>
        <p className="relative mt-5 text-body-sm text-muted-foreground">{t("usBody")}</p>
      </div>
    </div>
  );
}
