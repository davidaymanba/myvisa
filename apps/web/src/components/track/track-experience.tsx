"use client";

import { ORDER_NUMBER_RE, TRACKING_STEPS, saudiMobileSchema, type AppLocale, type OrderStatus, type OtpRequestResult, type TrackSession, type TrackView, type TrackingStep } from "@myvisa/shared";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CalendarClock, KeyRound, LockKeyhole, RotateCcw, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useFormatter, useLocale, useNow, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { BoardingPass } from "@/components/brand/boarding-pass";
import { PassportStamp } from "@/components/brand/passport-stamp";
import { FadeIn } from "@/components/motion/fade-in";
import { SplitReveal } from "@/components/motion/split-reveal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/ui/otp-input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Link } from "@/i18n/navigation";
import { ApiError, api } from "@/lib/api/client";
import { SplitFlap } from "./split-flap";

/** Board wording: short, Latin, the way departure screens read. */
const BOARD_STATUS: Record<OrderStatus, string> = {
  DRAFT: "DRAFT",
  PENDING_PAYMENT: "AWAITING PAY",
  RECEIVED: "RECEIVED",
  DOCUMENTS_REVIEW: "IN REVIEW",
  ACTION_REQUIRED: "ACTION NEEDED",
  APPOINTMENT_BOOKED: "APPT BOOKED",
  SUBMITTED_TO_EMBASSY: "AT EMBASSY",
  DECISION_ISSUED: "DECIDED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
};
const STORAGE = "mv-track";
const EASE = [0.16, 1, 0.3, 1] as const;

function useTrackError() {
  const te = useTranslations("apply.errors");
  const tt = useTranslations("track.errors");
  return (e: unknown) => {
    if (!(e instanceof ApiError)) return te("network");
    if (e.code === "otp_invalid") return te("otp_invalid", { attemptsLeft: Number(e.problem.attemptsLeft ?? 0) });
    if (e.code === "otp_rate_limited") return te("otp_rate_limited", { seconds: Number(e.problem.retryAfter ?? 60) });
    if (e.code === "track_expired") return tt("track_expired");
    if (e.code === "validation_failed" && e.problem.errors?.some((x) => x.path === "orderNumber")) return tt("order_number");
    return te.has(e.code as "generic") ? te(e.code as "generic") : te("generic");
  };
}

function loadSession(): TrackSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE);
    const parsed = raw ? (JSON.parse(raw) as TrackSession & { until: number }) : null;
    return parsed && parsed.until > Date.now() ? parsed : null;
  } catch {
    return null;
  }
}

