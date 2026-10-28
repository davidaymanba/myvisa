"use client";

import { formatMoney, type AppLocale } from "@myvisa/shared";
import { ArrowLeft, FileCode2, FileQuestion, Printer, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import QRCode from "qrcode";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { Link } from "@/i18n/navigation";
import { ApiError, api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { LoadError } from "./page-header";
import { useErrorToast, useInvoice } from "./use-account";

function ZatcaQr({ payload, className }: { payload: string; className?: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void QRCode.toString(payload, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0b1b2b", light: "#ffffff" } }).then((s) => live && setSvg(s));
    return () => {
      live = false;
    };
  }, [payload]);
  return svg ? <div className={cn("[&_svg]:size-full", className)} dangerouslySetInnerHTML={{ __html: svg }} /> : <Skeleton className={className} />;
}

/** The tax invoice as a printable document (print → "Save as PDF"), bilingual like Saudi invoices. */
export function InvoiceDocument({ id, backHref = "/account/invoices" }: { id: string; backHref?: string }) {
  const t = useTranslations("account.invoices");
  const tb = useTranslations("ui.boardingPass");
  const locale = useLocale() as AppLocale;
  const format = useFormatter();
  const invoice = useInvoice(id);
  const onError = useErrorToast();
  const money = (v: number) => formatMoney(v, locale, { fractionDigits: 2 });

  if (invoice.isError) {
    return invoice.error instanceof ApiError && invoice.error.status === 404 ? <EmptyState icon={<FileQuestion />} title={t("empty")} className="mt-10" /> : <LoadError onRetry={() => invoice.refetch()} className="mt-10" />;
  }
  if (!invoice.data) return <Skeleton className="mx-auto h-[60rem] max-w-4xl rounded-3xl" />;
  const inv = invoice.data;

  const downloadXml = async () => {
    try {
      const { url } = await api<{ url: string }>(`/invoices/${inv.id}/xml`);
      window.open(url, "_blank", "noopener");
    } catch (e) {
      onError(e);
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={backHref} className="group inline-flex items-center gap-2 text-body-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1 rtl:rotate-180 rtl:group-hover:translate-x-1" aria-hidden />
          {t("back")}
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void downloadXml()}>
            <FileCode2 aria-hidden />
            {t("xml")}
          </Button>
          <Button onClick={() => window.print()}>
            <Printer aria-hidden />
            {t("print")}
          </Button>
        </div>
      </div>

      <motion.article
        initial={{ opacity: 0, y: 40, rotateX: 10 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformPerspective: 1400 }}
        className="relative overflow-hidden rounded-3xl bg-white p-6 text-ink-900 shadow-lg sm:p-10 print:rounded-none print:p-0 print:shadow-none"
      >
        <div aria-hidden className="absolute inset-x-0 top-0 h-2 bg-gradient-to-l from-gold-300 via-gold-400 to-teal-500 print:hidden" />

        <header className="flex flex-col gap-6 border-b border-ink-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-4">
            <Logo className="text-ink-900" />
            <div>
              <h1 className="font-display text-display-md leading-tight">{inv.type === "CREDIT_NOTE" ? t("creditNote") : t("taxInvoice")}</h1>
              <p className="text-body-sm text-ink-500" lang={locale === "ar" ? "en" : "ar"}>
                {inv.type === "CREDIT_NOTE" ? t("creditNoteEn") : t("taxInvoiceEn")}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-body-sm">
              <dt className="text-ink-500">{t("number")}</dt>
              <dd lang="en" dir="ltr" className="font-mono font-semibold rtl:text-end">
                {inv.number}
              </dd>
              <dt className="text-ink-500">{t("issued")}</dt>
              <dd className="tabular">{format.dateTime(new Date(inv.issuedAt), { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Riyadh" })}</dd>
              <dt className="text-ink-500">{tb("orderNumber")}</dt>
              <dd lang="en" dir="ltr" className="font-mono rtl:text-end">
                {inv.orderNumber}
              </dd>
            </dl>
          </div>
          <figure className="flex flex-col items-center gap-2 self-center sm:self-start">
            <ZatcaQr payload={inv.qrPayload} className="size-36 rounded-lg" />
            <figcaption className="max-w-40 text-center text-[0.68rem] leading-snug text-ink-500">{t("qrHint")}</figcaption>
          </figure>
        </header>

        <div className="grid gap-6 border-b border-ink-100 py-6 sm:grid-cols-2">
          <Party title={t("seller")}>
            <p className="font-medium">{inv.seller.name[locale]}</p>
            <p className="text-ink-600">{inv.seller.address[locale]}</p>
            <p>
              {t("vatNo")}: <span className="tabular font-mono">{inv.seller.vatNumber}</span>
            </p>
            <p>
              {t("crNo")}: <span className="tabular font-mono">{inv.seller.crNumber}</span>
            </p>
          </Party>
          <Party title={t("buyer")}>
            {inv.buyer.name && <p className="font-medium">{inv.buyer.name}</p>}
            <p>
              {t("phone")}:{" "}
              <span dir="ltr" className="tabular font-mono">
                {inv.buyer.phone}
              </span>
            </p>
            {inv.buyer.vatNumber && (
              <p>
                {t("vatNo")}: <span className="tabular font-mono">{inv.buyer.vatNumber}</span>
              </p>
            )}
          </Party>
        </div>

        <div className="overflow-x-auto py-6" data-lenis-prevent>
          <table className="w-full min-w-[34rem] text-body-sm">
            <thead>
              <tr className="border-b-2 border-ink-900 text-start text-caption text-ink-500">
                <th className="pb-2 text-start font-medium">{t("description")}</th>
                <th className="pb-2 text-center font-medium">{t("qty")}</th>
                <th className="pb-2 text-end font-medium">{t("unit")}</th>
                <th className="pb-2 text-end font-medium">{t("vatRate")}</th>
                <th className="pb-2 text-end font-medium">{t("vat")}</th>
                <th className="pb-2 text-end font-medium">{t("lineTotal")}</th>
              </tr>
            </thead>
            <tbody>
              {inv.lines.map((l, i) => (
                <tr key={i} className="border-b border-ink-100 align-top">
                  <td className="py-3 pe-4">
                    <span className="block">{l.description[locale]}</span>
                    <span className="block text-caption text-ink-500" lang={locale === "ar" ? "en" : "ar"}>
                      {l.description[locale === "ar" ? "en" : "ar"]}
                    </span>
                  </td>
                  <td className="tabular py-3 text-center">{l.quantity}</td>
                  <td className="tabular whitespace-nowrap py-3 ps-3 text-end">{money(l.unitPriceHalalas)}</td>
                  <td className="tabular whitespace-nowrap py-3 ps-3 text-end">{l.vatCategory === "O" ? <span className="text-caption text-ink-500">{t("outOfScope")}</span> : `${Math.round(l.vatRate * 100)}%`}</td>
                  <td className="tabular whitespace-nowrap py-3 ps-3 text-end">{money(l.vatHalalas)}</td>
                  <td className="tabular whitespace-nowrap py-3 ps-3 text-end font-medium">{money(l.lineTotalHalalas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-sm text-caption leading-relaxed text-ink-500">{t("footer")}</p>
          <dl className="flex min-w-64 flex-col gap-2 text-body-sm">
            <div className="flex justify-between gap-6">
              <dt className="text-ink-500">{t("subtotal")}</dt>
              <dd className="tabular">{money(inv.subtotalHalalas)}</dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="text-ink-500">{t("vatTotal")}</dt>
              <dd className="tabular">{money(inv.vatHalalas)}</dd>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-6 rounded-2xl bg-ink-900 px-4 py-3 text-sand-100 print:bg-transparent print:px-0 print:text-ink-900">
              <dt className="font-medium">{t("grandTotal")}</dt>
              <dd className="tabular font-display text-heading">{money(inv.totalHalalas)}</dd>
            </div>
          </dl>
        </div>

        <footer className="mt-8 flex flex-col gap-2 border-t border-ink-100 pt-5 text-[0.68rem] text-ink-500">
          <div className="flex flex-wrap items-center gap-2">
            <ShieldCheck className="size-3.5 text-teal-500" aria-hidden />
            <Badge tone={inv.zatcaStatus === "REJECTED" ? "danger" : inv.zatcaStatus === "PENDING" ? "neutral" : "success"} className="print:border print:border-ink-200">
              ZATCA · {t(`zatca.${inv.zatcaStatus}`)}
            </Badge>
            <span>
              {t("icv")} <span className="tabular font-mono">{inv.icv}</span>
            </span>
          </div>
          <p lang="en" dir="ltr" className="break-all font-mono rtl:text-end">
            {t("uuid")}: {inv.uuid}
          </p>
          <p lang="en" dir="ltr" className="break-all font-mono rtl:text-end">
            {t("hash")}: {inv.invoiceHash}
          </p>
        </footer>
      </motion.article>
    </div>
  );
}

function Party({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1 text-body-sm">
      <h2 className="eyebrow mb-1 text-gold-700">{title}</h2>
      {children}
    </section>
  );
}
