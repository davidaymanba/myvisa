"use client";

import type { AppLocale, OrderView } from "@myvisa/shared";
import { AlertTriangle, ArrowUpRight, Bell, BookUser, FileStack, Hourglass, Plane, Plus, Ticket } from "lucide-react";
import { motion } from "motion/react";
import { useFormatter, useLocale, useNow, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { BoardingPass } from "@/components/brand/boarding-pass";
import { PassportStamp } from "@/components/brand/passport-stamp";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { FadeIn } from "@/components/motion/fade-in";
import { SplitReveal } from "@/components/motion/split-reveal";
import { Spotlight } from "@/components/motion/spotlight";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { OrderTicket, orderAction } from "./order-ticket";
import { LoadError } from "./page-header";
import { ExpiryBadge } from "./passport-card";
import { isIn, useNotifications, useOrders, useProfile, useSummary, useTravelers } from "./use-account";

const EASE = [0.16, 1, 0.3, 1] as const;

export function Overview() {
  const t = useTranslations("account.overview");
  const locale = useLocale() as AppLocale;
  const now = useNow({ updateInterval: 60_000 });
  const format = useFormatter();
  const profile = useProfile();
  const summary = useSummary();
  const orders = useOrders();

  const name = (locale === "en" ? (profile.data?.fullNameEn ?? profile.data?.fullNameAr) : (profile.data?.fullNameAr ?? profile.data?.fullNameEn))?.split(" ")[0];
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Riyadh" }).format(now));
  const active = orders.data?.filter((o) => isIn("active", o.status)) ?? [];
  const drafts = orders.data?.filter((o) => isIn("drafts", o.status)) ?? [];
  const needsAction = active.filter((o) => o.status === "ACTION_REQUIRED");
  const [lead, ...rest] = [...needsAction, ...active.filter((o) => o.status !== "ACTION_REQUIRED")];

  return (
    <div className="flex flex-col gap-10">
      {/* Greeting with today's "entry stamp" */}
      <header className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <FadeIn>
            <p className="eyebrow text-accent-text">{hour < 12 ? t("morning") : t("evening")}</p>
          </FadeIn>
          {profile.isLoading ? (
            <Skeleton className="h-14 w-72" />
          ) : (
            <SplitReveal as="h1" trigger="mount" className="text-[clamp(2.4rem,1.4rem+3.6vw,4.5rem)] font-medium leading-[1] tracking-[-0.03em] [:lang(ar)_&]:leading-[1.25]" lines={[{ text: name ? t("hello", { name }) : t("helloAnon") }]} />
          )}
          <FadeIn delay={0.2}>
            <p className="text-body-lg text-muted-foreground">{t("lead")}</p>
          </FadeIn>
        </div>
        <motion.div className="hidden w-36 shrink-0 sm:block" initial={{ scale: 2, opacity: 0, rotate: 20 }} animate={{ scale: 1, opacity: 1, rotate: -8 }} transition={{ delay: 0.5, type: "spring", stiffness: 240, damping: 15 }}>
          <PassportStamp shape="oval" tone="teal" top="MYVISA · ENTRY" bottom="WELCOME" code="RUH" caption={format.dateTime(now, { day: "2-digit", month: "short", year: "numeric" })} className="w-full" />
        </motion.div>
      </header>

      {needsAction.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6, ease: EASE }}>
          <Link href={orderAction(needsAction[0]!).href} className="group relative flex items-center gap-4 overflow-hidden rounded-[1.75rem] border-2 border-warning/50 bg-warning-soft p-5 transition-shadow hover:shadow-md sm:p-6">
            <span className="absolute inset-y-0 start-0 w-1.5 bg-warning" aria-hidden />
            <motion.span animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 1.6, repeat: Infinity }} className="grid size-12 shrink-0 place-items-center rounded-2xl bg-warning text-white">
              <AlertTriangle className="size-5" aria-hidden />
            </motion.span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-display text-heading">{t("actionTitle", { count: needsAction.length })}</span>
              <span className="text-body-sm text-muted-foreground">{t("actionLead")}</span>
            </div>
            <span className="hidden items-center gap-1 font-medium text-warning sm:flex">
              {t("actionCta")}
              <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 flip-rtl" aria-hidden />
            </span>
          </Link>
        </motion.div>
      )}

      {/* Counters */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat index={0} href="/account/orders" icon={<Ticket />} label={t("stats.active")} value={summary.data?.activeOrders} />
        <Stat index={1} href="/account/travelers" icon={<BookUser />} label={t("stats.travelers")} value={summary.data?.travelers} />
        <Stat index={2} href="/account/documents" icon={<FileStack />} label={t("stats.documents")} value={summary.data?.documents} />
        <Stat index={3} href="/account/travelers" icon={<Hourglass />} label={t("stats.expiring")} value={summary.data?.expiringSoon} warn={(summary.data?.expiringSoon ?? 0) > 0} />
      </div>

      {/* Trips in progress */}
      <section className="flex flex-col gap-5">
        <SectionTitle title={t("activeTitle")} href={active.length > 1 ? "/account/orders" : undefined} />
        {orders.isError ? (
          <LoadError onRetry={() => orders.refetch()} />
        ) : orders.isLoading ? (
          <Skeleton className="h-80 rounded-3xl" />
        ) : lead ? (
          <div className="flex flex-col gap-4">
            <LeadPass order={lead} />
            {rest.slice(0, 3).map((o, i) => (
              <OrderTicket key={o.id} order={o} index={i + 1} />
            ))}
          </div>
        ) : (
          <NoTrips />
        )}
      </section>

      {drafts.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionTitle title={t("draftsTitle")} />
          <div className="flex flex-col gap-4">
            {drafts.slice(0, 2).map((o, i) => (
              <OrderTicket key={o.id} order={o} index={i} />
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <LatestUpdates />
        <FamilyStrip />
      </div>
    </div>
  );
}

function SectionTitle({ title, href }: { title: string; href?: string }) {
  const t = useTranslations("account.common");
  return (
    <div className="flex items-end justify-between gap-3">
      <h2 className="font-display text-display-md">{title}</h2>
      {href && (
        <Link href={href} className="text-body-sm font-medium text-secondary-text hover:underline">
          {t("seeAll")}
        </Link>
      )}
    </div>
  );
}

function Stat({ icon, label, value, href, index, warn }: { icon: ReactNode; label: string; value: number | undefined; href: string; index: number; warn?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + index * 0.07, duration: 0.6, ease: EASE }}>
      <Spotlight className="h-full rounded-3xl">
        <Link href={href} className={cn("group flex h-full flex-col gap-4 rounded-3xl border bg-surface p-5 transition-colors", warn ? "border-warning/40" : "border-border hover:border-foreground/25")}>
          <span className={cn("grid size-10 place-items-center rounded-2xl transition-transform duration-500 group-hover:-rotate-6 [&_svg]:size-[18px]", warn ? "bg-warning-soft text-warning" : "bg-secondary/10 text-secondary-text")}>{icon}</span>
          <div className="flex flex-col gap-1">
            {value === undefined ? <Skeleton className="h-9 w-12" /> : <AnimatedNumber value={value} format={(n) => String(Math.round(n))} className="tabular font-display text-display-md leading-none" />}
            <span className="text-body-sm text-muted-foreground">{label}</span>
          </div>
        </Link>
      </Spotlight>
    </motion.div>
  );
}

/** The most urgent order, as a full boarding pass. */
function LeadPass({ order }: { order: OrderView }) {
  const locale = useLocale() as AppLocale;
  const reached = order.submittedAt ? { RECEIVED: order.submittedAt } : {};
  return (
    <motion.div initial={{ opacity: 0, y: 40, rotate: -1.5 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: 0.35, duration: 0.9, ease: EASE }}>
      <Link href={orderAction(order).href} className="block rounded-3xl transition-transform duration-500 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-ring">
        <BoardingPass
          orderNumber={order.number}
          from={{ code: "RUH", city: locale === "ar" ? "الرياض" : "Riyadh" }}
          to={{ code: order.service.destination?.iata ?? "···", city: order.service.destination?.name[locale] ?? "" }}
          serviceName={order.service.name[locale]}
          travelers={order.travelers.length}
          status={order.status}
          reachedAt={reached}
        />
      </Link>
    </motion.div>
  );
}

function NoTrips() {
  const t = useTranslations("account.overview");
  return (
    <div data-surface="dark" className="dark relative isolate overflow-hidden rounded-[2rem] bg-ink-950 p-8 text-foreground sm:p-12">
      <div aria-hidden className="absolute -end-24 -top-24 -z-10 size-96 animate-drift rounded-full bg-teal-500/30 blur-[90px]" />
      <div aria-hidden className="absolute -bottom-32 -start-10 -z-10 size-80 animate-drift rounded-full bg-gold-400/20 blur-[90px] [animation-delay:-5s]" />
      <motion.div aria-hidden className="absolute end-10 top-10 hidden text-gold-300/60 sm:block" animate={{ x: [0, 30, 0], y: [0, -12, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}>
        <Plane className="size-16 -rotate-12 flip-rtl" strokeWidth={1} />
      </motion.div>
      <div className="flex max-w-lg flex-col gap-4">
        <h3 className="font-display text-display-md">{t("noActive")}</h3>
        <p className="text-body-lg text-foreground/70">{t("noActiveLead")}</p>
        <Button asChild size="lg" className="w-fit">
          <Link href="/apply">
            {t("startCta")}
            <ArrowUpRight className="flip-rtl" aria-hidden />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function LatestUpdates() {
  const t = useTranslations("account.overview");
  const tc = useTranslations("account.common");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const notifications = useNotifications();
  const items = notifications.data?.pages[0]?.items.slice(0, 5) ?? [];
  return (
    <section className="flex flex-col gap-4 rounded-[1.75rem] border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-heading">
          <Bell className="size-5 text-secondary-text" aria-hidden />
          {t("latest")}
        </h2>
        <Link href="/account/notifications" className="text-body-sm font-medium text-secondary-text hover:underline">
          {tc("seeAll")}
        </Link>
      </div>
      {notifications.isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 rounded-2xl" />
          ))}
        </div>
      ) : items.length ? (
        <ul className="flex flex-col">
          {items.map((n, i) => (
            <motion.li key={n.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="border-b border-border last:border-0">
              <Link href={n.href ?? "/account/notifications"} className="flex items-start gap-3 py-3">
                <span className={cn("mt-2 size-2 shrink-0 rounded-full", n.readAt ? "bg-border-strong" : "bg-primary")} aria-hidden />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={cn("truncate text-body-sm", !n.readAt && "font-semibold")}>{n.title}</span>
                  <span className="text-caption text-muted-foreground">{format.relativeTime(new Date(n.createdAt), now)}</span>
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-body-sm text-muted-foreground">{t("noLatest")}</p>
      )}
    </section>
  );
}

function FamilyStrip() {
  const t = useTranslations("account.overview");
  const travelers = useTravelers();
  return (
    <section className="relative flex flex-col gap-4 overflow-hidden rounded-[1.75rem] border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-heading">
          <BookUser className="size-5 text-secondary-text" aria-hidden />
          {t("familyTitle")}
        </h2>
        <Button asChild size="sm" variant="outline">
          <Link href="/account/travelers">
            <Plus aria-hidden />
            {t("addTraveler")}
          </Link>
        </Button>
      </div>
      {travelers.isLoading ? (
        <Skeleton className="h-24 rounded-2xl" />
      ) : travelers.data?.length ? (
        <ul className="flex flex-col gap-2">
          {travelers.data.slice(0, 4).map((tr, i) => (
            <motion.li key={tr.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }} className="flex items-center gap-3 rounded-2xl bg-surface-sunken/70 p-3">
              <span lang="en" className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-teal-300 to-teal-700 font-display text-white">
                {tr.givenNameEn.charAt(0)}
                {tr.surnameEn.charAt(0)}
              </span>
              <span lang="en" dir="ltr" className="min-w-0 flex-1 truncate font-medium rtl:text-end">
                {tr.givenNameEn} {tr.surnameEn}
              </span>
              <ExpiryBadge date={tr.passportExpiry} />
            </motion.li>
          ))}
        </ul>
      ) : (
        <p className="text-body-sm text-muted-foreground">{t("familyLead")}</p>
      )}
    </section>
  );
}