export function TrackExperience() {
  const t = useTranslations("track");
  const params = useSearchParams();
  const [session, setSession] = useState<TrackSession | null>(null);
  const [step, setStep] = useState<"form" | "code" | "result">("form");
  const [orderNumber, setOrderNumber] = useState(() => (params.get("order") ?? "").toUpperCase().slice(0, 14));

  useEffect(() => {
    const saved = loadSession();
    if (saved) {
      setSession(saved);
      setStep("result");
    }
  }, []);

  const view = useQuery({
    queryKey: ["track", session?.token],
    queryFn: async () => {
      const res = await fetch("/api/v1/track", { headers: { "x-track-token": session!.token, accept: "application/json" } });
      if (!res.ok) throw new ApiError({ status: res.status, code: res.status === 401 ? "track_expired" : "network" });
      return (await res.json()) as TrackView;
    },
    enabled: Boolean(session),
    initialData: session?.view,
    refetchInterval: 30_000,
    retry: false,
  });

  const expired = view.error instanceof ApiError && view.error.code === "track_expired";
  const data = view.data ?? session?.view ?? null;

  const reset = () => {
    try {
      sessionStorage.removeItem(STORAGE);
    } catch {
      /* storage unavailable */
    }
    setSession(null);
    setStep("form");
  };

  return (
    <>
      <section data-surface="dark" className="dark relative isolate overflow-hidden bg-ink-950 pb-16 pt-32 text-foreground sm:pt-40">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -start-[10%] -top-[30%] size-[55vw] animate-drift rounded-full bg-teal-500/25 blur-[140px]" />
          <div className="absolute -bottom-[40%] end-[-10%] size-[50vw] animate-drift rounded-full bg-gold-400/15 blur-[140px] [animation-delay:-8s]" />
        </div>
        <div className="container-page flex flex-col gap-10">
          <div className="flex max-w-3xl flex-col gap-4">
            <FadeIn>
              <p className="eyebrow flex items-center gap-3 text-gold-300">
                <span className="h-px w-8 bg-current" aria-hidden />
                {t("eyebrow")}
              </p>
            </FadeIn>
            <SplitReveal as="h1" trigger="mount" delay={0.1} className="text-[clamp(2.8rem,1.6rem+5vw,6.5rem)] font-medium leading-[0.98] tracking-[-0.035em] [:lang(ar)_&]:leading-[1.25]" lines={[{ text: t("title") }]} />
            <FadeIn delay={0.35}>
              <p className="max-w-xl text-body-lg text-foreground/70">{t("lead")}</p>
            </FadeIn>
          </div>
          <DepartureBoard orderNumber={data?.number ?? orderNumber} view={step === "result" ? data : null} />
        </div>
      </section>

      <section className="container-page relative -mt-6 pb-24">
        <AnimatePresence mode="wait">
          {step === "result" && data ? (
            <motion.div key="result" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: EASE }}>
              <TrackResult view={data} expired={expired} onReset={reset} />
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.6, ease: EASE }}>
              <TrackForm
                orderNumber={orderNumber}
                onOrderNumber={setOrderNumber}
                step={step === "code" ? "code" : "form"}
                onStep={setStep}
                onVerified={(s) => {
                  try {
                    sessionStorage.setItem(STORAGE, JSON.stringify({ ...s, until: Date.now() + s.expiresIn * 1000 }));
                  } catch {
                    /* storage unavailable */
                  }
                  setSession(s);
                  setStep("result");
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </>
  );
}

