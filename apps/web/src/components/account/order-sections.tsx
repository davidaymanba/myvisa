"use client";

import { formatMoney, type AppLocale, type OrderTimelineView, type OrderView } from "@myvisa/shared";
import { CalendarClock, CheckCircle2, CircleDashed, Clock3, FileText, MapPin, PackageCheck, ReceiptText, Truck, UserRound, XCircle } from "lucide-react";
import { motion } from "motion/react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { statusTone } from "./order-ticket";

const EASE = [0.16, 1, 0.3, 1] as const;

export function Section({ id, icon, title, lead, children, className, action }: { id?: string; icon: ReactNode; title: string; lead?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.6, ease: EASE }}
      className={cn("scroll-mt-28 rounded-[1.75rem] border border-border bg-surface p-5 shadow-xs sm:p-7", className)}
    >
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-foreground text-background [&_svg]:size-[18px]">{icon}</span>
          <div className="flex flex-col gap-0.5">
            <h2 className="font-display text-heading">{title}</h2>
            {lead && <p className="text-body-sm text-muted-foreground">{lead}</p>}
          </div>
        </div>
        {action}
      </header>
      {children}
    </motion.section>
  );
}

/** The journey log: every status change as a stamped entry, with the line drawing itself in. */
export function JourneyLog({ timeline }: { timeline: OrderTimelineView }) {
  const t = useTranslations("account.order");
  const tb = useTranslations("ui.boardingPass");
  const format = useFormatter();
  const events = [...timeline.events].reverse();
  return (
    <Section icon={<Clock3 />} title={t("timeline")} lead={t("timelineLead")}>
      <ol className="relative flex flex-col gap-6 ps-2">
        <motion.span aria-hidden className="absolute start-[1.15rem] top-3 bottom-3 w-px origin-top bg-gradient-to-b from-secondary via-border-strong to-transparent" initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, ease: EASE }} />
        {events.map((e, i) => {
          const latest = i === 0;
          const tone = statusTone(e.status);
          return (
            <motion.li key={e.id} initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 + i * 0.07, duration: 0.5, ease: EASE }} className="relative flex gap-4">
              <span className={cn("relative z-10 mt-0.5 grid size-[1.9rem] shrink-0 place-items-center rounded-full border-2 bg-surface", latest ? (tone === "warning" ? "border-warning text-warning" : "border-primary text-accent-text") : "border-secondary text-secondary-text")}>
                {latest && <span className={cn("absolute inset-0 animate-pulse-ring rounded-full", tone === "warning" ? "bg-warning/30" : "bg-primary/30")} aria-hidden />}
                {e.status === "CANCELLED" || e.status === "REFUNDED" ? <XCircle className="size-3.5" aria-hidden /> : latest ? <CircleDashed className="size-3.5" aria-hidden /> : <CheckCircle2 className="size-3.5" aria-hidden />}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{t(`events.${e.status}`)}</span>
                  {latest && (
                    <Badge tone={tone} dot>
                      {tb(`statuses.${e.status}`)}
                    </Badge>
                  )}
                </div>
                <time dateTime={e.at} className="tabular text-caption text-muted-foreground">
                  {format.dateTime(new Date(e.at), { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                </time>
                {e.note && (
                  <p className="mt-1 rounded-2xl rounded-ss-sm bg-surface-sunken px-4 py-2.5 text-body-sm">
                    <span className="mb-0.5 block text-caption font-medium text-accent-text">{t("noteFromTeam")}</span>
                    {e.note}
                  </p>
                )}
              </div>
            </motion.li>
          );
        })}
      </ol>
    </Section>
  );
}

export function ReviewBadge({ status }: { status: OrderView["documents"][number]["reviewStatus"] }) {
  const t = useTranslations("account.order");
  if (status === "APPROVED") return <Badge tone="success">{t("approved")}</Badge>;
  if (status === "REJECTED") return <Badge tone="danger">{t("rejected")}</Badge>;
  return <Badge tone="info">{t("inReview")}</Badge>;
}

