import { setRequestLocale } from "next-intl/server";
import { OrderDetail } from "@/components/account/order-detail";
import type { Locale } from "@/i18n/routing";

export default async function OrderPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  return <OrderDetail id={id} />;
}
