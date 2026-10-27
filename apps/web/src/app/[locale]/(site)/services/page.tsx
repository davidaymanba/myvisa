import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";
import { FinalCta } from "@/components/home/final-cta";
import { ServicesBento } from "@/components/home/services-bento";
import { PageHero } from "@/components/layout/page-hero";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "servicesPage" });
  return pageMetadata({ locale, path: "/services", title: t("metaTitle"), description: t("metaDesc") });
}

export default function ServicesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("servicesPage");
  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} accent={t("titleAccent")} lead={t("lead")} crumbs={[{ label: t("eyebrow") }]} />
      <section className="container-page py-16 sm:py-24">
        <ServicesBento />
      </section>
      <FinalCta />
    </>
  );
}
