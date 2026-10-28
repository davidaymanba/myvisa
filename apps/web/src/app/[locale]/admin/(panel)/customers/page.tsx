import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { CustomersView } from "@/components/admin/customers";
import type { Locale } from "@/i18n/routing";

export default function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return <CustomersView />;
}
