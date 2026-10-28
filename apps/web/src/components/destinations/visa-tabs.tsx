"use client";

import { calculatePrice, formatMoney, pickVisa, purposesOf, type AppLocale, type ApplicantType, type DocumentType, type PriceLine, type TravelPurpose, type VisaKind } from "@myvisa/shared";
import { ArrowUpRight, CalendarCheck, Check, Clock, DoorOpen, FileText, Globe2, Info, Timer } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { PriceBreakdown } from "@/components/brand/price-breakdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export interface VisaTabData {
  id: string;
  kind: VisaKind;
  purpose: TravelPurpose;
  purposeLabel: string;
  kindLabel: string;
  name: string;
  entryLabel: string;
  validityDays: number;
  maxStayDays: number;
  processingDays: readonly [number, number];
  appointment: boolean;
  appointmentNote?: string;
  pricing: { applicant: ApplicantType; eligible: boolean; governmentFee: number; serviceFee: number; note?: string; reason?: string }[];
  requirements: { doc: DocumentType; title: string; details?: string; applicant?: ApplicantType; optional?: boolean }[];
}

const EASE = [0.16, 1, 0.3, 1] as const;

/** One tab per travel purpose; within a tab the visa shown depends on the applicant type. */
export function VisaTabs({ visas, slug, country }: { visas: VisaTabData[]; slug: string; country: string }) {
  const t = useTranslations("destination");
  const tc = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const [applicant, setApplicant] = useState<ApplicantType>("SAUDI_CITIZEN");
  const purposes = purposesOf(visas);

  return (
    <Tabs defaultValue={purposes[0]}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <TabsList>
          {purposes.map((p) => (
            <TabsTrigger key={p} value={p}>
              {tc(`purposes.${p}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <div role="radiogroup" aria-label={t("applicant")} className="relative inline-flex w-fit rounded-full border border-border bg-surface p-1">
          {(["SAUDI_CITIZEN", "RESIDENT"] as const).map((a) => (
            <button
              key={a}
              role="radio"
              aria-checked={applicant === a}
              onClick={() => setApplicant(a)}
              className={cn("relative h-9 rounded-full px-4 text-body-sm font-medium transition-colors", applicant === a ? "text-secondary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {applicant === a && <motion.span layoutId="applicant-pill" className="absolute inset-0 rounded-full bg-secondary" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
              <span className="relative">{tc(`applicants.${a}`)}</span>
            </button>
          ))}
        </div>
      </div>

      {purposes.map((purpose) => {
        const v = pickVisa(visas, purpose, applicant)?.visa;
        if (!v) return null;
        const price = v.pricing.find((p) => p.applicant === applicant);
        const reqs = v.requirements.filter((r) => !r.applicant || r.applicant === applicant);
        const line: PriceLine[] = price ? [{ governmentFee: price.governmentFee, serviceFee: price.serviceFee }] : [];
        const total = price ? calculatePrice(line).total : 0;
        return (
          <TabsContent key={purpose} value={purpose} className="mt-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${applicant}-${v.id}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.45, ease: EASE }}
                className="grid grid-cols-1 gap-6 lg:grid-cols-12"
              >
                <div className="flex min-w-0 flex-col gap-6 lg:col-span-7">
                  <div className="rounded-[1.75rem] border border-border bg-surface p-6 sm:p-8">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-display text-display-md">{v.name}</h3>
                      <Badge tone="teal">{v.kindLabel}</Badge>
                    </div>
                    <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Fact icon={<Timer />} label={t("processing")} value={tc("workingDays", { min: v.processingDays[0], max: v.processingDays[1] })} />
                      <Fact icon={<CalendarCheck />} label={t("validity")} value={tc("days", { count: v.validityDays })} />
                      <Fact icon={<Clock />} label={t("stay")} value={tc("days", { count: v.maxStayDays })} />
                      <Fact icon={<DoorOpen />} label={t("entry")} value={v.entryLabel} />
                    </dl>
                    <p className={cn("mt-5 flex items-start gap-2.5 rounded-xl px-4 py-3 text-body-sm", v.appointment ? "bg-warning-soft text-foreground" : "bg-success-soft text-foreground")}>
                      {v.appointment ? <CalendarCheck className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden /> : <Globe2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />}
                      <span>
                        <span className="font-medium">{v.appointment ? t("appointment") : t("noAppointment")}</span>
                        {v.appointmentNote && <span className="block text-muted-foreground">{v.appointmentNote}</span>}
                      </span>
                    </p>
                  </div>

                  <div className="rounded-[1.75rem] border border-border bg-surface p-6 sm:p-8">
                    <h3 className="flex items-center gap-2 font-display text-heading">
                      <FileText className="size-5 text-secondary-text" aria-hidden />
                      {t("requirements")}
                    </h3>
                    <ul className="mt-5 flex flex-col">
                      {reqs.map((r, i) => (
                        <motion.li
                          key={`${r.doc}-${i}`}
                          className="flex items-start gap-4 border-b border-border py-4 last:border-b-0"
                          initial={{ opacity: 0, x: 20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.07, duration: 0.5, ease: EASE }}
                        >
                          <motion.span
                            className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full", r.optional ? "border border-border-strong text-muted-foreground" : "bg-secondary text-secondary-foreground")}
                            initial={{ scale: 0 }}
                            whileInView={{ scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 + i * 0.07, type: "spring", stiffness: 420, damping: 18 }}
                          >
                            <Check className="size-3.5" strokeWidth={3} aria-hidden />
                          </motion.span>
                          <span className="flex flex-1 flex-col gap-1">
                            <span className="flex flex-wrap items-center gap-2 font-medium">
                              {r.title}
                              {r.optional && <Badge tone="outline">{t("optional")}</Badge>}
                              {r.applicant === "RESIDENT" && <Badge tone="info">{t("residentsOnly")}</Badge>}
                            </span>
                            {r.details && <span className="text-body-sm text-muted-foreground">{r.details}</span>}
                          </span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex min-w-0 flex-col gap-4 lg:col-span-5">
                  <div className="lg:sticky lg:top-28">
                    {price?.eligible && v.kind === "VISA_FREE" ? (
                      <div className="flex flex-col gap-4 rounded-[1.75rem] border border-success/20 bg-success-soft p-6 sm:p-7">
                        <p className="font-display text-display-md text-success">{t("visaFree")}</p>
                        <p className="text-body text-foreground/80">{t("visaFreeBody")}</p>
                        <Button asChild variant="outline" className="w-fit">
                          <Link href="/services/travel-insurance">
                            {t("insuranceCta")}
                            <ArrowUpRight className="flip-rtl" aria-hidden />
                          </Link>
                        </Button>
                      </div>
                    ) : price?.eligible ? (
                      <>
                        <PriceBreakdown lines={line} />
                        {price.note && (
                          <p className="mt-3 flex items-start gap-2 text-caption text-muted-foreground">
                            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                            {price.note}
                          </p>
                        )}
                        <Button asChild size="lg" block className="mt-4 max-sm:h-auto max-sm:min-h-14 max-sm:whitespace-normal max-sm:px-5 max-sm:py-3 max-sm:text-center max-sm:text-body">
                          <Link href={{ pathname: "/apply", query: { to: slug, visa: v.id, purpose: v.purpose, as: applicant } }}>
                            {t("applyCta", { country })} · {formatMoney(total, locale)}
                            <ArrowUpRight className="flip-rtl" aria-hidden />
                          </Link>
                        </Button>
                      </>
                    ) : (
                      <div className="rounded-[1.75rem] border border-danger/20 bg-danger-soft p-6">
                        <p className="font-medium text-danger">{t("notEligible")}</p>
                        {price?.reason && <p className="mt-2 text-body-sm text-foreground/80">{price.reason}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-2xl bg-muted/70 px-4 py-3 max-sm:px-3">
      <dt className="flex items-center gap-1.5 text-caption text-muted-foreground [&_svg]:size-3.5">
        {icon}
        {label}
      </dt>
      <dd className="text-body-sm font-semibold">{value}</dd>
    </div>
  );
}
