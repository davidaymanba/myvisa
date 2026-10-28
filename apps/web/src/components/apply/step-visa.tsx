"use client";

import { pickVisa, type ApplicantType, type AppLocale, type TravelPurpose, calculatePrice, formatMoney, purposesOf } from "@myvisa/shared";
import { CalendarCheck, Check, Search } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { Flag } from "@/components/brand/flag";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { unsplash } from "@/lib/images";
import { cn } from "@/lib/utils";
import type { WizardDestination } from "./types";

export interface VisaChoice {
  slug: string | null;
  visaId: string | null;
  purpose: TravelPurpose;
  applicant: ApplicantType;
  travelFrom: string | null;
  travelTo: string | null;
}

const APPLICANTS: ApplicantType[] = ["SAUDI_CITIZEN", "RESIDENT"];

export function StepVisa({ destinations, value, onChange, locked }: { destinations: WizardDestination[]; value: VisaChoice; onChange: (v: VisaChoice) => void; locked?: boolean }) {
  const t = useTranslations("apply.visa");
  const ta = useTranslations("apply.travelers");
  const te = useTranslations("apply.visa.purposes");
  const tc = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim().toLowerCase());
  const destination = destinations.find((d) => d.slug === value.slug);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  // Keep the chosen destination in view in the horizontal rail.
  // Block body on purpose: Chrome's scrollIntoView now returns a Promise, which React would call as a cleanup.
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [value.slug]);

  const choose = (patch: Partial<VisaChoice>) => {
    const next = { ...value, ...patch };
    const d = destinations.find((x) => x.slug === next.slug);
    if (d && (patch.slug || patch.purpose || patch.applicant)) next.visaId = pickVisa(d.visas, next.purpose, next.applicant)?.visa.id ?? null;
    onChange(next);
  };

  const list = destinations.filter((d) => !q || d.name.ar.includes(q) || d.name.en.toLowerCase().includes(q) || d.slug.includes(q));
  const purposes = destination ? purposesOf(destination.visas) : [];
  const fallback = destination && !destination.visas.some((v) => v.purpose === value.purpose);

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="font-display text-heading">{t("destination")}</h3>
          <label className="relative flex h-11 w-full items-center sm:w-64">
            <Search className="pointer-events-none absolute start-4 size-4 text-muted-foreground" aria-hidden />
            <span className="sr-only">{t("search")}</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} disabled={locked} className="h-full w-full rounded-full border border-border-strong/70 bg-surface ps-11 pe-4 text-body-sm outline-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15" />
          </label>
        </div>
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:thin] sm:-mx-0 sm:px-0" data-lenis-prevent>
          {list.map((d) => {
            const active = d.slug === value.slug;
            return (
              <button
                key={d.slug}
                ref={active ? selectedRef : undefined}
                type="button"
                disabled={locked && !active}
                onClick={() => choose({ slug: d.slug })}
                aria-pressed={active}
                className={cn("group relative h-44 w-36 shrink-0 snap-start overflow-hidden rounded-3xl text-start transition-all duration-500 disabled:opacity-40", active ? "w-48 ring-4 ring-gold-400 ring-offset-2 ring-offset-background" : "hover:-translate-y-1")}
              >
                <Image src={unsplash(d.imageId, 500)} alt="" fill sizes="200px" className="object-cover transition-transform duration-[1.2s] group-hover:scale-110" />
                <span className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/20 to-transparent" />
                <span className="absolute inset-x-3 bottom-3 flex flex-col gap-1.5 text-white">
                  <Flag code={d.iso2} className="h-4 w-6 rounded-sm" />
                  <span className="font-display text-title leading-tight">{d.name[locale]}</span>
                </span>
                <AnimatePresence>
                  {active && (
                    <motion.span initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} className="absolute end-3 top-3 grid size-8 place-items-center rounded-full bg-gold-400 text-ink-950 shadow-gold">
                      <Check className="size-4" strokeWidth={3} aria-hidden />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>
      </section>

      <AnimatePresence initial={false}>
        {destination && (
          <motion.div key="details" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-10">
            <div className="grid gap-8 lg:grid-cols-2">
              <Pills label={t("purpose")} layoutId="purpose-pill" options={purposes.map((p) => ({ value: p, label: te(p) }))} value={value.purpose} onChange={(p) => choose({ purpose: p as TravelPurpose })} disabled={locked} />
              <Pills label={t("applicant")} layoutId="applicant-pill" options={APPLICANTS.map((a) => ({ value: a, label: ta(`applicants.${a}`) }))} value={value.applicant} onChange={(a) => choose({ applicant: a as ApplicantType })} disabled={locked} />
            </div>

            <section className="flex flex-col gap-4">
              <h3 className="font-display text-heading">{t("options")}</h3>
              {fallback && <p className="rounded-2xl bg-info-soft px-4 py-3 text-body-sm text-info">{t("fallback")}</p>}
              <div className="grid gap-3">
                {destination.visas
                  .filter((v) => v.purpose === value.purpose || (fallback && v.purpose === "TOURISM"))
                  .map((v) => {
                    const p = v.pricing.find((x) => x.applicant === value.applicant);
                    const active = v.id === value.visaId;
                    const total = p?.eligible ? calculatePrice([{ governmentFee: p.governmentFee, serviceFee: p.serviceFee }]).total : null;
                    return (
                      <motion.button
                        layout
                        key={v.id}
                        type="button"
                        disabled={!p?.eligible || (locked && !active)}
                        onClick={() => choose({ visaId: v.id })}
                        aria-pressed={active}
                        className={cn(
                          "relative flex flex-wrap items-center gap-4 overflow-hidden rounded-3xl border bg-surface p-5 text-start shadow-xs transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50",
                          active ? "border-secondary shadow-[0_0_0_1px_var(--secondary)]" : "border-border hover:-translate-y-0.5 hover:shadow-md",
                        )}
                      >
                        {active && <motion.span layoutId="visa-glow" className="absolute inset-0 -z-0 bg-gradient-to-l from-secondary/[0.08] to-transparent" />}
                        <span className={cn("relative grid size-6 shrink-0 place-items-center rounded-full border-2 transition", active ? "border-secondary bg-secondary text-secondary-foreground" : "border-border-strong")}>{active && <Check className="size-3.5" strokeWidth={3} aria-hidden />}</span>
                        <span className="relative flex min-w-0 flex-1 flex-col gap-1">
                          <span className="font-medium">{v.name[locale]}</span>
                          <span className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-muted-foreground">
                            <span>{tc(`visaKinds.${v.kind}`)}</span>
                            <span>{tc("workingDays", { min: v.processingDays[0], max: v.processingDays[1] })}</span>
                            {v.maxStayDays > 0 && <span>{t("stay", { days: v.maxStayDays })}</span>}
                            <span className="inline-flex items-center gap-1">
                              <CalendarCheck className="size-3.5" aria-hidden />
                              {v.appointment ? t("appointment") : t("noAppointment")}
                            </span>
                          </span>
                        </span>
                        <span className="relative tabular font-display text-title">{total === null ? <span className="text-body-sm text-danger">{t("notOffered")}</span> : total === 0 ? t("free") : formatMoney(total, locale)}</span>
                      </motion.button>
                    );
                  })}
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <h3 className="font-display text-heading">{t("dates")}</h3>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={t("from")}>
                  <Input type="date" dir="ltr" min={today} value={value.travelFrom ?? ""} onChange={(e) => onChange({ ...value, travelFrom: e.target.value || null })} />
                </Field>
                <Field label={t("to")}>
                  <Input type="date" dir="ltr" min={value.travelFrom ?? today} value={value.travelTo ?? ""} onChange={(e) => onChange({ ...value, travelTo: e.target.value || null })} />
                </Field>
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Pills({ label, options, value, onChange, layoutId, disabled }: { label: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void; layoutId: string; disabled?: boolean }) {
  return (
    <fieldset className="flex flex-col gap-3" disabled={disabled}>
      <legend className="mb-3 font-display text-heading">{label}</legend>
      <LayoutGroup id={layoutId}>
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <button key={o.value} type="button" onClick={() => onChange(o.value)} aria-pressed={value === o.value} className={cn("relative rounded-full border px-5 py-2.5 text-body-sm font-medium transition-colors disabled:opacity-50", value === o.value ? "border-transparent text-background" : "border-border-strong/70 hover:border-foreground/40")}>
              {value === o.value && <motion.span layoutId={layoutId} className="absolute inset-0 rounded-full bg-foreground" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <span className="relative">{o.label}</span>
            </button>
          ))}
        </div>
      </LayoutGroup>
    </fieldset>
  );
}
