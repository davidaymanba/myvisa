"use client";

import { formatMoney, type AdminOrderDetail, type AppLocale, type OrderStatus } from "@myvisa/shared";
import { AlarmClock, ArrowLeft, ArrowUpRight, MessageCircle, Phone, Route, UserRound } from "lucide-react";
import { motion } from "motion/react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { MessagesPanel } from "@/components/account/messages-panel";
import { JourneyLog, TravelersSection } from "@/components/account/order-sections";
import { statusTone } from "@/components/account/order-ticket";
import { Flag } from "@/components/brand/flag";
import { PassportStamp } from "@/components/brand/passport-stamp";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { useCan, useMe } from "../use-admin";
import { AppointmentPanel, DocumentReview, NotesPanel, Panel, PaymentsPanel, ShippingPanel } from "./desk-panels";
import { MoveDialog } from "./move-dialog";
import { moveOrder, useAgents, useDesk, useDeskMutation, useDue } from "./use-orders";

const UNASSIGNED = "none";

export function OrderDesk({ id }: { id: string }) {
  const t = useTranslations("admin.desk");
  const tc = useTranslations("admin.common");
  const desk = useDesk(id);

  if (desk.isError) return <ErrorState icon={<Route />} title={tc("loadError")} onRetry={() => desk.refetch()} retryLabel={tc("retry")} className="mt-10" />;
  if (!desk.data)
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-48 rounded-[2rem]" />
        <div className="grid gap-6 xl:grid-cols-12">
          <Skeleton className="h-[32rem] rounded-[1.75rem] xl:col-span-8" />
          <Skeleton className="h-[32rem] rounded-[1.75rem] xl:col-span-4" />
        </div>
      </div>
    );
  const d = desk.data;
  const appointmentRelevant = d.order.service.requiresAppointment || d.timeline.appointment;
  const shippingRelevant = ["SUBMITTED_TO_EMBASSY", "DECISION_ISSUED", "DELIVERED", "APPOINTMENT_BOOKED"].includes(d.order.status) || d.timeline.shipments.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/orders" className="group inline-flex w-fit items-center gap-2 text-body-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1 rtl:rotate-180 rtl:group-hover:translate-x-1" aria-hidden />
        {t("back")}
      </Link>
      <DeskHeader desk={d} />
      <NextStep desk={d} />
      <div className="grid items-start gap-6 xl:grid-cols-12">
        <div className="flex flex-col gap-6 xl:col-span-7">
          <DocumentReview desk={d} />
          {appointmentRelevant && <AppointmentPanel key={d.timeline.appointment?.scheduledAt ?? "new"} desk={d} />}
          {shippingRelevant && <ShippingPanel desk={d} />}
          <TravelersSection order={d.order} />
          <JourneyLog timeline={d.timeline} />
        </div>
        <div className="flex flex-col gap-6 xl:sticky xl:top-6 xl:col-span-5">
          <MessagesPanel orderId={d.order.id} viewer="STAFF" />
          <NotesPanel desk={d} />
          <PaymentsPanel desk={d} />
        </div>
      </div>
    </div>
  );
}

