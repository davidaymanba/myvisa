import { LEGAL_DOCUMENTS } from "@myvisa/shared";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { LegalPage } from "@/components/legal/legal-page";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";

const SLUG = "privacy" as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const doc = LEGAL_DOCUMENTS[SLUG];
  return pageMetadata({ locale, path: "/privacy", title: doc.title[locale], description: doc.summary[0]?.[locale] ?? doc.title[locale] });
}

export default function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return <LegalPage slug={SLUG} />;
}
