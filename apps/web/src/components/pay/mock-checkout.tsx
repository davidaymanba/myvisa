"use client";

import { formatMoney, type AppLocale, type PaymentStatusView } from "@myvisa/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CreditCard, LockKeyhole, ShieldCheck, TriangleAlert } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { PassportStamp } from "@/components/brand/passport-stamp";
import { Magnetic } from "@/components/motion/magnetic";
import { TiltCard } from "@/components/motion/tilt-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "@/i18n/navigation";
import { ApiError, api } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const METHODS = ["mada", "VISA", "Mastercard", "Apple Pay", "STC Pay"] as const;
const EASE = [0.16, 1, 0.3, 1] as const;

type Phase = "form" | "processing" | "paid" | "declined";

/** The development gateway's "hosted page". Card fields are decorative: nothing typed here is sent anywhere. */
export function MockCheckout() {
  const t = useTranslations("pay");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const reduce = useReducedMotion();
  const paymentId = useSearchParams().get("payment") ?? "";
  const [phase, setPhase] = useState<Phase>("form");
  const [method, setMethod] = useState<(typeof METHODS)[number]>("mada");

  const payment = useQuery({ queryKey: ["pay", paymentId], queryFn: () => api<PaymentStatusView>(`/payments/${encodeURIComponent(paymentId)}`), enabled: Boolean(paymentId), retry: false });

  const complete = useMutation({
    mutationFn: async (outcome: "paid" | "failed") => {
      setPhase("processing");
      // A beat of "bank" latency so the flow feels like the real thing.
      const [result] = await Promise.all([api<PaymentStatusView>(`/payments/mock/${encodeURIComponent(paymentId)}/complete`, { method: "POST", body: { outcome } }), new Promise((r) => setTimeout(r, reduce ? 0 : 1400))]);
      return result;
    },
    onSuccess: (result) => {
      setPhase(result.status === "PAID" ? "paid" : "declined");
      setTimeout(() => router.replace(`/apply/confirmation?order=${encodeURIComponent(result.orderId)}&payment=${encodeURIComponent(result.paymentId)}`), reduce ? 300 : 1800);
    },
    onError: () => setPhase("form"),
  });

  const amount = payment.data ? formatMoney(payment.data.amountHalalas, locale, { fractionDigits: 2 }) : "";
  const unauthorized = payment.error instanceof ApiError && payment.error.status === 401;

  return (
    <main data-surface="dark" className="dark relative isolate flex min-h-dvh items-center overflow-hidden bg-ink-950 py-10 text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -start-[10%] -top-[30%] size-[55vw] animate-drift rounded-full bg-teal-500/25 blur-[140px]" />
        <div className="absolute -bottom-[40%] -end-[10%] size-[50vw] animate-drift rounded-full bg-gold-400/15 blur-[140px] [animation-delay:-8s]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgb(243_247_249/0.06)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      </div>

      <div aria-hidden className="pointer-events-none fixed right-[-4.5rem] top-8 z-20 w-72 rotate-45 bg-gradient-to-l from-danger to-[#ff7a59] py-2 text-center text-caption font-bold tracking-[0.2em] text-white shadow-lg max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:w-full max-sm:rotate-0 max-sm:py-1.5">
        {t("ribbon")}
      </div>

      <div className="container-page grid w-full max-w-6xl items-center gap-10 lg:grid-cols-2">
        <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }} className="flex flex-col gap-8">
          <Logo withArabic />
          <div className="flex flex-col gap-2">
            <p className="eyebrow text-gold-300">{t("merchant")}</p>
            <p className="text-body text-foreground/60">{payment.data ? t("orderNo", { number: payment.data.orderNumber }) : <Skeleton className="h-5 w-40" />}</p>
            <p className="text-body-sm text-foreground/50">{t("total")}</p>
            <div className="tabular font-display text-[clamp(3rem,2rem+4vw,5.5rem)] leading-none">{payment.data ? amount : <Skeleton className="h-16 w-72" />}</div>
          </div>
          <TiltCard className="w-full max-w-md rounded-[1.75rem]">
            <div dir="ltr" className="relative aspect-[1.586] overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-teal-600 via-ink-800 to-ink-950 p-6 shadow-[0_40px_100px_-30px_rgb(0_0_0/0.9)] ring-1 ring-white/10">
              <div aria-hidden className="absolute -end-16 -top-16 size-56 rounded-full bg-gold-400/25 blur-3xl" />
              <div className="flex items-start justify-between">
                <span className="h-9 w-12 rounded-md bg-gradient-to-br from-gold-200 to-gold-500 shadow-inner" />
                <span className="font-display text-title italic text-white/90">{method}</span>
              </div>
              <p className="tabular mt-10 font-mono text-[clamp(1.1rem,0.9rem+1vw,1.5rem)] tracking-[0.18em] text-white">4111 1111 1111 1111</p>
              <div className="mt-6 flex items-end justify-between text-caption uppercase tracking-widest text-white/70">
                <span>{t("card.holder")}</span>
                <span className="tabular">12/30</span>
              </div>
            </div>
          </TiltCard>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15, ease: EASE }} className="relative min-h-[30rem] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 shadow-[0_40px_120px_-30px_rgb(0_0_0/0.8)] backdrop-blur-2xl sm:p-9">
          <AnimatePresence mode="wait" initial={false}>
            {!paymentId || payment.isError ? (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex min-h-[26rem] flex-col items-center justify-center gap-4 text-center">
                <TriangleAlert className="size-10 text-danger" aria-hidden />
                <p className="font-display text-heading">{t("loadError")}</p>
                {unauthorized && <p className="text-body-sm text-foreground/60">{t("signIn")}</p>}
              </motion.div>
            ) : phase === "form" ? (
              <motion.div key="form" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.4, ease: EASE }} className="flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <p className="text-body-sm font-medium text-foreground/70">{t("methods")}</p>
                  <div role="radiogroup" aria-label={t("methods")} className="flex flex-wrap gap-2">
                    {METHODS.map((m) => (
                      <button key={m} type="button" role="radio" aria-checked={method === m} onClick={() => setMethod(m)} lang="en" className={cn("relative rounded-full border px-4 py-2 text-body-sm font-semibold transition", method === m ? "border-gold-400 text-ink-950" : "border-white/15 text-foreground/80 hover:border-white/40")}>
                        {method === m && <motion.span layoutId="pay-method" className="absolute inset-0 -z-10 rounded-full bg-gold-400" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4" dir="ltr">
                  <FakeField label={t("card.number")} value="4111 1111 1111 1111" icon={<CreditCard className="size-4" aria-hidden />} />
                  <div className="grid grid-cols-2 gap-4">
                    <FakeField label={t("card.expiry")} value="12 / 30" />
                    <FakeField label={t("card.cvc")} value="123" />
                  </div>
                  <FakeField label={t("card.name")} value={t("card.holder")} />
                </div>
                {payment.data && payment.data.status !== "INITIATED" ? (
                  <p role="status" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-body-sm">
                    {t("closed", { status: t(`status.${payment.data.status}`) })}
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Magnetic className="w-full">
                      <Button size="lg" block disabled={!payment.data} loading={complete.isPending} onClick={() => complete.mutate("paid")}>
                        <LockKeyhole aria-hidden />
                        {t("pay", { amount })}
                      </Button>
                    </Magnetic>
                    <Button variant="ghost" size="sm" disabled={!payment.data || complete.isPending} onClick={() => complete.mutate("failed")} className="text-foreground/60 hover:text-danger">
                      {t("fail")}
                    </Button>
                  </div>
                )}
                <p className="flex items-center justify-center gap-2 text-caption text-foreground/45">
                  <ShieldCheck className="size-3.5 text-teal-300" aria-hidden />
                  {t("secure")}
                </p>
                <p className="rounded-xl border border-dashed border-danger/40 px-3 py-2 text-center text-caption text-[#ff9b85]">{t("devNote")}</p>
              </motion.div>
            ) : (
              <motion.div key={phase} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: EASE }} className="flex min-h-[26rem] flex-col items-center justify-center gap-6 text-center">
                {phase === "processing" ? (
                  <>
                    <span className="relative grid size-24 place-items-center">
                      <span className="absolute inset-0 animate-spin rounded-full border-2 border-white/10 border-t-gold-400" />
                      <span className="absolute inset-3 animate-ping rounded-full bg-gold-400/10" />
                      <LockKeyhole className="size-8 text-gold-300" aria-hidden />
                    </span>
                    <p role="status" className="font-display text-heading">
                      {t("processing")}
                    </p>
                  </>
                ) : (
                  <>
                    <PassportStamp animated shape="circle" tone={phase === "paid" ? "teal" : "danger"} top={phase === "paid" ? "APPROVED" : "DECLINED"} bottom="MYVISA PAY" code={phase === "paid" ? "✓" : "✕"} rotate={-12} className="w-44 [&_svg]:mix-blend-normal" />
                    <div className="flex flex-col gap-1">
                      <p role="status" className="font-display text-display-md">
                        {phase === "paid" ? t("paid") : t("declined")}
                      </p>
                      <p className="text-body-sm text-foreground/60">{t("redirecting")}</p>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      </div>
    </main>
  );
}

function FakeField({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-caption text-foreground/55">{label}</span>
      <span className="flex h-12 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 font-mono text-body tracking-wider text-foreground/90">
        {icon}
        {value}
      </span>
    </div>
  );
}