function DepartureBoard({ orderNumber, view }: { orderNumber: string; view: TrackView | null }) {
  const t = useTranslations("track.board");
  const now = useNow({ updateInterval: 30_000 });
  const format = useFormatter();
  const shownNumber = ORDER_NUMBER_RE.test(orderNumber) ? orderNumber : (orderNumber || "MV-··-······").padEnd(12, "·");
  const rows = [
    { label: t("flight"), value: shownNumber, length: 12 },
    { label: t("destination"), value: view?.destination ? view.destination.name.en : "· · · · · ·", length: 14 },
    { label: t("status"), value: view ? BOARD_STATUS[view.status] : "AWAITING CODE", length: 13 },
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 30, rotateX: 18 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: 0.3, duration: 1, ease: EASE }} style={{ transformPerspective: 1400 }} className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0a1119] shadow-[0_40px_120px_-30px_rgb(0_0_0/0.9)]">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-white/[0.03] px-5 py-3 sm:px-7">
        <span lang="en" className="flex items-center gap-2 font-mono text-caption tracking-[0.25em] text-gold-300">
          <span className="size-2 animate-pulse rounded-full bg-success" aria-hidden />
          {t("departures")}
        </span>
        <span lang="en" dir="ltr" className="tabular font-mono text-body-sm text-foreground/70">
          RUH · {format.dateTime(now, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Riyadh" })}
        </span>
      </div>
      {/* Boards read left to right in every language. */}
      <div dir="ltr" className="flex flex-col gap-4 overflow-x-auto p-5 sm:flex-row sm:gap-8 sm:p-7" data-lenis-prevent>
        {rows.map((r, i) => (
          <div key={r.label} className="flex shrink-0 flex-col gap-2">
            <span className="text-caption text-foreground/50" dir="auto">
              {r.label}
            </span>
            <SplitFlap text={r.value} length={r.length} delay={i * 0.15} className="text-[clamp(0.95rem,0.7rem+0.9vw,1.35rem)]" cellClassName={i === 2 && view?.status === "ACTION_REQUIRED" ? "!text-[#f0a64a]" : undefined} />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function TrackForm({ orderNumber, onOrderNumber, step, onStep, onVerified }: { orderNumber: string; onOrderNumber: (v: string) => void; step: "form" | "code"; onStep: (s: "form" | "code") => void; onVerified: (s: TrackSession) => void }) {
  const t = useTranslations("track.form");
  const tt = useTranslations("track.errors");
  const te = useTranslations("apply.errors");
  const tu = useTranslations("ui.otp");
  const problem = useTrackError();
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<{ order?: string; phone?: string; code?: string }>({});
  const [busy, setBusy] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const verifying = useRef(false);

  useEffect(() => {
    if (step !== "code") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [step]);

  const request = async (target: string) => {
    setBusy(true);
    setErrors({});
    try {
      const res = await api<OtpRequestResult>("/track/request", { method: "POST", body: { orderNumber, phone: target } });
      setPhone(target);
      setResendAt(Date.now() + res.resendIn * 1000);
      setNow(Date.now());
      setCode("");
      onStep("code");
    } catch (e) {
      setErrors({ phone: problem(e) });
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value: string) => {
    if (verifying.current) return;
    verifying.current = true;
    setBusy(true);
    setErrors({});
    try {
      onVerified(await api<TrackSession>("/track/verify", { method: "POST", body: { orderNumber, phone, code: value } }));
    } catch (e) {
      setErrors({ code: problem(e) });
      setCode("");
    } finally {
      verifying.current = false;
      setBusy(false);
    }
  };

  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1000));

  return (
    <div className="mx-auto max-w-2xl overflow-hidden rounded-[2rem] border border-border bg-surface p-6 shadow-lg sm:p-9">
      <AnimatePresence mode="wait" initial={false}>
        {step === "form" ? (
          <motion.form
            key="form"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            noValidate
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              const next: typeof errors = {};
              if (!ORDER_NUMBER_RE.test(orderNumber)) next.order = tt("order_number");
              const parsed = saudiMobileSchema.safeParse(phoneInput);
              if (!parsed.success) next.phone = te("invalid_saudi_mobile");
              setErrors(next);
              if (parsed.success && !next.order) void request(parsed.data);
            }}
          >
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-foreground text-background">
                <Search className="size-5" aria-hidden />
              </span>
              <p className="flex items-center gap-2 text-body-sm text-muted-foreground">
                <LockKeyhole className="size-4 shrink-0" aria-hidden />
                {t("privacy")}
              </p>
            </div>
            <Field label={t("orderNumber")} hint={t("orderNumberHint")} error={errors.order}>
              <Input
                dir="ltr"
                lang="en"
                autoComplete="off"
                spellCheck={false}
                placeholder="MV-26-XXXXXX"
                value={orderNumber}
                onChange={(e) => onOrderNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 12))}
                className="h-14 font-mono text-heading tracking-[0.15em]"
              />
            </Field>
            <Field label={t("phone")} error={errors.phone}>
              <PhoneInput value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} />
            </Field>
            <Button type="submit" size="lg" loading={busy} className="sm:self-end">
              {t("send")}
              <ArrowUpRight className="flip-rtl" aria-hidden />
            </Button>
          </motion.form>
        ) : (
          <motion.div key="code" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="flex flex-col gap-5">
            <div className="flex items-start gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-foreground text-background">
                <KeyRound className="size-5" aria-hidden />
              </span>
              <div className="flex flex-col gap-1">
                <h2 className="font-display text-heading">{t("code")}</h2>
                <p className="text-body-sm text-muted-foreground">{t("sentTo", { phone: `⁦${phone}⁩` })}</p>
              </div>
            </div>
            <OtpInput value={code} onChange={setCode} onComplete={verify} invalid={Boolean(errors.code)} disabled={busy} label={tu("label")} digitLabel={(n) => tu("digit", { n })} />
            {errors.code && (
              <p role="alert" className="text-body-sm font-medium text-danger">
                {errors.code}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button size="lg" loading={busy} disabled={code.length !== 6} onClick={() => verify(code)}>
                {t("verify")}
              </Button>
              <span className="flex items-center gap-4 text-body-sm">
                <button type="button" className="text-muted-foreground hover:text-foreground hover:underline" onClick={() => (onStep("form"), setErrors({}))}>
                  {t("change")}
                </button>
                <button type="button" disabled={resendIn > 0 || busy} onClick={() => request(phone)} className="tabular font-medium text-secondary-text disabled:text-muted-foreground">
                  {resendIn > 0 ? t("resendIn", { seconds: resendIn }) : t("resend")}
                </button>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TrackResult({ view, expired, onReset }: { view: TrackView; expired: boolean; onReset: () => void }) {
  const t = useTranslations("track.result");
  const ta = useTranslations("track.events");
  const locale = useLocale() as AppLocale;
  const format = useFormatter();
  const reached: Partial<Record<TrackingStep, string>> = {};
  for (const e of view.events) if ((TRACKING_STEPS as readonly string[]).includes(e.status) && !reached[e.status as TrackingStep]) reached[e.status as TrackingStep] = e.at;

  return (
    <div className="flex flex-col gap-8">
      {expired && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/40 bg-warning-soft px-5 py-4 text-body-sm text-warning">
          {t("expired")}
          <Button size="sm" variant="outline" onClick={onReset}>
            {t("again")}
          </Button>
        </div>
      )}
      <div className="relative">
        <BoardingPass
          orderNumber={view.number}
          from={{ code: "RUH", city: locale === "ar" ? "الرياض" : "Riyadh" }}
          to={{ code: view.destination?.iata ?? "···", city: view.destination?.name[locale] ?? "" }}
          serviceName={view.service[locale]}
          travelers={view.travelers}
          status={view.status}
          reachedAt={reached}
        />
        {view.decision && (
          <motion.div className="pointer-events-none absolute -top-8 end-4 w-32 sm:end-10 sm:w-40" initial={{ scale: 2.4, opacity: 0, rotate: -30 }} animate={{ scale: 1, opacity: 1, rotate: -10 }} transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 14 }}>
            <PassportStamp shape={view.decision === "REJECTED" ? "rect" : "circle"} tone={view.decision === "REJECTED" ? "danger" : "teal"} top={t(`decision.${view.decision}`)} bottom="MYVISA" code={view.decision === "REJECTED" ? "✕" : (view.destination?.iata ?? "✓")} caption={view.number} className="w-full" />
          </motion.div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="rounded-[1.75rem] border border-border bg-surface p-6 sm:p-8 lg:col-span-7">
          <h2 className="mb-5 flex items-center justify-between gap-3 font-display text-heading">
            {t("log")}
            <span className="flex items-center gap-2 text-caption font-normal text-muted-foreground">
              <span className="size-2 animate-pulse rounded-full bg-success" aria-hidden />
              {t("refreshing")}
            </span>
          </h2>
          <ol className="relative flex flex-col gap-5 border-s-2 border-dashed border-border ps-6">
            {[...view.events].reverse().map((e, i) => (
              <motion.li key={e.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.07 }} className="relative flex flex-col gap-1">
                <span className={i === 0 ? "absolute -start-[1.95rem] top-1.5 size-3.5 rounded-full border-2 border-surface bg-primary ring-4 ring-primary/25" : "absolute -start-[1.85rem] top-1.5 size-3 rounded-full bg-secondary"} aria-hidden />
                <span className="font-medium">{ta(e.status)}</span>
                <time dateTime={e.at} className="tabular text-caption text-muted-foreground">
                  {format.dateTime(new Date(e.at), { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                </time>
                {e.note && <p className="mt-1 rounded-2xl bg-surface-sunken px-4 py-2.5 text-body-sm">{e.note}</p>}
              </motion.li>
            ))}
          </ol>
        </section>
        <aside className="flex flex-col gap-4 lg:col-span-5">
          <div className="flex flex-col gap-3 rounded-[1.75rem] border border-border bg-surface p-6 text-body-sm">
            <p className="text-muted-foreground">{t("submitted", { date: format.dateTime(new Date(view.createdAt), { day: "numeric", month: "long", year: "numeric" }) })}</p>
            <p className="font-medium">{t("processing", { min: view.processingDays[0], max: view.processingDays[1] })}</p>
            {view.appointment && (
              <p className="flex items-start gap-2 rounded-2xl bg-secondary/[0.07] p-3">
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-secondary-text" aria-hidden />
                {t("appointment", { city: view.appointment.city, date: format.dateTime(new Date(view.appointment.scheduledAt), { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }) })}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/account/orders">
                {t("account")}
                <ArrowUpRight className="flip-rtl" aria-hidden />
              </Link>
            </Button>
            <Button variant="outline" size="lg" onClick={onReset}>
              <RotateCcw aria-hidden />
              {t("again")}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
