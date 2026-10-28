import { setRequestLocale } from "next-intl/server";
import { InvoicesPage } from "@/components/account/invoices";
import type { Locale } from "@/i18n/routing";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale as Locale);
  return <InvoicesPage />;
}
