"use client";

import { formatMoney, type AppLocale, type CustomerDetail, type CustomerPage } from "@myvisa/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookUser, MessageCircle, Phone, Search, ShieldCheck, ShieldX, Ticket, Users } from "lucide-react";
import { motion } from "motion/react";
import { useFormatter, useLocale, useNow, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { statusTone } from "@/components/account/order-ticket";
import { Flag } from "@/components/brand/flag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Link, useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { initials } from "./orders/use-orders";
import { AdminPageHeader } from "./page-header";

export function CustomersView() {
  const t = useTranslations("admin.customers");
  const tc = useTranslations("admin.common");
  const to = useTranslations("admin.orders");
  const locale = useLocale() as AppLocale;
  const format = useFormatter();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const id = setTimeout(() => (setSearch(q.trim()), setPage(1)), 300);
    return () => clearTimeout(id);
  }, [q]);
  const customers = useQuery({
    queryKey: ["admin", "customers", search, page],
    queryFn: () => api<CustomerPage>(`/admin/customers?page=${page}&pageSize=30${search ? `&q=${encodeURIComponent(search)}` : ""}`),
    placeholderData: keepPreviousData,
  });
  const pages = customers.data ? Math.max(1, Math.ceil(customers.data.total / customers.data.pageSize)) : 1;

  return (
    <>
      <AdminPageHeader index="03" eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      <label className="relative mb-6 block max-w-md">
        <Search className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} className="ps-11" />
      </label>
      {customers.isError ? (
        <ErrorState icon={<Users />} title={tc("loadError")} onRetry={() => customers.refetch()} retryLabel={tc("retry")} />
      ) : !customers.data ? (
        <Skeleton className="h-96 rounded-[1.75rem]" />
      ) : !customers.data.items.length ? (
        <EmptyState icon={<Users />} title={t("empty")} />
      ) : (
        <>
          <div data-lenis-prevent className="overflow-x-auto rounded-[1.75rem] border border-border bg-surface">
            <table className="w-full min-w-[46rem] text-body-sm">
              <thead>
                <tr className="border-b border-border text-caption text-muted-foreground">
                  {(["customer", "orders", "spent", "last", "since"] as const).map((c) => (
                    <th key={c} className="px-4 py-3 text-start font-medium">
                      {t(`columns.${c}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.data.items.map((c, i) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 15) * 0.02 }}
                    onClick={() => router.push(`/admin/customers/${c.id}`)}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/admin/customers/${c.id}`} className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-teal-300 to-teal-700 text-caption font-semibold text-white">{initials(c.name ?? "#")}</span>
                        <span className="flex flex-col">
                          <span className="font-medium">{c.name ?? "—"}</span>
                          <span dir="ltr" className="tabular text-caption text-muted-foreground rtl:text-end">
                            {c.phone}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="tabular px-4 py-3">
                      {c.paidOrders} / {c.orders}
                    </td>
                    <td className="tabular px-4 py-3 font-medium">{formatMoney(c.spentHalalas, locale, { fractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-caption text-muted-foreground">{c.lastOrderAt ? format.dateTime(new Date(c.lastOrderAt), { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                    <td className="px-4 py-3 text-caption text-muted-foreground">{format.dateTime(new Date(c.createdAt), { month: "short", year: "numeric" })}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 text-body-sm text-muted-foreground">
            <span>{customers.data.total}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                {to("prev")}
              </Button>
              <span className="tabular">{to("page", { page, pages })}</span>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                {to("next")}
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export function CustomerProfile({ id }: { id: string }) {
  const t = useTranslations("admin.customers");
  const tc = useTranslations("admin.common");
  const tb = useTranslations("ui.boardingPass");
  const ta = useTranslations("apply.travelers");
  const locale = useLocale() as AppLocale;
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const customer = useQuery({ queryKey: ["admin", "customer", id], queryFn: () => api<CustomerDetail>(`/admin/customers/${id}`) });
  if (customer.isError) return <ErrorState icon={<Users />} title={tc("loadError")} onRetry={() => customer.refetch()} retryLabel={tc("retry")} />;
  if (!customer.data) return <Skeleton className="h-[40rem] rounded-[2rem]" />;
  const c = customer.data;
  const wa = c.phone.replace(/\D/g, "");

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/customers" className="group inline-flex w-fit items-center gap-2 text-body-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1 rtl:rotate-180 rtl:group-hover:translate-x-1" aria-hidden />
        {t("title")}
      </Link>
      <motion.header initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} data-surface="dark" className="dark relative isolate flex flex-col gap-6 overflow-hidden rounded-[2rem] bg-ink-950 p-6 text-foreground sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div aria-hidden className="absolute -end-16 -top-24 -z-10 size-80 animate-drift rounded-full bg-teal-500/30 blur-[90px]" />
        <div className="flex items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-gold-200 to-gold-500 font-display text-display-md text-ink-950">{initials(c.name ?? "#")}</span>
          <div className="flex flex-col gap-1">
            <p className="eyebrow text-gold-300">{t("profile")}</p>
            <h1 className="font-display text-display-md leading-tight">{c.name ?? c.phone}</h1>
            <p className="text-body-sm text-foreground/70">
              <span dir="ltr">{c.phone}</span>
              {c.email && <> · {c.email}</>} · {c.lastLoginAt ? t("lastLogin", { when: format.relativeTime(new Date(c.lastLoginAt), now) }) : t("never")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          {[
            { label: t("columns.orders"), value: `${c.paidOrders} / ${c.orders}` },
            { label: t("columns.spent"), value: formatMoney(c.spentHalalas, locale, { fractionDigits: 0 }) },
          ].map((s) => (
            <div key={s.label} className="flex flex-col">
              <span className="text-caption text-foreground/60">{s.label}</span>
              <span className="tabular font-display text-display-md leading-none">{s.value}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline" className="border-white/15">
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
                <MessageCircle aria-hidden />
                {t("whatsapp")}
              </a>
            </Button>
            <Button asChild size="sm" variant="outline" className="border-white/15" aria-label={t("call")}>
              <a href={`tel:${c.phone}`}>
                <Phone aria-hidden />
              </a>
            </Button>
          </div>
        </div>
      </motion.header>

      <div className="grid items-start gap-6 xl:grid-cols-12">
        <section className="rounded-[1.75rem] border border-border bg-surface p-5 sm:p-6 xl:col-span-7">
          <h2 className="mb-4 flex items-center gap-2 font-display text-title">
            <Ticket className="size-5 text-secondary-text" aria-hidden />
            {t("orders")}
          </h2>
          <ul className="flex flex-col divide-y divide-border">
            {c.recentOrders.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-3 py-3 hover:opacity-80">
                  {o.destination && <Flag code={o.destination.iso2} className="h-4 w-6 rounded-[3px]" />}
                  <span lang="en" dir="ltr" className="font-mono text-body-sm font-semibold">
                    {o.number}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-body-sm text-muted-foreground">{o.service[locale]}</span>
                  <Badge tone={statusTone(o.status)} dot>
                    {tb(`statuses.${o.status}`)}
                  </Badge>
                  <span className="tabular text-body-sm">{formatMoney(o.totalHalalas, locale, { fractionDigits: 2 })}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <div className="flex flex-col gap-6 xl:col-span-5">
          <section className="rounded-[1.75rem] border border-border bg-surface p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-title">
              <BookUser className="size-5 text-secondary-text" aria-hidden />
              {t("family")}
            </h2>
            <ul className="flex flex-col gap-2">
              {c.travelers.map((tr) => (
                <li key={tr.id} className="flex items-center gap-3 rounded-2xl bg-surface-sunken/70 px-3 py-2.5 text-body-sm">
                  <Flag code={tr.nationalityIso2.toLowerCase()} className="h-4 w-6 rounded-[3px]" />
                  <span lang="en" className="flex-1 font-medium">
                    {tr.name}
                  </span>
                  <span className="text-caption text-muted-foreground">{ta(`relationships.${tr.relationship as "SELF"}`)}</span>
                  <span className="tabular text-caption text-muted-foreground">{tr.passportExpiry}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-[1.75rem] border border-border bg-surface p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-title">
              <ShieldCheck className="size-5 text-secondary-text" aria-hidden />
              {t("consents")}
            </h2>
            <ul className="flex flex-col gap-1.5 text-body-sm">
              {c.consents.map((k, i) => (
                <li key={i} className="flex items-center gap-2">
                  {k.granted ? <ShieldCheck className="size-4 text-success" aria-hidden /> : <ShieldX className="size-4 text-danger" aria-hidden />}
                  <span className="flex-1">{t.has(`consentTypes.${k.type}` as "consentTypes.TERMS") ? t(`consentTypes.${k.type}` as "consentTypes.TERMS") : k.type}</span>
                  <span className={cn("text-caption", k.granted ? "text-success" : "text-danger")}>{k.granted ? t("granted") : t("withdrawn")}</span>
                  <span className="tabular text-caption text-muted-foreground">{format.dateTime(new Date(k.createdAt), { day: "numeric", month: "short", year: "numeric" })}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
