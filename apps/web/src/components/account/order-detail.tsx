"use client";

import { TRACKING_STEPS, type AppLocale, type OrderTimelineView, type OrderView, type TrackingStep } from "@myvisa/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, CreditCard, FileQuestion, PencilLine } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BoardingPass } from "@/components/brand/boarding-pass";
import { Flag } from "@/components/brand/flag";
import { PassportStamp } from "@/components/brand/passport-stamp";
import { SplitReveal } from "@/components/motion/split-reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { Link } from "@/i18n/navigation";
import { ApiError, api } from "@/lib/api/client";
import { unsplash } from "@/lib/images";
import { ActionPanel } from "./action-panel";
import { MessagesPanel } from "./messages-panel";
import { DocumentsSection, JourneyLog, LogisticsSection, TravelersSection } from "./order-sections";
import { orderAction, statusTone } from "./order-ticket";
import { LoadError } from "./page-header";
import { accountKeys, useAccountOrder, useErrorToast, useRefreshAccount, useTimeline } from "./use-account";

/** First time each milestone was reached, for the boarding pass. */
function reached(timeline?: OrderTimelineView): Partial<Record<TrackingStep, string>> {
  const out: Partial<Record<TrackingStep, string>> = {};
  for (const e of timeline?.events ?? []) if ((TRACKING_STEPS as readonly string[]).includes(e.status) && !out[e.status as TrackingStep]) out[e.status as TrackingStep] = e.at;
  return out;
}

export function OrderDetail({ id }: { id: string }) {
  const t = useTranslations("account.order");
  const locale = useLocale() as AppLocale;
  const order = useAccountOrder(id);
  const timeline = useTimeline(id);

  // Deep links (#messages, #action) land after the data renders.
  useEffect(() => {
    if (!order.data || !window.location.hash) return;
    const el = document.getElementById(window.location.hash.slice(1));
    if (el) {
      const timer = window.setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 400);
      return () => window.clearTimeout(timer);
    }
  }, [order.data]);

  if (order.isError) {
    return order.error instanceof ApiError && order.error.status === 404 ? (
      <EmptyState icon={<FileQuestion />} title={t("notFound")} description={t("notFoundLead")} action={<BackLink />} className="mt-10" />
    ) : (
      <LoadError onRetry={() => order.refetch()} className="mt-10" />
    );
  }
  if (!order.data) return <DetailSkeleton />;
  const o = order.data;

  return (
    <div className="flex flex-col gap-6">
      <BackLink />
      <Hero order={o} decision={timeline.data?.decision ?? null} />
      <motion.div initial={{ opacity: 0, y: 40, rotateX: 8 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: 0.35, duration: 0.9, ease: [0.16, 1, 0.3, 1] }} style={{ transformPerspective: 1200 }}>
        <BoardingPass
          orderNumber={o.number}
          from={{ code: "RUH", city: locale === "ar" ? "الرياض" : "Riyadh" }}
          to={{ code: o.service.destination?.iata ?? "···", city: o.service.destination?.name[locale] ?? "" }}
          serviceName={o.service.name[locale]}
          travelers={o.travelers.length}
          status={o.status}
          reachedAt={reached(timeline.data)}
        />
      </motion.div>

      {o.status === "ACTION_REQUIRED" && <ActionPanel order={o} />}
      {(o.status === "DRAFT" || o.status === "PENDING_PAYMENT") && <DraftPanel order={o} />}

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-7">
          {timeline.data && <JourneyLog timeline={timeline.data} />}
          {o.documents.some((d) => d.document.uploaded) && <DocumentsSection order={o} />}
          <TravelersSection order={o} />
        </div>
        <div className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-6 lg:col-span-5">
          {o.status !== "DRAFT" && <MessagesPanel orderId={o.id} />}
          <LogisticsSection order={o} timeline={timeline.data} />
        </div>
      </div>
    </div>
  );
}

function BackLink() {
  const t = useTranslations("account.order");
  return (
    <Link href="/account/orders" className="group inline-flex w-fit items-center gap-2 text-body-sm font-medium text-muted-foreground hover:text-foreground max-sm:-my-2 max-sm:py-2">
      <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1 rtl:rotate-180 rtl:group-hover:translate-x-1" aria-hidden />
      {t("back")}
    </Link>
  );
}

