import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { MockCheckout } from "@/components/pay/mock-checkout";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "pay" });
  return { title: t("meta") };
}

/**
 * Stand-in for the Moyasar/Tap hosted page while PAYMENT_PROVIDER=mock. The API is the guard:
 * it refuses the mock gateway in production, so this page can't complete anything there.
 */
export default async function MockPayPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return (
    <Suspense>
      <MockCheckout />
    </Suspense>
  );
}
