import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "account.meta" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

/** Re-provides messages including the `account` namespace, which the root layout withholds from public pages. */
export default async function AccountLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const messages = Object.fromEntries(Object.entries(await getMessages()).filter(([namespace]) => namespace !== "admin"));
  return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>;
}
