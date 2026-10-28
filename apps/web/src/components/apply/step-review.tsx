"use client";

import type { AppLocale, L10n, OrderQuote, OrderView } from "@myvisa/shared";
import { BadgePercent, CalendarDays, FileCheck2, Pencil, ShieldCheck, Stamp, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { PriceBreakdown } from "@/components/brand/price-breakdown";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/choice";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { StepKey } from "./types";
import { useApplyError } from "./use-apply";

export interface ReviewState {
  coupon: string | null;
  quote: OrderQuote | null;
  terms: boolean;
  data: boolean;
  crossBorder: boolean;
  marketing: boolean;
}

export const emptyReview: ReviewState = { coupon: null, quote: null, terms: false, data: false, crossBorder: false, marketing: false };

export function StepReview({ order, value, onChange, refundSummary, goTo, showConsentErrors }: { order: OrderView; value: ReviewState; onChange: (v: ReviewState) => void; refundSummary: L10n[]; goTo: (s: StepKey) => void; showConsentErrors: boolean }) {
  const t = useTranslations("apply.review");
  const ta = useTranslations("apply.appointment");
  const te = useTranslations("apply.errors");
  const locale = useLocale() as AppLocale;
  const problem = useApplyError();
  const [code, setCode] = useState(value.coupon ?? "");
  const [checking, setChecking] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const files = order.documents.filter((d) => d.document.uploaded).length;
  const discount = value.quote?.coupon?.valid ? value.quote.breakdown.discount : 0;

  const applyCoupon = async () => {
    if (!code.trim()) return;
    setChecking(true);
    setCouponError(null);
    try {
      const quote = await api<OrderQuote>("/orders/quote", { method: "POST", body: { serviceSlug: order.service.slug, travelers: order.travelers.map((tr) => ({ applicantType: tr.applicantType, nationalityIso2: tr.nationalityIso2 })), couponCode: code.trim() } });
      if (quote.coupon?.valid) onChange({ ...value, coupon: quote.coupon.code, quote });
      else setCouponError(t(`couponErrors.${(quote.coupon?.reason ?? "coupon_invalid") as "coupon_invalid"}`));
    } catch (e) {
      setCouponError(problem(e));
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_22rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <Row icon={<Stamp />} title={t("visa")} onEdit={() => goTo("visa")}>
          <span className="font-medium">{order.service.name[locale]}</span>
          <span className="text-body-sm text-muted-foreground">{order.service.destination?.name[locale]}</span>
        </Row>
        <Row icon={<Users />} title={t("travelers")} onEdit={() => goTo("travelers")}>
          <ul className="flex flex-col gap-1.5">
            {order.travelers.map((tr) => (
              <li key={tr.id} className="flex flex-wrap items-baseline gap-x-3 text-body-sm">
                <span lang="en" dir="ltr" className="font-medium">
                  {tr.givenNameEn} {tr.surnameEn}
                </span>
                <span className="tabular text-muted-foreground" dir="ltr">
                  {tr.passportNumberMasked}
                </span>
              </li>
            ))}
          </ul>
        </Row>
        <Row icon={<FileCheck2 />} title={t("documents")} onEdit={() => goTo("documents")}>
          <span className="text-body-sm">{t("documentsCount", { count: files })}</span>
        </Row>
        {order.service.requiresAppointment && (
          <Row icon={<CalendarDays />} title={t("appointment")} onEdit={() => goTo("appointment")}>
            <span className="text-body-sm">
              {order.preferredCity ? ta(`cities.${order.preferredCity}`) : "—"}
              {order.preferredDateFrom && (
                <span className="tabular text-muted-foreground" dir="ltr">
                  {" "}
                  · {order.preferredDateFrom}
                  {order.preferredDateTo ? ` → ${order.preferredDateTo}` : ""}
                </span>
              )}
            </span>
          </Row>
        )}

        <section className="mt-4 rounded-[1.75rem] border border-border bg-surface p-5 sm:p-6">
          <h3 className="flex items-center gap-2 font-display text-heading">
            <ShieldCheck className="size-5 text-secondary-text" aria-hidden />
            {t("refund")}
          </h3>
          <ul className="mt-3 flex flex-col gap-2 text-body-sm text-foreground/85">
            {refundSummary.map((s) => (
              <li key={s.en} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-secondary" aria-hidden />
                {s[locale]}
              </li>
            ))}
          </ul>
          <Link href="/refund-policy" target="_blank" className="mt-3 inline-block text-body-sm font-medium text-secondary-text underline underline-offset-4 max-sm:-mb-1.5 max-sm:mt-1.5 max-sm:py-1.5">
            {t("refundLink")}
          </Link>
        </section>

        <fieldset className="mt-2 flex flex-col gap-3">
          <Consent checked={value.terms} onChange={(v) => onChange({ ...value, terms: v })} invalid={showConsentErrors && !value.terms}>
            {t.rich("consentTerms", {
              terms: (c) => (
                <Link href="/terms" target="_blank" className="font-medium underline underline-offset-4">
                  {c}
                </Link>
              ),
              privacy: (c) => (
                <Link href="/privacy" target="_blank" className="font-medium underline underline-offset-4">
                  {c}
                </Link>
              ),
            })}
          </Consent>
          <Consent checked={value.data} onChange={(v) => onChange({ ...value, data: v })} invalid={showConsentErrors && !value.data}>
            {t("consentData")}
          </Consent>
          <Consent checked={value.crossBorder} onChange={(v) => onChange({ ...value, crossBorder: v })} invalid={showConsentErrors && !value.crossBorder}>
            {t("consentCrossBorder")}
          </Consent>
          <Consent checked={value.marketing} onChange={(v) => onChange({ ...value, marketing: v })}>
            {t("consentMarketing")}
          </Consent>
          {showConsentErrors && !(value.terms && value.data && value.crossBorder) && (
            <p role="alert" className="text-body-sm font-medium text-danger">
              {te("consent_required")}
            </p>
          )}
        </fieldset>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <PriceBreakdown lines={order.travelers.map((tr) => ({ governmentFee: tr.governmentFee, serviceFee: tr.serviceFee }))} discount={discount ? { kind: "fixed", value: discount } : undefined} travelers={order.travelers.length} />
        <div className="rounded-3xl border border-border bg-surface p-5">
          <label className="flex items-center gap-2 text-body-sm font-medium" htmlFor="coupon">
            <BadgePercent className="size-4 text-accent-text" aria-hidden />
            {t("coupon")}
          </label>
          <AnimatePresence mode="wait" initial={false}>
            {value.coupon ? (
              <motion.div key="applied" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-3 flex items-center justify-between rounded-2xl bg-success-soft px-4 py-3">
                <span className="text-body-sm font-medium text-success">
                  {t("couponApplied")} · <span dir="ltr">{value.coupon}</span>
                </span>
                <button type="button" className="text-caption font-medium underline" onClick={() => (onChange({ ...value, coupon: null, quote: null }), setCode(""))}>
                  {t("couponRemove")}
                </button>
              </motion.div>
            ) : (
              <motion.div key="input" className="mt-3 flex gap-2">
                <input id="coupon" dir="ltr" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), void applyCoupon())} className="h-11 min-w-0 flex-1 rounded-xl border border-border-strong/70 bg-surface px-3 font-mono uppercase tracking-wider outline-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15" />
                <Button type="button" variant="outline" loading={checking} onClick={applyCoupon}>
                  {t("applyCoupon")}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          {couponError && (
            <p role="alert" className="mt-2 text-caption font-medium text-danger">
              {couponError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ icon, title, children, onEdit }: { icon: ReactNode; title: string; children: ReactNode; onEdit: () => void }) {
  const t = useTranslations("apply.review");
  return (
    <section className="flex items-start gap-4 rounded-[1.5rem] border border-border bg-surface p-4 sm:p-5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-secondary-text [&_svg]:size-5">{icon}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="eyebrow text-muted-foreground">{title}</span>
        {children}
      </div>
      <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-caption font-medium text-secondary-text hover:bg-muted">
        <Pencil className="size-3.5" aria-hidden />
        {t("edit")}
      </button>
    </section>
  );
}

function Consent({ checked, onChange, invalid, children }: { checked: boolean; onChange: (v: boolean) => void; invalid?: boolean; children: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3.5 text-body-sm transition-colors", checked ? "border-secondary/40 bg-secondary/[0.04]" : invalid ? "border-danger/50 bg-danger-soft/40" : "border-border hover:border-border-strong")}>
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} className="mt-0.5" />
      <span className="leading-relaxed">{children}</span>
    </label>
  );
}
