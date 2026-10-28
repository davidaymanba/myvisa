import { setRequestLocale } from "next-intl/server";
import { InvoiceDocument } from "@/components/account/invoice-document";
import type { Locale } from "@/i18n/routing";

export default async function InvoicePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  return <InvoiceDocument id={id} />;
}
