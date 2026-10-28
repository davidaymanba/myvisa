import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { ReportsView } from "@/components/admin/reports/reports-view";
import type { Locale } from "@/i18n/routing";

export default function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return <ReportsView />;
}
