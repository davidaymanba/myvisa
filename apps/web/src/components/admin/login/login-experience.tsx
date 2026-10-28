"use client";

import { saudiMobileSchema, type AuthUser, type OtpRequestResult } from "@myvisa/shared";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { PassportStamp } from "@/components/brand/passport-stamp";
import { RouteArcs } from "@/components/brand/route-arcs";
import { Logo } from "@/components/brand/logo";
import { FadeIn } from "@/components/motion/fade-in";
import { SplitReveal } from "@/components/motion/split-reveal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { OtpInput } from "@/components/ui/otp-input";
import { PhoneInput } from "@/components/ui/phone-input";
import { useRouter } from "@/i18n/navigation";
import { api, refreshSession } from "@/lib/api/client";
import { adminKeys, useProblemMessage } from "../use-admin";

type Step = "checking" | "phone" | "code" | "granted";

/** Only same-app admin paths, with the locale prefix removed (the router re-adds it). */
function safeNext(raw: string | null): string {
  if (!raw || !/^\/(en\/)?admin(\/|$)/.test(raw) || raw.includes("//")) return "/admin";
  const path = raw.replace(/^\/en(?=\/)/, "");
  return path.startsWith("/admin/login") ? "/admin" : path;
}

const EASE = [0.16, 1, 0.3, 1] as const;

