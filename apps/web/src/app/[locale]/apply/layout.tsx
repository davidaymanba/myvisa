import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "apply.meta" });
  // Personal, stateful pages: keep them out of search results.
  return { title: t("title"), description: t("description"), robots: { index: false, follow: true } };
}

/** The wizard is a focused flow: no site header, footer or smooth-scroll wrapper. */
export default function ApplyLayout({ children }: { children: ReactNode }) {
  return children;
}
