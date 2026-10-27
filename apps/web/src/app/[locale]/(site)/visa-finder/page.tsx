import type { AppLocale } from "@myvisa/shared";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense, use } from "react";
import type { VisaTabData } from "@/components/destinations/visa-tabs";
import { VisaFinder, type FinderDestination } from "@/components/finder/visa-finder";
import { PageHero } from "@/components/layout/page-hero";
import type { Locale } from "@/i18n/routing";
import { getCatalog, getSettings } from "@/lib/api/server";
import { unsplash } from "@/lib/images";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "finder" });
  return pageMetadata({ locale, path: "/visa-finder", title: t("metaTitle"), description: t("metaDesc") });
}

export default function VisaFinderPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const l = locale as AppLocale;
  const t = useTranslations("finder");
  const tc = useTranslations("common");

  const catalog = use(getCatalog());
  const { support } = use(getSettings());
  const destinations: FinderDestination[] = catalog.destinations.map((d) => ({
    slug: d.slug,
    iso2: d.iso2,
    iata: d.iata,
    name: d.name[l],
    image: unsplash(d.imageId, 1400),
    imageAlt: d.imageAlt[l],
    visas: d.visas.map(
      (v): VisaTabData => ({
        id: v.id,
        kind: v.kind,
        purpose: v.purpose,
        purposeLabel: tc(`purposes.${v.purpose}`),
        kindLabel: tc(`visaKinds.${v.kind}`),
        name: v.name[l],
        entryLabel: tc(`entry.${v.entry}`),
        validityDays: v.validityDays,
        maxStayDays: v.maxStayDays,
        processingDays: v.processingDays,
        appointment: v.appointment,
        appointmentNote: v.appointmentNote?.[l],
        pricing: v.pricing.map((p) => ({ applicant: p.applicant, eligible: p.eligible, governmentFee: p.governmentFee, serviceFee: p.serviceFee, note: p.note?.[l], reason: p.ineligibleReason?.[l] })),
        requirements: v.requirements.map((r) => ({ doc: r.doc, title: r.title[l], details: r.details?.[l], applicant: r.applicant, optional: r.optional })),
      }),
    ),
  }));

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} accent={t("titleAccent")} crumbs={[{ label: t("eyebrow") }]} />
      <section className="container-page py-14 sm:py-20">
        <Suspense>
          <VisaFinder destinations={destinations} nationalities={catalog.nationalities.map((n) => ({ iso2: n.iso2, name: n.name[l] }))} whatsapp={support.whatsapp} />
        </Suspense>
      </section>
    </>
  );
}
