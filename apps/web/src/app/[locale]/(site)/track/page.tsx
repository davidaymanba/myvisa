import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { TrackExperience, TrackExperienceFallback } from "@/components/track/track-experience";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "track.meta" });
  return pageMetadata({ locale: locale as Locale, path: "/track", title: t("title"), description: t("description") });
}

export default async function TrackPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale as Locale);
  return (
    <Suspense fallback={<TrackExperienceFallback />}>
      <TrackExperience />
    </Suspense>
  );
}
