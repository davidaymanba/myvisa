"use client";

import { saudiMobileSchema, type AuthUser, type OtpRequestResult } from "@myvisa/shared";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, Smartphone } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { OtpInput } from "@/components/ui/otp-input";
import { PhoneInput } from "@/components/ui/phone-input";
import { api } from "@/lib/api/client";
import { applyKeys, useApplyError } from "./use-apply";

/** Inline phone sign-in: the application is saved to the verified number. */
export function PhoneGate({ onSignedIn, title, lead }: { onSignedIn: (user: AuthUser) => void; title?: string; lead?: string }) {
  const t = useTranslations("apply.auth");
  const tu = useTranslations("ui.otp");
  const te = useTranslations("apply.errors");
  const problem = useApplyError();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [input, setInput] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const verifying = useRef(false);

  useEffect(() => {
    if (step !== "code") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [step]);

  const send = async (target: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<OtpRequestResult>("/auth/otp/request", { method: "POST", body: { phone: target } });
      setPhone(target);
      setResendAt(Date.now() + res.resendIn * 1000);
      setNow(Date.now());
      setStep("code");
    } catch (e) {
      setError(problem(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value: string) => {
    if (verifying.current) return;
    verifying.current = true;
    setBusy(true);
    setError(null);
    try {
      const { user } = await api<{ user: AuthUser }>("/auth/otp/verify", { method: "POST", body: { phone, code: value } });
      queryClient.setQueryData(applyKeys.me, user);
      onSignedIn(user);
    } catch (e) {
      setError(problem(e));
      setCode("");
    } finally {
      verifying.current = false;
      setBusy(false);
    }
  };

  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const slide = { initial: { opacity: 0, x: 30 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -30 }, transition: { duration: 0.35 } };

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-border bg-surface p-6 shadow-md sm:p-8">
      <div aria-hidden className="absolute -end-16 -top-16 size-56 rounded-full bg-gold-200/40 blur-3xl dark:bg-gold-400/10" />
      <div className="relative flex flex-col gap-6">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-foreground text-background">{step === "phone" ? <Smartphone className="size-5" aria-hidden /> : <KeyRound className="size-5" aria-hidden />}</span>
          <div className="flex flex-col gap-1">
            <h3 className="font-display text-heading">{step === "phone" ? (title ?? t("title")) : t("code")}</h3>
            <p className="text-body-sm text-muted-foreground">{step === "phone" ? (lead ?? t("lead")) : t("sentTo", { phone: `\u2066${phone}\u2069` })}</p>
          </div>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {step === "phone" ? (
            <motion.form
              key="phone"
              {...slide}
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                const parsed = saudiMobileSchema.safeParse(input);
                if (!parsed.success) return setError(te("invalid_saudi_mobile"));
                void send(parsed.data);
              }}
              className="flex flex-col gap-4 sm:flex-row sm:items-start"
            >
              <Field label={t("phone")} error={error ?? undefined} className="flex-1">
                <PhoneInput value={input} onChange={(e) => setInput(e.target.value)} />
              </Field>
              <Button type="submit" size="lg" loading={busy} className="sm:mt-7">
                {t("send")}
              </Button>
            </motion.form>
          ) : (
            <motion.div key="code" {...slide} className="flex flex-col gap-4">
              <OtpInput value={code} onChange={setCode} onComplete={verify} invalid={Boolean(error)} disabled={busy} label={tu("label")} digitLabel={(n) => tu("digit", { n })} />
              {error && (
                <p role="alert" className="text-body-sm font-medium text-danger">
                  {error}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button size="lg" loading={busy} disabled={code.length !== 6} onClick={() => verify(code)}>
                  {t("verify")}
                </Button>
                <span className="flex items-center gap-4 text-body-sm">
                  <button type="button" className="text-muted-foreground hover:text-foreground hover:underline" onClick={() => (setStep("phone"), setError(null), setCode(""))}>
                    {t("change")}
                  </button>
                  <button type="button" disabled={resendIn > 0 || busy} onClick={() => send(phone)} className="tabular font-medium text-secondary-text disabled:text-muted-foreground">
                    {resendIn > 0 ? t("resendIn", { seconds: resendIn }) : t("resend")}
                  </button>
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
