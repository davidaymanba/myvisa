"use client";

import type { AuditLogRecord, ContactMessageRecord, CountryListItem, Paginated, ReportOverview } from "@myvisa/shared";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Globe2, Inbox, Stamp, TriangleAlert, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { PassportStamp } from "@/components/brand/passport-stamp";
import { Counter } from "@/components/motion/counter";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { Spotlight } from "@/components/motion/spotlight";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api/client";
import { AuditFeed } from "./audit-feed";
import { AdminPageHeader } from "./page-header";
import { LiveStrip } from "./reports/reports-view";
import { adminKeys, useCan, useMe } from "./use-admin";

export function AdminOverview() {
  const t = useTranslations("admin.overview");
  const locale = useLocale();
  const can = useCan();
  const { data: me } = useMe();
  const countries = useQuery({ queryKey: adminKeys.countries, queryFn: () => api<CountryListItem[]>("/admin/countries") });
  const nationalityList = useQuery({ queryKey: adminKeys.nationalities, queryFn: () => api<CountryListItem[]>("/admin/countries?kind=nationality") });
  const audit = useQuery({ queryKey: [...adminKeys.audit, "recent"], queryFn: () => api<Paginated<AuditLogRecord>>("/admin/audit-logs?take=6"), enabled: can("audit:read") });
  const ops = useQuery({ queryKey: ["admin", "reports", "live"], queryFn: () => api<ReportOverview["live"]>("/admin/reports/live"), enabled: can("orders:read"), refetchInterval: 60_000 });
  const inbox = useQuery({ queryKey: adminKeys.inbox("open"), queryFn: () => api<Paginated<ContactMessageRecord>>("/admin/contact-messages?status=open&take=100"), enabled: can("contact:read") });

  const live = countries.data?.filter((c) => c.isDestination && c.isActive) ?? [];
  const visas = live.reduce((n, c) => n + c.serviceCount, 0);
  const name = (locale === "ar" ? me?.fullNameAr : me?.fullNameEn) ?? "";

  return (
    <>
      <AdminPageHeader index="01" eyebrow={t("eyebrow")} title={t("greeting")} accent={name || " "} lead={t("lead")} />

      {can("orders:read") && <div className="mb-8">{ops.data ? <LiveStrip live={ops.data} /> : <Skeleton className="h-44 rounded-[1.75rem]" />}</div>}

      <Stagger className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" stagger={0.08}>
        <Stat icon={<Globe2 />} label={t("destinations")} value={countries.data ? live.length : undefined} tone="gold" />
        <Stat icon={<Stamp />} label={t("visas")} value={countries.data ? visas : undefined} tone="teal" />
        <Stat icon={<Users />} label={t("nationalities")} value={nationalityList.data?.length} tone="ink" />
        <Stat icon={<Inbox />} label={t("inbox")} value={inbox.data ? inbox.data.items.length : can("contact:read") ? undefined : 0} tone="ink" href="/admin/inbox" />
      </Stagger>

      <div className="mt-10 grid gap-6 xl:grid-cols-12">
        <section className="min-w-0 rounded-[2rem] border border-border bg-surface p-5 shadow-sm sm:p-8 xl:col-span-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <h2 className="font-display text-heading">{t("recent")}</h2>
            {can("audit:read") && (
              <Link href="/admin/audit" className="-my-1.5 inline-flex items-center gap-1 py-1.5 text-body-sm font-medium text-secondary-text hover:underline">
                {t("allActivity")}
                <ArrowUpRight className="size-4 flip-rtl" aria-hidden />
              </Link>
            )}
          </div>
          {audit.isLoading ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-12 rounded-2xl" />
              ))}
            </div>
          ) : audit.data?.items.length ? (
            <AuditFeed items={audit.data.items} compact />
          ) : (
            <p className="py-10 text-center text-body-sm text-muted-foreground">{t("noActivity")}</p>
          )}
        </section>

        <div className="flex min-w-0 flex-col gap-6 xl:col-span-5">
          <section data-surface="dark" className="dark relative isolate overflow-hidden rounded-[2rem] bg-ink-950 p-6 text-foreground sm:p-8">
            <div aria-hidden className="absolute -end-10 -top-16 -z-10 size-64 animate-drift rounded-full bg-teal-500/30 blur-[80px]" />
            <p className="eyebrow text-gold-300">{t("jump")}</p>
            <div className="mt-5 flex flex-col gap-3">
              <JumpLink href="/admin/destinations" label={t("editDestinations")} />
              {can("settings:read") && <JumpLink href="/admin/settings" label={t("editSettings")} />}
            </div>
            <PassportStamp shape="oval" tone="gold" top="OPERATIONS" bottom="RIYADH" code="RUH" rotate={-14} className="pointer-events-none absolute -bottom-14 -end-12 w-32 opacity-30 [&_svg]:mix-blend-normal" />
          </section>

          <section className="flex gap-4 rounded-[2rem] border border-warning/30 bg-warning-soft p-6">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
            <div className="flex flex-col gap-1">
              <h2 className="font-medium text-warning">{t("placeholders")}</h2>
              <p className="text-body-sm text-foreground/80">{t("placeholdersBody")}</p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function Stat({ icon, label, value, tone, href }: { icon: ReactNode; label: string; value: number | undefined; tone: "gold" | "teal" | "ink"; href?: string }) {
  const body = (
    <Spotlight className="h-full rounded-[1.75rem] border border-border bg-surface p-4 shadow-sm transition-transform duration-500 hover:-translate-y-1 sm:p-6">
      <span className={`grid size-10 place-items-center rounded-2xl sm:size-12 [&_svg]:size-5 ${tone === "gold" ? "bg-gold-100 text-gold-800 dark:bg-gold-400/15 dark:text-gold-300" : tone === "teal" ? "bg-secondary text-secondary-foreground" : "bg-foreground text-background"}`}>{icon}</span>
      <div className="mt-5 font-display sm:mt-8 text-[clamp(2.5rem,2rem+2vw,3.75rem)] leading-none">{value === undefined ? <Skeleton className="h-12 w-20" /> : <Counter value={value} />}</div>
      <p className="mt-2 text-body-sm text-muted-foreground">{label}</p>
    </Spotlight>
  );
  return <StaggerItem>{href ? <Link href={href}>{body}</Link> : body}</StaggerItem>;
}

function JumpLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="group flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-body font-medium transition hover:border-gold-400/50 hover:bg-white/[0.08]">
      {label}
      <ArrowUpRight className="size-5 text-gold-300 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 flip-rtl" aria-hidden />
    </Link>
  );
}
