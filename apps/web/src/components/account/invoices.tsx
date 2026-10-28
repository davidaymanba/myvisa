"use client";

import { formatMoney, type AppLocale } from "@myvisa/shared";
import { ArrowUpRight, ReceiptText } from "lucide-react";
import { motion } from "motion/react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { Link } from "@/i18n/navigation";
import { AccountHeader, LoadError } from "./page-header";
import { useInvoices } from "./use-account";

export function InvoicesPage() {
  const t = useTranslations("account.invoices");
  const locale = useLocale() as AppLocale;
  const format = useFormatter();
  const invoices = useInvoices();
  return (
    <>
      <AccountHeader page={6} eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      {invoices.isError ? (
        <LoadError onRetry={() => invoices.refetch()} />
      ) : invoices.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-52 rounded-3xl" />
          ))}
        </div>
      ) : !invoices.data?.length ? (
        <EmptyState icon={<ReceiptText />} title={t("empty")} description={t("emptyLead")} />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {invoices.data.map((inv, i) => (
            <motion.li key={inv.id} initial={{ opacity: 0, y: 30, rotate: i % 2 ? 1.5 : -1.5 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: i * 0.07, duration: 0.7, ease: [0.16, 1, 0.3, 1] }} whileHover={{ y: -6 }}>
              <Link href={`/account/invoices/${inv.id}`} className="group relative block overflow-hidden rounded-t-3xl bg-surface p-6 pb-9 shadow-md [mask-image:radial-gradient(circle_at_10px_100%,transparent_9px,black_9.5px)] [mask-position:-10px_0] [mask-size:20px_100%] [mask-repeat:repeat-x]">
                {/* A receipt: zigzag bottom edge via the mask, dashed rule, big total. */}
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-2xl bg-secondary/10 text-secondary-text">
                    <ReceiptText className="size-[18px]" aria-hidden />
                  </span>
                  <Badge tone={inv.zatcaStatus === "REJECTED" ? "danger" : inv.zatcaStatus === "PENDING" ? "neutral" : "success"}>{t(`zatca.${inv.zatcaStatus}`)}</Badge>
                </div>
                <p lang="en" dir="ltr" className="mt-5 font-mono text-body-sm font-semibold tracking-wider rtl:text-end">
                  {inv.number}
                </p>
                <p className="text-caption text-muted-foreground">{format.dateTime(new Date(inv.issuedAt), { day: "numeric", month: "long", year: "numeric" })}</p>
                <div className="my-4 border-t-2 border-dashed border-border" />
                <div className="flex items-end justify-between gap-3">
                  <span className="min-w-0 text-caption text-muted-foreground">{t("order", { number: inv.orderNumber })}</span>
                  <span className="tabular whitespace-nowrap font-display text-display-md leading-none">{formatMoney(inv.totalHalalas, locale, { fractionDigits: 2 })}</span>
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-body-sm font-medium text-secondary-text">
                  {t("view")}
                  <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 flip-rtl" aria-hidden />
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </>
  );
}
