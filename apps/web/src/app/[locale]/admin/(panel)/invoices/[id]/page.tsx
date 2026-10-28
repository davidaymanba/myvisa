import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { InvoiceDocument } from "@/components/account/invoice-document";
import type { Locale } from "@/i18n/routing";

export default function Page({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = use(params);
  setRequestLocale(locale);
  return <InvoiceDocument id={id} backHref="/admin/orders" />;
}
