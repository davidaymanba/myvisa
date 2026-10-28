"use client";

import { formatMoney, type AppLocale, type ReportOverview } from "@myvisa/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AlarmClock, ArrowDownRight, ArrowUpRight, BarChart3, Download, FileSearch, Inbox, MessageSquareText, Minus, UserRound, UserX } from "lucide-react";
import { motion } from "motion/react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useMemo, useState, type ReactNode } from "react";
import { Flag } from "@/components/brand/flag";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "../page-header";

/**
 * Chart colours, validated with the dataviz palette checker (lightness band, chroma floor, CVD and
 * normal-vision separation, 3:1 contrast) against the light card (#FFFFFF) and the dark card (#0E1C33).
 * Slots 1 and 3 are the brand turquoise and blue.
 * Slot 1 is every single-series chart; the three slots are the revenue split, always in this order.
 */
const CHART_VARS = "[--chart-1:#1B8588] [--chart-2:#B08A35] [--chart-3:#2B4FA1] dark:[--chart-1:#34C1C3] dark:[--chart-3:#7C9BDB]";

const riyadhToday = () => new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10);
const shiftDay = (day: string, n: number) => new Date(new Date(`${day}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);
const PRESETS = [7, 30, 90, 365] as const;

/** Clean axis ticks: 0 and three round steps above the max. */
function ticks(max: number): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / 3;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw)!;
  return [0, step, step * 2, step * 3];
}

export function ReportsView() {
  const t = useTranslations("admin.reports");
  const tc = useTranslations("admin.common");
  const [range, setRange] = useState<{ from: string; to: string }>(() => ({ from: shiftDay(riyadhToday(), -29), to: riyadhToday() }));
  const report = useQuery({
    queryKey: ["admin", "reports", range],
    queryFn: () => api<ReportOverview>(`/admin/reports/overview?from=${range.from}&to=${range.to}`),
    placeholderData: keepPreviousData,
  });
  const days = Math.round((new Date(range.to).getTime() - new Date(range.from).getTime()) / 86_400_000) + 1;

  return (
    <div className={CHART_VARS}>
      <AdminPageHeader
        index="04"
        eyebrow={t("eyebrow")}
        title={t("title")}
        lead={t("lead")}
        actions={
          <a href={`/api/v1/admin/reports/orders.csv?from=${range.from}&to=${range.to}`} className="inline-flex h-11 items-center gap-2 rounded-full border border-border-strong px-5 font-medium transition-colors hover:bg-muted">
            <Download className="size-[18px]" aria-hidden />
            {t("export")}
          </a>
        }
      />

      {/* Filters: one row, above every chart. */}
      <div className="mb-8 flex flex-wrap items-end gap-3">
        <div className="flex rounded-full bg-muted p-1" role="radiogroup">
          {PRESETS.map((p) => {
            const on = days === p && range.to === riyadhToday();
            return (
              <button key={p} type="button" role="radio" aria-checked={on} onClick={() => setRange({ from: shiftDay(riyadhToday(), -(p - 1)), to: riyadhToday() })} className={cn("relative isolate rounded-full px-4 py-2 text-body-sm font-medium transition-colors", on ? "text-background" : "text-muted-foreground hover:text-foreground")}>
                {on && <motion.span layoutId="report-range" className="absolute inset-0 -z-10 rounded-full bg-foreground" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                {t(`ranges.${p}`)}
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-2 text-body-sm text-muted-foreground">
          {t("from")}
          <Input type="date" dir="ltr" className="h-10 w-40" value={range.from} max={range.to} onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))} />
        </label>
        <label className="flex items-center gap-2 text-body-sm text-muted-foreground">
          {t("to")}
          <Input type="date" dir="ltr" className="h-10 w-40" value={range.to} min={range.from} max={riyadhToday()} onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))} />
        </label>
      </div>

      {report.isError ? (
        <ErrorState icon={<BarChart3 />} title={tc("loadError")} onRetry={() => report.refetch()} retryLabel={tc("retry")} />
      ) : !report.data ? (
        <div className="grid gap-4 lg:grid-cols-4">
          <Skeleton className="h-48 rounded-[1.75rem] lg:col-span-2" />
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-36 rounded-[1.75rem]" />
          ))}
        </div>
      ) : (
        <motion.div className={cn("flex flex-col gap-6 transition-opacity", report.isFetching && "opacity-60")}>
          <LiveStrip live={report.data.live} />
          <Kpis r={report.data} />
          <div className="grid gap-6 xl:grid-cols-12">
            <Card title={t("daily")} className="xl:col-span-8">
              <DailyColumns daily={report.data.daily} />
            </Card>
            <Card title={t("split")} className="xl:col-span-4">
              <Split r={report.data} />
            </Card>
            <Card title={t("funnel")} className="xl:col-span-6">
              <Funnel funnel={report.data.funnel} />
            </Card>
            <Card title={t("destinations")} className="xl:col-span-6">
              <Destinations rows={report.data.topDestinations} />
            </Card>
            <Card title={t("agents")} className="xl:col-span-12">
              <Agents rows={report.data.agents} />
            </Card>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Card({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className={cn("rounded-[1.75rem] border border-border bg-surface p-5 shadow-xs sm:p-6", className)}>
      <h2 className="mb-5 font-display text-title">{title}</h2>
      {children}
    </motion.section>
  );
}

const LIVE_ITEMS = [
  { key: "open", icon: Inbox, href: "/admin/orders" },
  { key: "overdue", icon: AlarmClock, href: "/admin/orders", alert: true },
  { key: "unassigned", icon: UserX, href: "/admin/orders" },
  { key: "pendingDocuments", icon: FileSearch, href: "/admin/orders" },
  { key: "unreadMessages", icon: MessageSquareText, href: "/admin/orders" },
  { key: "actionRequired", icon: UserRound, href: "/admin/orders" },
] as const;

/** Right now: what needs a human, not bound to the date range. */
export function LiveStrip({ live }: { live: ReportOverview["live"] }) {
  const t = useTranslations("admin.reports");
  return (
    <section data-surface="dark" className="dark relative isolate overflow-hidden rounded-[1.75rem] bg-ink-950 p-5 text-foreground sm:p-6">
      <div aria-hidden className="absolute -end-16 -top-20 -z-10 size-72 animate-drift rounded-full bg-teal-500/25 blur-[80px]" />
      <p className="eyebrow mb-4 flex items-center gap-2 text-gold-300">
        <span className="size-2 animate-pulse rounded-full bg-success" aria-hidden />
        {t("live")}
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {LIVE_ITEMS.map((item) => {
          const value = live[item.key];
          const Icon = item.icon;
          const hot = "alert" in item && value > 0;
          return (
            <li key={item.key}>
              <Link href={item.href} className={cn("flex flex-col gap-2 rounded-2xl border p-4 transition-colors hover:bg-white/[0.06]", hot ? "border-danger/60 bg-danger/10" : "border-white/10 bg-white/[0.03]")}>
                <Icon className={cn("size-4", hot ? "text-danger" : "text-foreground/60")} aria-hidden />
                <span className="tabular text-[2rem] font-semibold leading-none">{value}</span>
                <span className="text-caption text-foreground/60">{t(`liveItems.${item.key}`)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

type Kpi = { value: number | null; previous: number | null };

function Delta({ kpi, upIsGood }: { kpi: Kpi; upIsGood: boolean }) {
  const t = useTranslations("admin.reports");
  if (kpi.value === null || kpi.previous === null) return <span className="text-caption text-muted-foreground">{t("vsPrevious")}</span>;
  if (kpi.previous === 0) return <span className="text-caption text-muted-foreground">{t("vsPrevious")}</span>;
  const change = (kpi.value - kpi.previous) / Math.abs(kpi.previous);
  const flat = Math.abs(change) < 0.005;
  const good = flat ? null : change > 0 === upIsGood;
  const Icon = flat ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-1 text-caption font-medium", good === null ? "text-muted-foreground" : good ? "text-success" : "text-danger")} title={t("vsPrevious")}>
      <Icon className="size-3.5" aria-hidden />
      <span lang="en" dir="ltr">
        {flat ? "0%" : `${change > 0 ? "+" : "−"}${Math.abs(change * 100).toFixed(change > -1 && change < 1 ? 1 : 0)}%`}
      </span>
      <span className="font-normal text-muted-foreground">{t("vsPrevious")}</span>
    </span>
  );
}

function Kpis({ r }: { r: ReportOverview }) {
  const t = useTranslations("admin.reports");
  const locale = useLocale() as AppLocale;
  const money = (h: number) => formatMoney(h, locale, { fractionDigits: 0 });
  const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
  const k = r.kpis;
  const tiles: { key: string; label: string; value: string; kpi: Kpi; upIsGood: boolean }[] = [
    { key: "net", label: t("kpis.net"), value: money(k.netServiceHalalas.value), kpi: k.netServiceHalalas, upIsGood: true },
    { key: "paid", label: t("kpis.paidOrders"), value: String(k.paidOrders.value), kpi: k.paidOrders, upIsGood: true },
    { key: "conversion", label: t("kpis.conversion"), value: pct(k.conversion.value), kpi: k.conversion, upIsGood: true },
    { key: "average", label: t("kpis.average"), value: money(k.averageOrderHalalas.value), kpi: k.averageOrderHalalas, upIsGood: true },
    { key: "response", label: t("kpis.response"), value: k.medianFirstResponseHours.value === null ? "—" : t("hours", { value: k.medianFirstResponseHours.value.toFixed(1) }), kpi: k.medianFirstResponseHours, upIsGood: false },
    { key: "approval", label: t("kpis.approval"), value: pct(k.approvalRate.value), kpi: k.approvalRate, upIsGood: true },
    { key: "refunds", label: t("kpis.refunds"), value: money(k.refundsHalalas.value), kpi: k.refundsHalalas, upIsGood: false },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* The one hero figure. */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative flex flex-col justify-between gap-4 overflow-hidden rounded-[1.75rem] border border-gold-400/50 bg-gradient-to-br from-gold-50 to-surface p-6 sm:col-span-2 lg:row-span-2 dark:from-gold-400/10">
        <span className="text-body-sm font-medium text-muted-foreground">{t("kpis.revenue")}</span>
        <span className="tabular text-[clamp(3rem,2rem+3vw,4.5rem)] font-semibold leading-none tracking-tight">{money(k.revenueHalalas.value)}</span>
        <Delta kpi={k.revenueHalalas} upIsGood />
      </motion.div>
      {tiles.map((tile, i) => (
        <motion.div key={tile.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * (i + 1) }} className="flex flex-col gap-2 rounded-[1.75rem] border border-border bg-surface p-5">
          <span className="text-body-sm text-muted-foreground">{tile.label}</span>
          <span className="tabular text-[1.75rem] font-semibold leading-tight">{tile.value}</span>
          <Delta kpi={tile.kpi} upIsGood={tile.upIsGood} />
        </motion.div>
      ))}
    </div>
  );
}

/** Daily collections: one series, so no legend — the card title names it. Hover any day for the exact values. */
function DailyColumns({ daily }: { daily: ReportOverview["daily"] }) {
  const t = useTranslations("admin.reports");
  const locale = useLocale() as AppLocale;
  const format = useFormatter();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(0, ...daily.map((d) => d.revenueHalalas));
  const axis = ticks(max / 100).map((v) => v * 100);
  const top = axis[axis.length - 1]!;
  const compact = (h: number) => new Intl.NumberFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en", { notation: "compact", maximumFractionDigits: 1 }).format(h / 100);
  const day = (iso: string, opts: { weekday?: "short"; day: "numeric"; month: "short"; year?: "numeric" }) => format.dateTime(new Date(`${iso}T12:00:00Z`), { ...opts, timeZone: "UTC" });
  const labelEvery = Math.ceil(daily.length / 8);
  const peak = daily.reduce((best, d, i) => (d.revenueHalalas > (daily[best]?.revenueHalalas ?? -1) ? i : best), 0);

  if (max === 0) return <p className="py-16 text-center text-body-sm text-muted-foreground">{t("noData")}</p>;
  return (
    <div>
      <div dir="ltr" className="relative mt-4 flex h-64 gap-2">
        {/* Y axis */}
        <div className="relative w-10 shrink-0 text-end text-[0.68rem] text-muted-foreground">
          {axis.map((v) => (
            <span key={v} className="tabular absolute end-0 -translate-y-1/2" style={{ bottom: `${(v / top) * 100}%` }}>
              {compact(v)}
            </span>
          ))}
        </div>
        <div className="relative flex-1" onMouseLeave={() => setHover(null)}>
          {axis.map((v) => (
            <span key={v} aria-hidden className="absolute inset-x-0 h-px bg-border" style={{ bottom: `${(v / top) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end">
            {daily.map((d, i) => {
              const h = (d.revenueHalalas / top) * 100;
              return (
                <div key={d.date} className="relative flex h-full flex-1 cursor-default items-end justify-center" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${day(d.date, { day: "numeric", month: "short" })}: ${formatMoney(d.revenueHalalas, locale, { fractionDigits: 0 })}`}>
                  {hover === i && <span aria-hidden className="absolute inset-y-0 w-full rounded-md bg-foreground/[0.04]" />}
                  <motion.span
                    className="relative w-full max-w-6 rounded-t-[4px] bg-[var(--chart-1)]"
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%`, opacity: hover === null || hover === i ? 1 : 0.45 }}
                    transition={{ height: { delay: i * (0.4 / daily.length), duration: 0.6, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 0.15 } }}
                    style={{ marginInline: daily.length > 60 ? 0 : 1 }}
                  />
                  {i === peak && hover === null && d.revenueHalalas > 0 && (
                    <span className="tabular pointer-events-none absolute -translate-y-1 whitespace-nowrap text-[0.68rem] font-semibold text-foreground" style={{ bottom: `${h}%` }}>
                      {compact(d.revenueHalalas)}
                    </span>
                  )}
                  {hover === i && (
                    <div role="tooltip" className={cn("pointer-events-none absolute z-10 w-max rounded-xl border border-border bg-surface px-3 py-2 text-caption shadow-lg", i > daily.length / 2 ? "end-1/2" : "start-1/2")} style={{ bottom: `min(calc(${h}% + 10px), calc(100% - 3.5rem))` }}>
                      <div className="font-medium">{day(d.date, { weekday: "short", day: "numeric", month: "short" })}</div>
                      <div className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-[var(--chart-1)]" aria-hidden />
                        <span className="tabular font-semibold">{formatMoney(d.revenueHalalas, locale, { fractionDigits: 0 })}</span>
                      </div>
                      <div className="tabular text-muted-foreground">
                        {d.orders} {t("dailyOrders")}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div dir="ltr" className="ms-12 mt-2 flex text-[0.68rem] text-muted-foreground">
        {daily.map((d, i) => (
          <span key={d.date} className="flex-1 text-center">
            {i % labelEvery === 0 ? day(d.date, { day: "numeric", month: "short" }) : ""}
          </span>
        ))}
      </div>
      {/* Table view: every value, for screen readers and anyone who'd rather read than hover. */}
      <details className="mt-4 text-body-sm">
        <summary className="cursor-pointer text-caption font-medium text-secondary-text">{t("tableView")}</summary>
        <div data-lenis-prevent className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-border">
          <table className="w-full text-caption">
            <tbody>
              {daily
                .filter((d) => d.orders)
                .map((d) => (
                  <tr key={d.date} className="border-b border-border last:border-0">
                    <td className="px-3 py-1.5">{day(d.date, { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="tabular px-3 py-1.5">{d.orders}</td>
                    <td className="tabular px-3 py-1.5 text-end">{formatMoney(d.revenueHalalas, locale, { fractionDigits: 2 })}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

/** Where collected money goes: our net fee, VAT, government fees — one stacked bar, legend + values beside it. */
function Split({ r }: { r: ReportOverview }) {
  const t = useTranslations("admin.reports");
  const locale = useLocale() as AppLocale;
  const parts = [
    { key: "net", value: r.kpis.netServiceHalalas.value, color: "var(--chart-1)" },
    { key: "vat", value: r.kpis.vatHalalas.value, color: "var(--chart-2)" },
    { key: "government", value: r.kpis.governmentHalalas.value, color: "var(--chart-3)" },
  ] as const;
  const total = parts.reduce((s, p) => s + p.value, 0);
  if (!total) return <p className="py-16 text-center text-body-sm text-muted-foreground">{t("noData")}</p>;
  return (
    <div className="flex flex-col gap-6">
      <div dir="ltr" className="flex h-10 gap-[2px] overflow-hidden rounded-[6px]" role="img" aria-label={parts.map((p) => `${t(`splitItems.${p.key}`)} ${Math.round((p.value / total) * 100)}%`).join(", ")}>
        {parts.map((p, i) =>
          p.value > 0 ? <motion.span key={p.key} className="h-full" style={{ background: p.color }} initial={{ width: 0 }} animate={{ width: `${(p.value / total) * 100}%` }} transition={{ delay: 0.1 + i * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }} /> : null,
        )}
      </div>
      <ul className="flex flex-col gap-3">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-3 text-body-sm">
            <span className="size-3 shrink-0 rounded-[3px]" style={{ background: p.color }} aria-hidden />
            <span className="flex-1">{t(`splitItems.${p.key}`)}</span>
            <span className="tabular text-muted-foreground">{Math.round((p.value / total) * 100)}%</span>
            <span className="tabular w-28 text-end font-medium">{formatMoney(p.value, locale, { fractionDigits: 0 })}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Ordered steps of one cohort: one colour, values at the bar tips, share of "started" beside them. */
function Funnel({ funnel }: { funnel: ReportOverview["funnel"] }) {
  const t = useTranslations("admin.reports");
  const steps = (["started", "submitted", "paid", "decided", "delivered"] as const).map((k) => ({ key: k, value: funnel[k] }));
  const max = Math.max(1, funnel.started);
  return (
    <ul className="flex flex-col gap-3">
      {steps.map((s, i) => (
        <li key={s.key} className="grid grid-cols-[7.5rem_1fr] items-center gap-3 text-body-sm">
          <span className="text-muted-foreground">{t(`funnelSteps.${s.key}`)}</span>
          <div className="flex items-center gap-3">
            {/* The track is the full scale, so bar lengths stay true proportions; the value sits after it. */}
            <div className="flex-1">
              <motion.span className="block h-5 rounded-e-[4px] bg-[var(--chart-1)]" style={{ minWidth: s.value ? 4 : 0 }} initial={{ width: 0 }} whileInView={{ width: `${(s.value / max) * 100}%` }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }} />
            </div>
            <span className="tabular w-8 text-end font-semibold">{s.value}</span>
            <span className="tabular w-10 text-caption text-muted-foreground">{i > 0 && funnel.started > 0 ? `${Math.round((s.value / funnel.started) * 100)}%` : ""}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Destinations({ rows }: { rows: ReportOverview["topDestinations"] }) {
  const t = useTranslations("admin.reports");
  const locale = useLocale() as AppLocale;
  const max = Math.max(1, ...rows.map((r) => r.revenueHalalas));
  if (!rows.length) return <p className="py-16 text-center text-body-sm text-muted-foreground">{t("noData")}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r, i) => (
        <li key={r.iso2} className="grid grid-cols-[8rem_1fr] items-center gap-3 text-body-sm">
          <span className="flex items-center gap-2 truncate">
            <Flag code={r.iso2} className="h-3.5 w-5 shrink-0 rounded-[2px]" />
            <span className="truncate">{r.name[locale]}</span>
          </span>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <motion.span className="block h-5 rounded-e-[4px] bg-[var(--chart-1)]" style={{ minWidth: 4 }} initial={{ width: 0 }} whileInView={{ width: `${(r.revenueHalalas / max) * 100}%` }} viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.7, ease: [0.16, 1, 0.3, 1] }} />
            </div>
            <span className="tabular w-24 whitespace-nowrap text-end font-semibold">{formatMoney(r.revenueHalalas, locale, { fractionDigits: 0 })}</span>
            <span className="tabular w-8 text-caption text-muted-foreground">×{r.orders}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Agents({ rows }: { rows: ReportOverview["agents"] }) {
  const t = useTranslations("admin.reports");
  const max = Math.max(1, ...rows.map((r) => r.open));
  const sorted = useMemo(() => rows, [rows]);
  if (!rows.length) return <p className="py-10 text-center text-body-sm text-muted-foreground">{t("noData")}</p>;
  return (
    <div data-lenis-prevent className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-body-sm">
        <thead>
          <tr className="border-b border-border text-caption text-muted-foreground">
            {(["name", "open", "overdue", "handled"] as const).map((c) => (
              <th key={c} className="px-3 py-2 text-start font-medium">
                {t(`agentCols.${c}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((a) => (
            <tr key={a.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2.5 font-medium">{a.name}</td>
              <td className="px-3 py-2.5">
                <span className="flex items-center gap-2">
                  <span className="h-2 rounded-full bg-[var(--chart-1)]" style={{ width: `${(a.open / max) * 6}rem`, minWidth: a.open ? 4 : 0 }} aria-hidden />
                  <span className="tabular">{a.open}</span>
                </span>
              </td>
              <td className={cn("tabular px-3 py-2.5", a.overdue > 0 && "font-semibold text-danger")}>{a.overdue}</td>
              <td className="tabular px-3 py-2.5">{a.handled}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
