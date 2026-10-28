import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { CouponsView } from "@/components/admin/coupons";
import type { Locale } from "@/i18n/routing";

export default function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return <CouponsView />;
}
