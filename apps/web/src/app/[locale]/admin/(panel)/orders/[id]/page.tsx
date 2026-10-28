import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { OrderDesk } from "@/components/admin/orders/order-desk";
import type { Locale } from "@/i18n/routing";

export default function Page({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = use(params);
  setRequestLocale(locale);
  return <OrderDesk id={id} />;
}
