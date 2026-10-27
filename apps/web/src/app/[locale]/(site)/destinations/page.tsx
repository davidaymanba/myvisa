import { DESTINATIONS, type Region } from "@myvisa/shared";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";
import { DestinationGrid } from "@/components/destinations/destination-grid";
import { DestinationPoster } from "@/components/home/destination-poster";
import { FinalCta } from "@/components/home/final-cta";
import { PageHero } from "@/components/layout/page-hero";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "destinationsPage" });
  return pageMetadata({ locale, path: "/destinations", title: t("metaTitle"), description: t("metaDesc") });
}

export default function DestinationsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("destinationsPage");
  const regions = Array.from(new Set(DESTINATIONS.map((d) => d.region))) as Region[];

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} accent={t("titleAccent")} lead={t("lead")} crumbs={[{ label: t("eyebrow") }]} />
      <section className="container-page py-16 sm:py-24">
        <DestinationGrid
          regions={regions}
          items={DESTINATIONS.map((d, i) => ({
            slug: d.slug,
            region: d.region,
            haystack: `${d.name.ar} ${d.name.en} ${d.capital.ar} ${d.capital.en}`.toLowerCase(),
            card: <DestinationPoster destination={d} index={i} priority={i < 3} />,
          }))}
        />
      </section>
      <FinalCta />
    </>
  );
}
