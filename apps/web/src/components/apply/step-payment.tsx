"use client";

import { formatMoney, type AppLocale, type OrderView, type PaymentStart } from "@myvisa/shared";
import { Lock, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Magnetic } from "@/components/motion/magnetic";
import { Button } from "@/components/ui/button";
import { idempotencyKey, postWithHeaders, useApplyError } from "./use-apply";

const METHODS = ["mada", "VISA", "Mastercard", "Apple Pay", "STC Pay"];

/** Last stop before the gateway: one big, honest number and a single action. */
export function StepPayment({ order, onEdit }: { order: OrderView; onEdit: () => void }) {
  const t = useTranslations("apply.payment");
  const locale = useLocale() as AppLocale;
  const problem = useApplyError();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amount = formatMoney(order.price.total, locale, { fractionDigits: 2 });

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      const start = await postWithHeaders<PaymentStart>(`/orders/${order.id}/payments`, {}, { "Idempotency-Key": idempotencyKey(order.id) });
      window.location.assign(start.redirectUrl);
    } catch (e) {
      setError(problem(e));
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section data-surface="dark" className="dark relative isolate overflow-hidden rounded-[2rem] bg-ink-950 p-6 text-foreground shadow-xl sm:p-10">
        <div aria-hidden className="absolute -start-16 -top-24 -z-10 size-80 animate-drift rounded-full bg-teal-500/30 blur-[90px]" />
        <div aria-hidden className="absolute -bottom-24 -end-10 -z-10 size-72 animate-drift rounded-full bg-gold-400/20 blur-[90px] [animation-delay:-5s]" />
        <p className="eyebrow text-gold-300" dir="ltr">
          {order.number}
        </p>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="tabular mt-4 font-display text-[clamp(2.75rem,2rem+4vw,5.5rem)] leading-none max-sm:text-[clamp(2.25rem,0.5rem+10vw,3rem)]">
          {amount}
        </motion.p>
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <span className="text-caption text-foreground/60">{t("methods")}</span>
          {METHODS.map((m, i) => (
            <motion.span key={m} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.06 }} lang="en" className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-caption font-semibold tracking-wide">
              {m}
            </motion.span>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Magnetic>
            <Button size="lg" loading={busy} onClick={pay} className="min-w-56">
              <Lock aria-hidden />
              {busy ? t("redirecting") : t("pay", { amount })}
            </Button>
          </Magnetic>
          <button type="button" onClick={onEdit} disabled={busy} className="text-body-sm text-foreground/60 underline-offset-4 hover:text-foreground hover:underline">
            {t("edit")}
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-4 text-body-sm font-medium text-danger">
            {error}
          </p>
        )}
      </section>
      <p className="flex items-center gap-2 text-caption text-muted-foreground">
        <ShieldCheck className="size-4 text-secondary-text" aria-hidden />
        {t("secure")}
      </p>
    </div>
  );
}
