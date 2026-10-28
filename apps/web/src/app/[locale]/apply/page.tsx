import { LEGAL_DOCUMENTS, TRAVEL_PURPOSES, APPLICANT_TYPES, type ApplicantType, type TravelPurpose } from "@myvisa/shared";
import { setRequestLocale } from "next-intl/server";
import { Suspense, use } from "react";
import { ApplyWizard } from "@/components/apply/apply-wizard";
import type { WizardData, WizardIntent } from "@/components/apply/types";
import type { Locale } from "@/i18n/routing";
import { getCatalog, getSettings } from "@/lib/api/server";

const pick = <T extends string>(value: string | string[] | undefined, allowed: readonly T[]): T | undefined => (typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : undefined);
const str = (value: string | string[] | undefined) => (typeof value === "string" && value.length < 100 ? value : undefined);

export default function ApplyPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const sp = use(searchParams);
  const catalog = use(getCatalog());
  const { support } = use(getSettings());

  const data: WizardData = {
    // Slim client payload: requirements and FAQs arrive with the order.
    destinations: catalog.destinations.map((d) => ({
      slug: d.slug,
      iso2: d.iso2,
      iata: d.iata,
      name: d.name,
      imageId: d.imageId,
      region: d.region,
      schengen: d.schengen,
      visas: d.visas.map((v) => ({ id: v.id, purpose: v.purpose, kind: v.kind, name: v.name, entry: v.entry, maxStayDays: v.maxStayDays, processingDays: v.processingDays, appointment: v.appointment, pricing: v.pricing })),
    })),
    nationalities: catalog.nationalities,
    whatsapp: support.whatsapp,
    refundSummary: LEGAL_DOCUMENTS["refund-policy"].summary,
  };
  const intent: WizardIntent = {
    to: str(sp.to),
    visa: str(sp.visa),
    purpose: pick<TravelPurpose>(sp.purpose, TRAVEL_PURPOSES),
    as: pick<ApplicantType>(sp.as, APPLICANT_TYPES),
    nationality: str(sp.nationality)?.toUpperCase(),
    order: str(sp.order),
    step: str(sp.step),
  };

  return (
    <Suspense>
      <ApplyWizard key={intent.order ?? "new"} data={data} intent={intent} />
    </Suspense>
  );
}
