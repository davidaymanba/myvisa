"use client";

import { TRACKING_STEPS, formatMoney, trackingStepIndex, type AppLocale, type OrderStatus, type OrderView } from "@myvisa/shared";
import { ArrowUpRight, Plane } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Flag } from "@/components/brand/flag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { unsplash } from "@/lib/images";
import { cn } from "@/lib/utils";

export function statusTone(status: OrderStatus): "warning" | "success" | "neutral" | "gold" | "teal" {
  if (status === "ACTION_REQUIRED") return "warning";
  if (status === "DELIVERED") return "success";
  if (status === "CANCELLED" || status === "REFUNDED") return "neutral";
  if (status === "DRAFT" || status === "PENDING_PAYMENT") return "gold";
  return "teal";
}

/** Where the order's main button leads, and what it says. */
export function orderAction(order: Pick<OrderView, "id" | "status">): { href: string; key: "continue" | "pay" | "resolve" | "view" } {
  if (order.status === "DRAFT") return { href: `/apply?order=${order.id}`, key: "continue" };
  if (order.status === "PENDING_PAYMENT") return { href: `/apply?order=${order.id}&step=payment`, key: "pay" };
  if (order.status === "ACTION_REQUIRED") return { href: `/account/orders/${order.id}#action`, key: "resolve" };
  return { href: `/account/orders/${order.id}`, key: "view" };
}

/** The six milestones as dots; the current one pulses. */
export function MilestoneDots({ status, className }: { status: OrderStatus; className?: string }) {
  const current = trackingStepIndex(status);
  const t = useTranslations("ui.boardingPass");
  return (
    <ol className={cn("flex items-center gap-1", className)} aria-label={t(`statuses.${status}`)}>
      {TRACKING_STEPS.map((step, i) => {
        const done = i < current || (status === "DELIVERED" && i === current);
        const now = i === current && status !== "DELIVERED";
        return (
          <li key={step} className="flex flex-1 items-center gap-1" aria-hidden>
            <span className={cn("relative size-2 shrink-0 rounded-full", done ? "bg-secondary" : now ? (status === "ACTION_REQUIRED" ? "bg-warning" : "bg-primary") : "bg-border-strong")}>
              {now && <span className={cn("absolute -inset-1 animate-pulse-ring rounded-full", status === "ACTION_REQUIRED" ? "bg-warning/40" : "bg-primary/40")} />}
            </span>
            {i < TRACKING_STEPS.length - 1 && <span className={cn("h-0.5 flex-1 rounded-full", i < current ? "bg-secondary" : "bg-border")} />}
          </li>
        );
      })}
    </ol>
  );
}

/** An order as a ticket stub: destination photo + IATA on the stub, details and the next step on the body. */
export function OrderTicket({ order, index = 0, unread = 0 }: { order: OrderView; index?: number; unread?: number }) {
  const t = useTranslations("account.orders");
  const tb = useTranslations("ui.boardingPass");
  const tc = useTranslations("account.common");
  const locale = useLocale() as AppLocale;
  const format = useFormatter();
  const dest = order.service.destination;
  const action = orderAction(order);

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: index * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      layout
      className="group relative isolate flex flex-col overflow-hidden rounded-[1.75rem] border border-border bg-surface shadow-sm transition-[box-shadow,transform] duration-500 hover:-translate-y-1 hover:shadow-lg sm:flex-row"
    >
      {/* Stub */}
      <div className="relative h-36 shrink-0 overflow-hidden bg-ink-900 sm:h-auto sm:w-48">
        {dest?.imageId && <Image src={unsplash(dest.imageId, 600)} alt="" fill sizes="(min-width: 640px) 192px, 100vw" className="object-cover opacity-80 transition-transform duration-[1.4s] ease-out group-hover:scale-110" />}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/30 to-transparent" />
        <div className="relative flex h-full flex-col justify-between p-4 text-sand-100">
          {dest ? <Flag code={dest.iso2} className="h-5 w-7 rounded-sm shadow" /> : <Plane className="size-5 flip-rtl" aria-hidden />}
          <div className="flex flex-col">
            <span lang="en" className="font-display text-display-md leading-none">
              {dest?.iata ?? "···"}
            </span>
            <span className="truncate text-body-sm text-sand-100/80">{dest?.name[locale] ?? order.service.name[locale]}</span>
          </div>
        </div>
      </div>

      {/* Tear line */}
      <div className="relative hidden w-0 sm:block" aria-hidden>
        <span className="absolute -top-3 start-0 size-6 -translate-x-1/2 rounded-full border border-border bg-background rtl:translate-x-1/2" />
        <span className="absolute -bottom-3 start-0 size-6 -translate-x-1/2 rounded-full border border-border bg-background rtl:translate-x-1/2" />
        <span className="absolute inset-y-4 start-0 border-s-2 border-dashed border-border" />
      </div>

      {/* Body */}
      <div className="flex min-w-0 flex-1 flex-col gap-4 p-5 sm:ps-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="truncate font-display text-title">
              <Link href={`/account/orders/${order.id}`} className="after:absolute after:inset-0 after:z-[1] after:rounded-[1.75rem] focus-visible:outline-none focus-visible:after:ring-4 focus-visible:after:ring-ring/20">
                {order.service.name[locale]}
              </Link>
            </h3>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-muted-foreground">
              <span lang="en" dir="ltr" className="font-mono font-semibold tracking-wider text-foreground">
                {order.number}
              </span>
              <span>{tc("travelers", { count: order.travelers.length })}</span>
              <span>{t("created", { date: format.dateTime(new Date(order.createdAt), { day: "numeric", month: "short", year: "numeric" }) })}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unread > 0 && <Badge tone="info">{t("unread", { count: unread })}</Badge>}
            <Badge tone={statusTone(order.status)} dot>
              {tb(`statuses.${order.status}`)}
            </Badge>
          </div>
        </div>

        <MilestoneDots status={order.status} className="max-w-md" />

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
          <span className="tabular font-display text-heading">{formatMoney(order.price.total, locale, { fractionDigits: 2 })}</span>
          <Button asChild size="sm" variant={action.key === "view" ? "outline" : "primary"} className="relative z-10">
            <Link href={action.href}>
              {t(action.key)}
              <ArrowUpRight className="flip-rtl" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