function Hero({ order, decision }: { order: OrderView; decision: OrderTimelineView["decision"] }) {
  const t = useTranslations("account.order");
  const tb = useTranslations("ui.boardingPass");
  const locale = useLocale() as AppLocale;
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const dest = order.service.destination;

  return (
    <div ref={ref} data-surface="dark" className="dark relative isolate min-h-64 overflow-hidden rounded-[2rem] bg-ink-950 text-foreground sm:min-h-72">
      {dest?.imageId && (
        <motion.div style={{ y }} className="absolute inset-0 -z-10 scale-110">
          <Image src={unsplash(dest.imageId, 1600)} alt="" fill priority sizes="(min-width: 1024px) 70vw, 100vw" className="object-cover opacity-60" />
        </motion.div>
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-ink-950/60 to-ink-950/10" />
      <div className="absolute -start-20 -top-20 -z-10 size-72 animate-drift rounded-full bg-teal-500/30 blur-[80px]" aria-hidden />

      <div className="flex h-full min-h-64 flex-col justify-end gap-4 p-6 sm:min-h-72 sm:p-9">
        <div className="flex flex-wrap items-center gap-3">
          {dest && <Flag code={dest.iso2} className="h-5 w-7 rounded-sm shadow" />}
          <span lang="en" dir="ltr" className="font-mono text-body-sm font-semibold tracking-[0.2em] text-gold-200">
            {order.number}
          </span>
          <Badge tone={statusTone(order.status)} dot>
            {tb(`statuses.${order.status}`)}
          </Badge>
        </div>
        <SplitReveal as="h1" trigger="mount" delay={0.1} className="max-w-3xl text-[clamp(2rem,1.2rem+3vw,3.75rem)] font-medium leading-[1.05] tracking-[-0.03em] [:lang(ar)_&]:leading-[1.3]" lines={[{ text: dest?.name[locale] ?? order.service.name[locale] }]} />
        <p className="text-body-lg text-foreground/75">{order.service.name[locale]}</p>
      </div>

      {/* The embassy's decision lands like a stamp. */}
      {decision && (
        <motion.div className="absolute end-5 top-5 w-32 sm:end-9 sm:top-8 sm:w-40" initial={{ scale: 2.4, opacity: 0, rotate: -30 }} animate={{ scale: 1, opacity: 1, rotate: -12 }} transition={{ delay: 0.8, type: "spring", stiffness: 260, damping: 14 }}>
          <PassportStamp shape={decision === "REJECTED" ? "rect" : "circle"} tone={decision === "REJECTED" ? "danger" : "gold"} top={t(`decision.${decision}`)} bottom="MYVISA" code={decision === "REJECTED" ? "✕" : (dest?.iata ?? "✓")} caption={order.number} className="w-full" />
        </motion.div>
      )}
    </div>
  );
}

function DraftPanel({ order }: { order: OrderView }) {
  const t = useTranslations("account.order");
  const to = useTranslations("account.orders");
  const tc = useTranslations("account.common");
  const queryClient = useQueryClient();
  const refresh = useRefreshAccount();
  const onError = useErrorToast();
  const [confirming, setConfirming] = useState(false);
  const action = orderAction(order);
  const cancel = useMutation({
    mutationFn: () => api<OrderView>(`/orders/${order.id}/cancel`, { method: "POST" }),
    onSuccess: (o) => {
      queryClient.setQueryData(accountKeys.order(order.id), o);
      void refresh();
      toast.success(t("cancelled"));
      setConfirming(false);
    },
    onError,
  });
  const pending = order.status === "PENDING_PAYMENT";
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 rounded-[1.75rem] border border-gold-400/50 bg-gold-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7 dark:bg-gold-400/10">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">{pending ? <CreditCard className="size-5" aria-hidden /> : <PencilLine className="size-5" aria-hidden />}</span>
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-heading">{pending ? t("pendingTitle") : t("draftTitle")}</h2>
          <p className="text-body-sm text-muted-foreground">{pending ? t("pendingLead") : t("draftLead")}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={() => setConfirming(true)}>
          {t("cancelDraft")}
        </Button>
        <Button asChild size="lg">
          <Link href={action.href}>
            {to(action.key)}
            <ArrowUpRight className="flip-rtl" aria-hidden />
          </Link>
        </Button>
      </div>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent closeLabel={tc("close")}>
          <DialogTitle className="pe-10">{t("cancelTitle")}</DialogTitle>
          <DialogDescription>{t("cancelLead")}</DialogDescription>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              {tc("back")}
            </Button>
            <Button variant="danger" loading={cancel.isPending} onClick={() => cancel.mutate()}>
              {t("cancelConfirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.section>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-72 rounded-[2rem]" />
      <Skeleton className="h-64 rounded-3xl" />
      <div className="grid gap-6 lg:grid-cols-12">
        <Skeleton className="h-96 rounded-[1.75rem] lg:col-span-7" />
        <Skeleton className="h-96 rounded-[1.75rem] lg:col-span-5" />
      </div>
    </div>
  );
}
