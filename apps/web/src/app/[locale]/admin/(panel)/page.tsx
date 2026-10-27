import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { AdminOverview } from "@/components/admin/overview";
import type { Locale } from "@/i18n/routing";

export default function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return <AdminOverview />;
}