export function LoginExperience() {
  const t = useTranslations("admin.login");
  const tu = useTranslations("ui.otp");
  const te = useTranslations("admin.errors");
  const problemMessage = useProblemMessage();
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const reduce = useReducedMotion();
  const next = safeNext(params.get("next"));

  const [step, setStep] = useState<Step>("checking");
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const verifying = useRef(false);

  const enter = (user: AuthUser) => {
    if (!user.permissions.includes("admin:access")) {
      setError(t("notStaff"));
      void api("/auth/logout", { method: "POST" }).catch(() => undefined);
      setStep("phone");
      return;
    }
    queryClient.setQueryData(adminKeys.me, user);
    setStep("granted");
    setTimeout(() => router.replace(next), reduce ? 200 : 1300);
  };

  // A returning admin whose access token merely expired gets straight back in.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const refreshed = await refreshSession();
      const me = refreshed ? await api<AuthUser>("/auth/me").catch(() => null) : null;
      if (cancelled) return;
      if (me?.permissions.includes("admin:access")) enter(me);
      else setStep("phone");
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  useEffect(() => {
    if (step !== "code") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [step]);

  const requestCode = async (target: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<OtpRequestResult>("/auth/otp/request", { method: "POST", body: { phone: target } });
      setPhone(target);
      setCode("");
      setResendAt(Date.now() + res.resendIn * 1000);
      setNow(Date.now());
      setStep("code");
    } catch (e) {
      setError(problemMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const submitPhone = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = saudiMobileSchema.safeParse(phoneInput);
    if (!parsed.success) {
      setError(te("invalid_saudi_mobile"));
      return;
    }
    void requestCode(parsed.data);
  };

  const verify = async (value: string) => {
    if (verifying.current) return;
    verifying.current = true;
    setBusy(true);
    setError(null);
    try {
      const { user } = await api<{ user: AuthUser }>("/auth/otp/verify", { method: "POST", body: { phone, code: value } });
      enter(user);
    } catch (e) {
      setError(problemMessage(e));
      setCode("");
    } finally {
      verifying.current = false;
      setBusy(false);
    }
  };

  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const slide = { initial: { opacity: 0, x: 40 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -40 }, transition: { duration: 0.45, ease: EASE } };

  return (
    <section data-surface="dark" className="dark relative isolate flex min-h-dvh overflow-hidden bg-ink-950 text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -start-[10%] -top-[30%] size-[55vw] animate-drift rounded-full bg-teal-500/25 blur-[140px]" />
        <div className="absolute -bottom-[40%] end-[-10%] size-[50vw] animate-drift rounded-full bg-gold-400/15 blur-[140px] [animation-delay:-8s]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(243_247_249/0.045)_1px,transparent_1px)] [background-size:calc(100%/12)_100%] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="absolute inset-x-0 bottom-0 opacity-50 [mask-image:linear-gradient(to_top,black_30%,transparent)]">
          <RouteArcs />
        </div>
      </div>

      <div className="container-page grid w-full items-center gap-12 py-10 lg:grid-cols-12 lg:py-16">
        <div className="flex flex-col gap-7 lg:col-span-7">
          <FadeIn>
            <Logo withArabic />
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="eyebrow flex items-center gap-3 text-gold-300">
              <span className="h-px w-8 bg-current" aria-hidden />
              {t("eyebrow")}
            </p>
          </FadeIn>
          <SplitReveal
            as="h1"
            trigger="mount"
            delay={0.15}
            className="text-[clamp(3rem,1.6rem+5.5vw,7.5rem)] font-medium leading-[0.95] tracking-[-0.035em] [:lang(ar)_&]:leading-[1.2]"
            lines={[{ text: t("title") }, { text: t("titleAccent"), className: "ltr:italic", wordClassName: "bg-gradient-to-l from-gold-200 via-gold-400 to-teal-300 bg-clip-text text-transparent pe-[0.06em]" }]}
          />
          <FadeIn delay={0.5}>
            <p className="max-w-lg text-body-lg text-foreground/70">{t("lead")}</p>
          </FadeIn>
          <FadeIn delay={0.65}>
            <p className="flex items-center gap-2 text-caption text-foreground/50">
              <ShieldCheck className="size-4 text-teal-300" aria-hidden />
              {t("secure")}
            </p>
          </FadeIn>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40, rotate: reduce ? 0 : -2 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.9, delay: 0.25, ease: EASE }}
          className="lg:col-span-5"
        >
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.05] shadow-[0_40px_120px_-30px_rgb(0_0_0/0.8)] backdrop-blur-2xl">
            <div className="flex items-center justify-between px-7 pt-6 sm:px-9" dir="ltr">
              <span className="flex flex-col">
                <span className="text-caption text-foreground/50">FROM</span>
                <span className="font-display text-display-md leading-none">RUH</span>
              </span>
              <motion.span aria-hidden className="h-px flex-1 mx-5 bg-gradient-to-r from-transparent via-gold-400 to-transparent" animate={reduce ? undefined : { opacity: [0.4, 1, 0.4] }} transition={{ duration: 2.4, repeat: Infinity }} />
              <span className="flex flex-col items-end">
                <span className="text-caption text-foreground/50">GATE</span>
                <span className="font-display text-display-md leading-none text-gold-300">OPS</span>
              </span>
            </div>
            <div className="perforation relative my-6 h-px" aria-hidden>
              <span className="absolute -start-3 -top-3 size-6 rounded-full bg-ink-950" />
              <span className="absolute -end-3 -top-3 size-6 rounded-full bg-ink-950" />
              <span className="block h-px border-t border-dashed border-white/15" />
            </div>

            <div className="relative min-h-[22rem] px-7 pb-8 sm:px-9">
              <AnimatePresence mode="wait" initial={false}>
                {step === "checking" && (
                  <motion.div key="checking" {...slide} className="flex min-h-[20rem] flex-col items-center justify-center gap-4 text-foreground/60">
                    <span className="relative grid size-16 place-items-center">
                      <span className="absolute inset-0 animate-ping rounded-full border border-gold-400/40" />
                      <LockKeyhole className="size-6 text-gold-300" aria-hidden />
                    </span>
                    <p role="status">{t("checking")}</p>
                  </motion.div>
                )}

                {step === "phone" && (
                  <motion.form key="phone" {...slide} onSubmit={submitPhone} noValidate className="flex flex-col gap-6">
                    <h2 className="font-display text-display-md">{t("stepPhone")}</h2>
                    <Field label={t("phone")} hint={t("phoneHint")} error={error ?? undefined}>
                      <PhoneInput value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} autoFocus className="border-white/15 bg-white/5" />
                    </Field>
                    <Button type="submit" size="lg" block loading={busy}>
                      {t("send")}
                      <ArrowLeft className="ltr:rotate-180" aria-hidden />
                    </Button>
                    {process.env.NODE_ENV !== "production" && <p className="rounded-xl border border-dashed border-gold-400/30 px-3 py-2 text-caption text-gold-200/80">{t("devHint")}</p>}
                  </motion.form>
                )}

                {step === "code" && (
                  <motion.div key="code" {...slide} className="flex flex-col gap-6">
                    <div className="flex flex-col gap-1.5">
                      <h2 className="flex items-center gap-2 font-display text-display-md">
                        <KeyRound className="size-6 text-gold-300" aria-hidden />
                        {t("stepCode")}
                      </h2>
                      <p className="text-body-sm text-foreground/60">
                        {t("sentTo", { phone: `\u2066${phone}\u2069` })}
                      </p>
                    </div>
                    <OtpInput value={code} onChange={setCode} onComplete={verify} invalid={Boolean(error)} disabled={busy} label={tu("label")} digitLabel={(n) => tu("digit", { n })} />
                    <AnimatePresence>
                      {error && (
                        <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" className="text-body-sm font-medium text-danger">
                          {error}
                        </motion.p>
                      )}
                    </AnimatePresence>
                    <Button size="lg" block loading={busy} disabled={code.length !== 6} onClick={() => verify(code)}>
                      {t("verify")}
                    </Button>
                    <div className="flex items-center justify-between gap-3 text-body-sm">
                      <button type="button" className="text-foreground/60 underline-offset-4 hover:text-foreground hover:underline" onClick={() => (setStep("phone"), setError(null))}>
                        {t("change")}
                      </button>
                      <button type="button" disabled={resendIn > 0 || busy} onClick={() => requestCode(phone)} className="tabular font-medium text-gold-300 disabled:text-foreground/40">
                        {resendIn > 0 ? t("resendIn", { seconds: resendIn }) : t("resend")}
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === "granted" && (
                  <motion.div key="granted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex min-h-[20rem] flex-col items-center justify-center gap-5 text-center">
                    <PassportStamp animated shape="circle" tone="gold" top="ACCESS GRANTED" bottom="MYVISA · OPS" code="✓" rotate={-12} className="w-44 [&_svg]:mix-blend-normal" />
                    <p role="status" className="font-display text-display-md">
                      {t("granted")}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
