"use client";

import type { AppLocale, OrderView, PaymentStatusView } from "@myvisa/shared";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle, MessageCircle, RotateCcw, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { BoardingPass } from "@/components/brand/boarding-pass";
import { PassportStamp } from "@/components/brand/passport-stamp";
import { SplitReveal } from "@/components/motion/split-reveal";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api/client";
import { clearIdempotencyKey } from "./use-apply";

type Outcome = "checking" | "paid" | "failed" | "pending";

/** After the gateway: poll until the payment settles, then celebrate (or offer a clean retry). */
export function Confirmation({ orderId, paymentId, whatsapp }: { orderId: string; paymentId: string | null; whatsapp: string }) {
  const t = useTranslations("apply.confirmation");
  const locale = useLocale() as AppLocale;
  const started = Date.now();

  const payment = useQuery({
    queryKey: ["apply", "payment", paymentId],
    queryFn: () => api<PaymentStatusView>(`/payments/${paymentId}`),
    enabled: Boolean(paymentId),
    refetchInterval: (q) => (q.state.data && q.state.data.status !== "INITIATED" ? false : 2000),
  });
  const settledPaid = payment.data?.status === "PAID";
  const order = useQuery({
    queryKey: ["apply", "order", orderId, "confirmation"],
    queryFn: () => api<OrderView>(`/orders/${orderId}`),
    // Payment success moves the order to RECEIVED asynchronously; poll briefly until it shows.
    refetchInterval: (q) => (q.state.data && q.state.data.status !== "PENDING_PAYMENT" ? false : 1500),
    enabled: !paymentId || settledPaid,
  });

  const outcome: Outcome = paymentId
    ? payment.data?.status === "FAILED"
      ? "failed"
      : settledPaid && order.data && order.data.status !== "PENDING_PAYMENT"
        ? "paid"
        : Date.now() - started > 20_000 || payment.dataUpdatedAt - payment.errorUpdatedAt > 20_000
          ? "pending"
          : "checking"
    : order.data && !["DRAFT", "PENDING_PAYMENT"].includes(order.data.status)
      ? "paid"
      : "checking";

  return (
    <div className="container-page flex min-h-[80dvh] flex-col items-center justify-center gap-10 py-16">
      <AnimatePresence mode="wait">
        {outcome === "checking" || outcome === "pending" ? (
          <motion.div key="checking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="flex flex-col items-center gap-5 text-center" role="status">
            <span className="relative grid size-20 place-items-center">
              <span className="absolute inset-0 animate-ping rounded-full border-2 border-gold-400/40" />
              <LoaderCircle className="size-8 animate-spin text-secondary-text" aria-hidden />
            </span>
            <h1 className="font-display text-display-md">{outcome === "pending" ? t("pendingTitle") : t("checking")}</h1>
            {outcome === "pending" && <p className="max-w-md text-muted-foreground">{t("pendingLead")}</p>}
          </motion.div>
        ) : outcome === "failed" ? (
          <motion.div key="failed" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex max-w-xl flex-col items-center gap-6 text-center">
            <PassportStamp animated shape="rect" tone="danger" top="PAYMENT" bottom="NOT COMPLETED" code="✕" rotate={-8} className="w-48" />
            <h1 className="font-display text-display-lg">{t("failedTitle")}</h1>
            <p className="text-body-lg text-muted-foreground">{t("failedLead")}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" onClick={() => clearIdempotencyKey(orderId)}>
                <Link href={`/apply?order=${orderId}&step=payment`}>
                  <RotateCcw aria-hidden />
                  {t("retry")}
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                  <MessageCircle aria-hidden />
                  {t("help")}
                </a>
              </Button>
            </div>
            {payment.data?.failureReason && (
              <p className="flex items-center gap-2 text-caption text-muted-foreground" dir="ltr">
                <XCircle className="size-3.5" aria-hidden />
                {payment.data.failureReason}
              </p>
            )}
          </motion.div>
        ) : (
          order.data && (
            <motion.div key="paid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid w-full items-center gap-12 lg:grid-cols-12">
              <div className="flex flex-col gap-6 lg:col-span-5">
                <PassportStamp animated shape="circle" tone="teal" top="APPLICATION RECEIVED" bottom="MYVISA" code={order.data.service.destination?.iata ?? "✓"} caption={order.data.number} rotate={-10} className="w-44" />
                <SplitReveal as="h1" trigger="mount" delay={0.4} className="text-[clamp(2.6rem,1.6rem+3.6vw,4.75rem)] font-medium leading-[1.02] tracking-[-0.03em] [:lang(ar)_&]:leading-[1.25]" lines={[{ text: t("paidTitle") }]} />
                <p className="text-body-lg text-muted-foreground">{t("paidLead")}</p>
                <div className="flex flex-col gap-1">
                  <span className="eyebrow text-accent-text">{t("orderNumber")}</span>
                  <span className="tabular font-display text-display-md" dir="ltr">
                    {order.data.number}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link href={`/account/orders/${order.data.id}`}>{t("account")}</Link>
                  </Button>
                  <Button asChild variant="ghost" size="lg">
                    <Link href="/">{t("home")}</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                      <MessageCircle aria-hidden />
                      {t("help")}
                    </a>
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-8 lg:col-span-7">
                <motion.div initial={{ opacity: 0, y: 40, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: 0.6, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
                  <BoardingPass
                    orderNumber={order.data.number}
                    from={{ code: "RUH", city: locale === "ar" ? "الرياض" : "Riyadh" }}
                    to={{ code: order.data.service.destination?.iata ?? "···", city: order.data.service.destination?.name[locale] ?? "" }}
                    serviceName={order.data.service.name[locale]}
                    travelers={order.data.travelers.length}
                    status={order.data.status}
                    reachedAt={{ RECEIVED: new Date().toISOString() }}
                  />
                </motion.div>
                <section>
                  <h2 className="mb-4 font-display text-heading">{t("next")}</h2>
                  <Stagger className="grid gap-3 sm:grid-cols-2" stagger={0.1}>
                    {(t.raw("nextSteps") as string[]).map((s, i) => (
                      <StaggerItem key={s} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
                        <span lang="en" className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground font-display text-background">
                          {i + 1}
                        </span>
                        <span className="text-body-sm">{s}</span>
                      </StaggerItem>
                    ))}
                  </Stagger>
                </section>
              </div>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  );
}