function DeskHeader({ desk }: { desk: AdminOrderDetail }) {
  const t = useTranslations("admin.desk");
  const tb = useTranslations("ui.boardingPass");
  const td = useTranslations("admin.decisions");
  const locale = useLocale() as AppLocale;
  const format = useFormatter();
  const due = useDue();
  const { order, customer } = desk;
  const dest = order.service.destination;
  const wa = customer.phone.replace(/\D/g, "");

  return (
    <motion.header initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} data-surface="dark" className="dark relative isolate overflow-hidden rounded-[2rem] bg-ink-950 p-6 text-foreground sm:p-8">
      <div aria-hidden className="absolute -end-20 -top-24 -z-10 size-80 animate-drift rounded-full bg-teal-500/30 blur-[90px]" />
      <div aria-hidden className="absolute -bottom-32 start-1/3 -z-10 size-72 animate-drift rounded-full bg-gold-400/15 blur-[90px] [animation-delay:-5s]" />
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {dest && <Flag code={dest.iso2} className="h-5 w-7 rounded-sm" />}
            <span lang="en" dir="ltr" className="font-mono text-body-sm font-semibold tracking-[0.2em] text-gold-200">
              {order.number}
            </span>
            <Badge tone={statusTone(order.status)} dot>
              {tb(`statuses.${order.status}`)}
            </Badge>
            {desk.slaDueAt && (
              <Badge tone={desk.overdue ? "danger" : "neutral"} className={cn(desk.overdue && "animate-pulse")}>
                <AlarmClock aria-hidden />
                {t("sla")} {due(desk.slaDueAt)}
              </Badge>
            )}
          </div>
          <h1 className="font-display text-[clamp(2rem,1.4rem+2.4vw,3.25rem)] leading-tight">{dest?.name[locale] ?? order.service.name[locale]}</h1>
          <p className="text-foreground/70">
            {order.service.name[locale]} · {formatMoney(order.price.total, locale, { fractionDigits: 2 })} · {format.dateTime(new Date(order.createdAt), { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur sm:min-w-80">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-200 to-gold-500 text-ink-950">
              <UserRound className="size-5" aria-hidden />
            </span>
            <div className="flex min-w-0 flex-col">
              <Link href={`/admin/customers/${customer.id}`} className="truncate font-medium hover:underline">
                {customer.name ?? customer.phone}
              </Link>
              <span className="text-caption text-foreground/60">
                <span dir="ltr">{customer.phone}</span> · {t("ordersCount", { count: customer.orders })}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline" className="flex-1 border-white/15">
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
                <MessageCircle aria-hidden />
                WhatsApp
              </a>
            </Button>
            <Button asChild size="sm" variant="outline" className="flex-1 border-white/15">
              <a href={`tel:${customer.phone}`}>
                <Phone aria-hidden />
              </a>
            </Button>
          </div>
          <AssigneePicker desk={desk} />
        </div>
      </div>
      {desk.decision && (
        <motion.div className="pointer-events-none absolute end-6 top-6 hidden w-28 sm:block lg:end-96 lg:top-8" initial={{ scale: 2.2, opacity: 0, rotate: -25 }} animate={{ scale: 1, opacity: 1, rotate: -10 }} transition={{ delay: 0.4, type: "spring", stiffness: 260, damping: 14 }}>
          <PassportStamp shape={desk.decision === "REJECTED" ? "rect" : "circle"} tone={desk.decision === "REJECTED" ? "danger" : "gold"} top={td(desk.decision)} bottom="EMBASSY" code={dest?.iata ?? "✓"} className="w-full" />
        </motion.div>
      )}
    </motion.header>
  );
}

function AssigneePicker({ desk }: { desk: AdminOrderDetail }) {
  const t = useTranslations("admin.desk");
  const agents = useAgents();
  const { data: me } = useMe();
  const can = useCan();
  const assign = useDeskMutation(desk.order.id, (assigneeId: string | null) => api<AdminOrderDetail>(`/admin/orders/${desk.order.id}/assign`, { method: "POST", body: { assigneeId } }), t("saved"));
  if (!can("orders:write")) return <p className="text-caption text-foreground/60">{t("assignee")}: {desk.assignee?.name ?? "—"}</p>;
  return (
    <div className="flex items-center gap-2">
      <Select value={desk.assignee?.id ?? UNASSIGNED} onValueChange={(v) => assign.mutate(v === UNASSIGNED ? null : v)} disabled={assign.isPending}>
        <SelectTrigger className="h-10 flex-1 border-white/15 bg-white/5" aria-label={t("assignee")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED}>{t("unassign")}</SelectItem>
          {(agents.data ?? (desk.assignee ? [desk.assignee] : [])).map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {me && desk.assignee?.id !== me.id && (
        <Button size="sm" className="h-10" onClick={() => assign.mutate(me.id)} loading={assign.isPending}>
          {t("assignToMe")}
        </Button>
      )}
    </div>
  );
}

/** The allowed next statuses as big buttons — the state machine made visible. */
function NextStep({ desk }: { desk: AdminOrderDetail }) {
  const t = useTranslations("admin.desk");
  const tb = useTranslations("ui.boardingPass");
  const can = useCan();
  const [to, setTo] = useState<OrderStatus | null>(null);
  const move = useDeskMutation(desk.order.id, (v: { customerNote: string | null; decision: string | null }) => moveOrder(desk.order.id, { to: to!, ...v }), t("moved"));
  if (!can("orders:write")) return null;
  const forward = desk.nextStatuses.filter((s) => s !== "CANCELLED" && s !== "REFUNDED");
  // REFUNDED follows the refund itself (payments panel), never a button.
  const exits = desk.nextStatuses.filter((s) => s === "CANCELLED");

  return (
    <Panel icon={<Route />} title={t("nextStep")} lead={desk.slaDueAt ? undefined : t("noSla")}>
      {desk.nextStatuses.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">{t("noNext")}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {forward.map((s, i) => (
            <motion.div key={s} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Button variant={i === 0 ? "primary" : "outline"} onClick={() => setTo(s)}>
                {tb(`statuses.${s}`)}
                <ArrowUpRight className="flip-rtl" aria-hidden />
              </Button>
            </motion.div>
          ))}
          <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />
          {exits.map((s) => (
            <Button key={s} variant="ghost" className="text-danger hover:bg-danger-soft" onClick={() => setTo(s)}>
              {tb(`statuses.${s}`)}
            </Button>
          ))}
        </div>
      )}
      <MoveDialog to={to} onClose={() => setTo(null)} onConfirm={(v) => move.mutate(v, { onSuccess: () => setTo(null) })} pending={move.isPending} />
    </Panel>
  );
}