/** Uploaded files per traveller (and for the whole order), with each file's review state. */
export function DocumentsSection({ order }: { order: OrderView }) {
  const t = useTranslations("account.order");
  const locale = useLocale() as AppLocale;
  const groups = [...order.travelers.map((tr) => ({ key: tr.id, title: `${tr.givenNameEn} ${tr.surnameEn}`, latin: true })), { key: null as string | null, title: t("forOrder"), latin: false }]
    .map((g) => ({ ...g, docs: order.documents.filter((d) => d.orderTravelerId === g.key && d.document.uploaded) }))
    .filter((g) => g.docs.length);
  const view = async (id: string) => {
    const { url } = await api<{ url: string }>(`/order-documents/${id}/url`);
    window.open(url, "_blank", "noopener");
  };
  return (
    <Section icon={<FileText />} title={t("documents")} lead={t("documentsLead")}>
      <div className="flex flex-col gap-5">
        {groups.map((g) => (
          <div key={g.key ?? "order"} className="flex flex-col gap-2">
            <h3 lang={g.latin ? "en" : undefined} className="eyebrow text-muted-foreground">
              {g.title}
            </h3>
            <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
              {g.docs.map((d) => {
                const req = order.requirements.find((r) => r.id === d.requirementId);
                return (
                  <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-body-sm font-medium">{req?.title[locale] ?? "—"}</span>
                      <span className="truncate text-caption text-muted-foreground" dir="auto">
                        {d.document.originalName}
                      </span>
                      {d.reviewStatus === "REJECTED" && d.rejectionReason && <span className="text-caption text-danger">{t("reason", { reason: d.rejectionReason })}</span>}
                    </div>
                    <ReviewBadge status={d.reviewStatus} />
                    {d.document.scanStatus === "CLEAN" && (
                      <Button variant="ghost" size="sm" onClick={() => void view(d.id)}>
                        <FileText aria-hidden />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function TravelersSection({ order }: { order: OrderView }) {
  const t = useTranslations("account.order");
  const ta = useTranslations("apply.travelers");
  return (
    <Section icon={<UserRound />} title={t("travelers")}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {order.travelers.map((tr, i) => (
          <motion.li key={tr.id} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="flex items-center gap-3 rounded-2xl bg-surface-sunken/70 p-3.5">
            <span lang="en" className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-teal-300 to-teal-700 font-display text-white">
              {tr.givenNameEn.charAt(0)}
              {tr.surnameEn.charAt(0)}
            </span>
            <div className="flex min-w-0 flex-col">
              <span lang="en" dir="ltr" className="truncate font-medium rtl:text-end">
                {tr.givenNameEn} {tr.surnameEn}
              </span>
              <span className="text-caption text-muted-foreground">
                {ta(`relationships.${tr.relationship}`)} · {t("passport", { masked: `\u2066${tr.passportNumberMasked}\u2069` })}
              </span>
            </div>
          </motion.li>
        ))}
      </ul>
    </Section>
  );
}

/** Total paid, the invoice, appointment and shipping — the practical side panel. */
export function LogisticsSection({ order, timeline }: { order: OrderView; timeline?: OrderTimelineView }) {
  const t = useTranslations("account.order");
  const tp = useTranslations("ui.price");
  const locale = useLocale() as AppLocale;
  const format = useFormatter();
  const appointment = timeline?.appointment;
  const paid = order.payment?.status === "PAID";
  return (
    <Section icon={<ReceiptText />} title={t("payment")}>
      <div className="flex flex-col gap-5">
        <div className="flex items-end justify-between gap-3 rounded-2xl bg-surface-sunken/70 p-4">
          <div className="flex flex-col gap-1">
            <span className="flex flex-wrap gap-x-3 text-caption text-muted-foreground">
              <span>
                {tp("legendGovernment")} <span className="tabular">{formatMoney(order.price.governmentFees, locale, { fractionDigits: 2 })}</span>
              </span>
              <span>
                {tp("legendOurs")} <span className="tabular">{formatMoney(order.price.serviceFees - order.price.discount + order.price.vat, locale, { fractionDigits: 2 })}</span>
              </span>
            </span>
            <span className="tabular font-display text-display-md leading-none">{formatMoney(order.price.total, locale, { fractionDigits: 2 })}</span>
          </div>
          {paid && <Badge tone="success">{t("paid")}</Badge>}
        </div>
        {timeline?.invoices.length ? (
          <ul className="flex flex-col gap-2">
            {timeline.invoices.map((inv) => (
              <li key={inv.id}>
                <Link href={`/account/invoices/${inv.id}`} className="group flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3 transition-colors hover:border-foreground/30 hover:bg-muted">
                  <span className="flex items-center gap-2 text-body-sm font-medium">
                    <ReceiptText className="size-4 text-secondary-text" aria-hidden />
                    {t("viewInvoice")}
                  </span>
                  <span lang="en" dir="ltr" className="font-mono text-caption text-muted-foreground">
                    {inv.number}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-caption text-muted-foreground">{t("noInvoice")}</p>
        )}

        {(order.travelFrom || order.service.processingDays) && (
          <dl className="grid grid-cols-2 gap-3 border-t border-border pt-4 text-body-sm">
            {order.travelFrom && (
              <div className="flex flex-col gap-0.5">
                <dt className="text-caption text-muted-foreground">{t("travelDates")}</dt>
                <dd className="tabular font-medium">
                  {format.dateTimeRange(new Date(`${order.travelFrom}T00:00:00Z`), new Date(`${order.travelTo ?? order.travelFrom}T00:00:00Z`), { day: "numeric", month: "short", timeZone: "UTC" })}
                </dd>
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              <dt className="text-caption text-muted-foreground">{t("processing")}</dt>
              <dd className="font-medium">{t("processingDays", { min: order.service.processingDays[0], max: order.service.processingDays[1] })}</dd>
            </div>
          </dl>
        )}

        {appointment && (
          <div className="flex items-start gap-3 rounded-2xl border border-secondary/30 bg-secondary/[0.06] p-4">
            <CalendarClock className="mt-0.5 size-5 shrink-0 text-secondary-text" aria-hidden />
            <div className="flex flex-col gap-0.5 text-body-sm">
              <span className="font-medium">{t("appointment")}</span>
              <span className="tabular">{t("appointmentWhen", { date: format.dateTime(new Date(appointment.scheduledAt), { weekday: "long", day: "numeric", month: "long" }), time: format.dateTime(new Date(appointment.scheduledAt), { hour: "numeric", minute: "2-digit" }) })}</span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="size-3.5" aria-hidden />
                {appointment.city} · {appointment.center.replace(/_/g, " ")}
              </span>
              {appointment.reference && <span className="text-caption text-muted-foreground">{t("reference", { ref: appointment.reference })}</span>}
            </div>
          </div>
        )}

        {timeline?.shipments.map((s, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl bg-surface-sunken/70 p-4 text-body-sm">
            {s.status === "DELIVERED" ? <PackageCheck className="size-5 text-success" aria-hidden /> : <Truck className="size-5 text-secondary-text flip-rtl" aria-hidden />}
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium">{t(`shipment.${s.direction}`)}</span>
              <span className="text-caption text-muted-foreground">
                {s.carrier}
                {s.trackingNumber && (
                  <>
                    {" · "}
                    <span dir="ltr" className="font-mono">
                      {s.trackingNumber}
                    </span>
                  </>
                )}
              </span>
            </div>
            <Badge tone={s.status === "DELIVERED" ? "success" : s.status === "FAILED" ? "danger" : "info"}>{t(`shipmentStatus.${s.status}`)}</Badge>
          </div>
        ))}
      </div>
    </Section>
  );
}
