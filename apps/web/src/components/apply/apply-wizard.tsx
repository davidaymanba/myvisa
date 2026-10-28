"use client";

import { formatMoney, pickVisa, type ApplicantType, type OrderDraftInput, type OrderQuote, type OrderView, type TravelPurpose, type TravelerInput } from "@myvisa/shared";
import { ArrowLeft, Check, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/logo";
import { FadeIn } from "@/components/motion/fade-in";
import { SplitReveal } from "@/components/motion/split-reveal";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { Link, useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api/client";
import { PhoneGate } from "./phone-gate";
import { StepAppointment, type AppointmentValue } from "./step-appointment";
import { StepDocuments } from "./step-documents";
import { StepPayment } from "./step-payment";
import { StepReview, emptyReview, type ReviewState } from "./step-review";
import { StepTravelers, blankTraveler, useTravelersForm, type TravelersData } from "./step-travelers";
import { StepVisa, type VisaChoice } from "./step-visa";
import { SummaryCard } from "./summary-card";
import type { StepKey, WizardData, WizardIntent } from "./types";
import { useApplyError, useOrder, useSession, useSetOrder } from "./use-apply";

const EASE = [0.16, 1, 0.3, 1] as const;

export function ApplyWizard({ data, intent }: { data: WizardData; intent: WizardIntent }) {
  const t = useTranslations("apply");
  const locale = useLocale() as "ar" | "en";
  const router = useRouter();
  const reduce = useReducedMotion();
  const problem = useApplyError();
  const setOrderCache = useSetOrder();
  const session = useSession();

  // ── Visa choice (from the finder / destination page links) ──────────────────
  const [visa, setVisa] = useState<VisaChoice>(() => {
    const applicant: ApplicantType = intent.as ?? "SAUDI_CITIZEN";
    const purpose: TravelPurpose = intent.purpose ?? "TOURISM";
    const d = data.destinations.find((x) => x.slug === intent.to) ?? data.destinations.find((x) => x.visas.some((v) => v.id === intent.visa));
    const visaId = d ? (d.visas.find((v) => v.id === intent.visa)?.id ?? pickVisa(d.visas, purpose, applicant)?.visa.id ?? null) : null;
    return { slug: d?.slug ?? null, visaId, purpose: d?.visas.find((v) => v.id === visaId)?.purpose ?? purpose, applicant, travelFrom: null, travelTo: null };
  });
  const destination = data.destinations.find((d) => d.slug === visa.slug);
  const visaOption = destination?.visas.find((v) => v.id === visa.visaId);

  const [orderId, setOrderId] = useState<string | null>(intent.order ?? null);
  const order = useOrder(orderId, { poll: false });
  const current = order.data;

  const [step, setStep] = useState<StepKey>(intent.order ? "documents" : "visa");
  const [direction, setDirection] = useState(1);
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState<OrderQuote | undefined>();
  const [appointment, setAppointment] = useState<AppointmentValue>({ preferredCity: null, preferredDateFrom: null, preferredDateTo: null, appointmentNotes: null });
  const [review, setReview] = useState<ReviewState>(emptyReview);
  const [consentErrors, setConsentErrors] = useState(false);
  const form = useTravelersForm({ travelers: [blankTraveler(visa.applicant, true, intent.nationality)], email: "" });

  const requiresAppointment = current?.service.requiresAppointment ?? visaOption?.appointment ?? false;
  const steps = useMemo<StepKey[]>(() => ["visa", "travelers", "documents", ...(requiresAppointment ? (["appointment"] as const) : []), "review", "payment"], [requiresAppointment]);
  const index = steps.indexOf(step);

  // ── Resume a saved application (?order=…) ───────────────────────────────────
  const resumed = useRef(false);
  useEffect(() => {
    if (!current || resumed.current) return;
    resumed.current = true;
    const d = data.destinations.find((x) => x.slug === current.service.destination?.slug);
    setVisa((v) => ({ ...v, slug: d?.slug ?? v.slug, visaId: current.service.slug, purpose: current.service.purpose ?? v.purpose, applicant: (current.travelers[0]?.applicantType as ApplicantType) ?? v.applicant, travelFrom: current.travelFrom, travelTo: current.travelTo }));
    setAppointment({ preferredCity: current.preferredCity, preferredDateFrom: current.preferredDateFrom, preferredDateTo: current.preferredDateTo, appointmentNotes: current.appointmentNotes });
    if (current.status === "DRAFT" || current.status === "PENDING_PAYMENT") {
      void api<TravelerInput[]>(`/orders/${current.id}/travelers`).then((travelers) => form.reset({ travelers, email: "" })).catch(() => undefined);
    }
    const wanted = (intent.step as StepKey | undefined) ?? (current.status === "PENDING_PAYMENT" ? "payment" : current.documentsComplete ? "review" : "documents");
    if (current.status !== "DRAFT" && current.status !== "PENDING_PAYMENT") router.replace(`/apply/confirmation?order=${current.id}`);
    else setStep(wanted);
  }, [current, data.destinations, form, intent.step, router]);

  // Keep the URL resumable without a navigation.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (orderId) url.searchParams.set("order", orderId);
    url.searchParams.set("step", step);
    window.history.replaceState(null, "", url);
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }, [orderId, step, reduce]);

  // Poll while files are being scanned.
  const scanning = current?.documents.some((d) => d.document.uploaded && d.document.scanStatus === "PENDING");
  useEffect(() => {
    if (!scanning) return;
    const id = setInterval(() => void order.refetch(), 1500);
    return () => clearInterval(id);
  }, [scanning, order]);

  // ── Live quote while editing travellers ─────────────────────────────────────
  const watched = form.watch("travelers");
  const quoteKey = JSON.stringify(watched.map((w) => [w.applicantType, w.nationalityIso2]));
  useEffect(() => {
    if (!visa.visaId) return;
    const travelers = watched.filter((w) => /^[A-Z]{2}$/.test(w.nationalityIso2 ?? "")).map((w) => ({ applicantType: w.applicantType, nationalityIso2: w.nationalityIso2 }));
    if (!travelers.length) return;
    const handle = setTimeout(() => {
      void api<OrderQuote>("/orders/quote", { method: "POST", body: { serviceSlug: visa.visaId, travelers } }).then(setQuote).catch(() => undefined);
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- quoteKey captures the relevant parts of `watched`
  }, [quoteKey, visa.visaId]);

  const go = useCallback(
    (to: StepKey) => {
      setDirection(steps.indexOf(to) >= steps.indexOf(step) ? 1 : -1);
      setStep(to);
    },
    [step, steps],
  );

  const draftPayload = (travelers: TravelersData): OrderDraftInput => ({
    serviceSlug: visa.visaId!,
    purpose: visa.purpose,
    travelFrom: visa.travelFrom,
    travelTo: visa.travelTo,
    travelers: travelers.travelers,
    ...appointment,
    email: travelers.email || null,
    locale,
  });

  const saveDraft = async (payload: OrderDraftInput) => {
    const saved = orderId && current?.service.slug === payload.serviceSlug ? await api<OrderView>(`/orders/${orderId}`, { method: "PUT", body: payload }) : await api<OrderView>("/orders", { method: "POST", body: payload });
    setOrderCache(saved);
    setOrderId(saved.id);
    return saved;
  };

  const next = async () => {
    setBusy(true);
    try {
      if (step === "visa") {
        if (current && current.service.slug !== visa.visaId) setOrderId(null);
        form.setValue("travelers.0.applicantType", visa.applicant);
        go("travelers");
      } else if (step === "travelers") {
        await form.handleSubmit(async (values) => {
          await saveDraft(draftPayload(values));
          go("documents");
        })();
      } else if (step === "documents") {
        go(requiresAppointment ? "appointment" : "review");
      } else if (step === "appointment") {
        await form.handleSubmit(async (values) => {
          await saveDraft(draftPayload(values));
          go("review");
        })();
      } else if (step === "review" && current) {
        if (!(review.terms && review.data && review.crossBorder)) {
          setConsentErrors(true);
          return;
        }
        const submitted = await api<OrderView>(`/orders/${current.id}/submit`, { method: "POST", body: { couponCode: review.coupon, acceptTerms: true, acceptDataProcessing: true, acceptCrossBorder: true, marketing: review.marketing } });
        setOrderCache(submitted);
        if (submitted.status === "RECEIVED") router.push(`/apply/confirmation?order=${submitted.id}`);
        else go("payment");
      }
    } catch (e) {
      toast.error(problem(e));
    } finally {
      setBusy(false);
    }
  };

  const canContinue =
    step === "visa" ? Boolean(visa.visaId) : step === "travelers" ? Boolean(session.data) && !(quote?.lines.some((l) => !l.eligible)) : step === "documents" ? Boolean(current?.documentsComplete) : step === "appointment" ? Boolean(appointment.preferredCity) : step === "review" ? Boolean(current) : false;

  const price = step === "review" && review.quote ? review.quote.breakdown : step === "travelers" || !current ? quote?.breakdown : current.price;
  const travelerCount = current && step !== "travelers" ? current.travelers.length : watched.length;

  return (
    <div className="min-h-dvh bg-background">
      <header data-surface="dark" className="dark sticky top-0 z-40 border-b border-white/10 bg-ink-950/95 text-foreground backdrop-blur-xl">
        <div className="container-page flex items-center gap-6 py-4">
          <Link href="/" aria-label="myvisa">
            <Logo />
          </Link>
          <Stepper steps={steps.map((s) => t(`steps.${s}`))} current={index} className="min-w-0 flex-1" />
          <Link href={destination ? `/destinations/${destination.slug}` : "/"} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-caption font-medium text-foreground/80 hover:bg-white/10">
            <X className="size-3.5" aria-hidden />
            <span className="max-sm:sr-only">{t("exit")}</span>
          </Link>
        </div>
      </header>

      <main id="main" className="container-page grid gap-10 pb-40 pt-10 lg:grid-cols-12 lg:pt-14">
        <div className="min-w-0 lg:col-span-8">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={step}
              custom={direction}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: 48 * direction * (locale === "ar" ? -1 : 1), filter: "blur(8px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: -48 * direction * (locale === "ar" ? -1 : 1), filter: "blur(8px)" }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <header className="mb-10 flex flex-col gap-4">
                <FadeIn>
                  <p className="eyebrow flex items-center gap-3 text-accent-text">
                    <span lang="en" className="tabular">
                      {String(index + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
                    </span>
                    <span className="h-px w-8 bg-current" aria-hidden />
                    {t(`steps.${step}`)}
                  </p>
                </FadeIn>
                <SplitReveal as="h1" trigger="mount" delay={0.1} className="text-[clamp(2.4rem,1.5rem+3.4vw,4.5rem)] font-medium leading-[1.02] tracking-[-0.03em] [:lang(ar)_&]:leading-[1.25]" lines={[{ text: t(`${stepNamespace(step)}.title`) }]} />
                <FadeIn delay={0.25}>
                  <p className="max-w-2xl text-body-lg text-muted-foreground">{t(`${stepNamespace(step)}.lead`)}</p>
                </FadeIn>
              </header>

              {step === "visa" && <StepVisa destinations={data.destinations} value={visa} onChange={setVisa} />}
              {step === "travelers" && (
                <div className="flex flex-col gap-6">
                  {session.isLoading ? null : session.data ? (
                    <p className="flex items-center gap-2 text-body-sm text-muted-foreground">
                      <Check className="size-4 text-success" aria-hidden />
                      {t("auth.signedIn", { phone: `\u2066${session.data.phone}\u2069` })}
                    </p>
                  ) : (
                    <PhoneGate onSignedIn={() => void session.refetch()} />
                  )}
                  <div className={session.data ? undefined : "pointer-events-none opacity-40 blur-[1px] transition"} aria-hidden={!session.data}>
                    <StepTravelers form={form} nationalities={data.nationalities} quote={quote} travelTo={visa.travelTo} />
                  </div>
                </div>
              )}
              {step === "documents" && current && <StepDocuments order={current} onChanged={() => void order.refetch()} />}
              {step === "appointment" && <StepAppointment value={appointment} onChange={setAppointment} />}
              {step === "review" && current && <StepReview order={current} value={review} onChange={(v) => (setReview(v), setConsentErrors(false))} refundSummary={data.refundSummary} goTo={go} showConsentErrors={consentErrors} />}
              {step === "payment" && current && <StepPayment order={current} onEdit={() => go("review")} />}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="hidden lg:col-span-4 lg:block">
          <div className="sticky top-28">
            <SummaryCard destination={destination} visa={visaOption} travelers={travelerCount} travelFrom={visa.travelFrom} travelTo={visa.travelTo} price={price} />
          </div>
        </div>
      </main>

      {step !== "payment" && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
          <div className="container-page flex items-center gap-3 py-3">
            {index > 0 && (
              <Button variant="ghost" onClick={() => go(steps[index - 1]!)} disabled={busy} className="max-sm:px-3">
                <ArrowLeft className="rtl:rotate-180" aria-hidden />
                {t("back")}
              </Button>
            )}
            {price && (
              <span className="flex flex-col text-end lg:hidden">
                <span className="text-caption text-muted-foreground">{t("summary.total")}</span>
                <span className="tabular font-display text-title">{formatMoney(price.total, locale, { fractionDigits: 2 })}</span>
              </span>
            )}
            <Button size="lg" className="ms-auto max-sm:h-12 max-sm:px-5 lg:ms-auto" onClick={next} loading={busy} disabled={!canContinue}>
              {step === "review" ? t("review.toPayment") : t("continue")}
              <ArrowLeft className="rotate-180 rtl:rotate-0" aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function stepNamespace(step: StepKey) {
  return step === "visa" ? "visa" : step;
}
