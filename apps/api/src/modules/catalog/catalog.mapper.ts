import { z } from "zod";
import type { Destination, Faq, InsurancePlan, InsurancePlanId, L10n, Nationality, PriceOption, Requirement, VisaOption } from "@myvisa/shared";
import type { Country, Faq as FaqRow, PriceRule, Requirement as RequirementRow, Service } from "@myvisa/db";

/** `attributes` of a TRAVEL_INSURANCE service. */
export const insuranceAttributesSchema = z.object({
  planId: z.enum(["SCHENGEN", "TURKEY", "GEORGIA", "USA_CANADA", "WORLDWIDE"]),
  medicalCover: z.string(),
  embassyAccepted: z.boolean(),
  highlights: z.array(z.object({ ar: z.string(), en: z.string() })),
});

export type DestinationRow = Country & {
  insurance: Pick<Service, "attributes" | "isActive"> | null;
  services: (Service & { priceRules: PriceRule[]; requirements: RequirementRow[] })[];
  faqs: FaqRow[];
};

const l10n = (ar: string, en: string): L10n => ({ ar, en });

/** Optional bilingual field: present only when the Arabic text exists (mirrors `...(x ? { x } : {})` in the catalog). */
function optional<K extends string>(key: K, ar: string | null, en: string | null): { [P in K]?: L10n } {
  return (ar ? { [key]: l10n(ar, en ?? ar) } : {}) as { [P in K]?: L10n };
}

function toPrice(rule: PriceRule): PriceOption {
  return {
    applicant: rule.applicantType as PriceOption["applicant"],
    eligible: rule.isEligible,
    governmentFee: rule.governmentFeeHalalas,
    serviceFee: rule.serviceFeeHalalas,
    ...optional("note", rule.governmentFeeNoteAr, rule.governmentFeeNoteEn),
    ...optional("ineligibleReason", rule.ineligibleReasonAr, rule.ineligibleReasonEn),
  };
}

function toRequirement(r: RequirementRow): Requirement {
  return {
    doc: r.documentType as Requirement["doc"],
    title: l10n(r.titleAr, r.titleEn),
    ...optional("details", r.detailsAr, r.detailsEn),
    ...(r.applicantType ? { applicant: r.applicantType as Requirement["applicant"] } : {}),
    ...(r.isRequired ? {} : { optional: true }),
  };
}

function toVisa(s: DestinationRow["services"][number]): VisaOption {
  return {
    id: s.slug,
    purpose: s.purpose as VisaOption["purpose"],
    kind: s.visaKind as VisaOption["kind"],
    name: l10n(s.nameAr, s.nameEn),
    entry: s.entryType ?? "SINGLE",
    validityDays: s.validityDays ?? 0,
    maxStayDays: s.maxStayDays ?? 0,
    processingDays: [s.processingDaysMin, s.processingDaysMax],
    appointment: s.requiresAppointment,
    ...optional("appointmentNote", s.appointmentNoteAr, s.appointmentNoteEn),
    pricing: s.priceRules.map(toPrice),
    requirements: s.requirements.map(toRequirement),
  };
}

function toFaq(f: FaqRow): Faq {
  return { q: l10n(f.questionAr, f.questionEn), a: l10n(f.answerAr, f.answerEn) };
}

/** DB row → the `Destination` shape the website renders (packages/shared/src/catalog/types.ts). */
export function toDestination(c: DestinationRow): Destination {
  const insurance = c.insurance?.isActive ? insuranceAttributesSchema.safeParse(c.insurance.attributes) : undefined;
  return {
    slug: c.slug,
    iso2: c.iso2.toLowerCase(),
    iata: c.mainAirportIata ?? "",
    lat: c.latitude ?? 0,
    lon: c.longitude ?? 0,
    name: l10n(c.nameAr, c.nameEn),
    capital: l10n(c.capitalAr ?? "", c.capitalEn ?? ""),
    region: (c.region ?? "ASIA") as Destination["region"],
    schengen: c.isSchengen,
    popular: c.isPopular,
    tagline: l10n(c.taglineAr ?? "", c.taglineEn ?? ""),
    overview: l10n(c.overviewAr ?? "", c.overviewEn ?? ""),
    imageId: c.imageId ?? "",
    imageAlt: l10n(c.imageAltAr ?? c.nameAr, c.imageAltEn ?? c.nameEn),
    bestTime: l10n(c.bestTimeAr ?? "", c.bestTimeEn ?? ""),
    flightHours: c.flightHours ?? 0,
    currency: c.currency ?? "",
    visas: c.services.map(toVisa),
    faqs: c.faqs.map(toFaq),
    ...(insurance?.success ? { insurance: insurance.data.planId as InsurancePlanId } : {}),
  };
}

export function toNationality(c: Pick<Country, "iso2" | "nationalityAr" | "nationalityEn">): Nationality {
  return { iso2: c.iso2, name: l10n(c.nationalityAr ?? "", c.nationalityEn ?? "") };
}

export function toInsurancePlan(s: Service & { priceRules: PriceRule[] }): InsurancePlan | null {
  const attrs = insuranceAttributesSchema.safeParse(s.attributes);
  if (!attrs.success) return null;
  const price = s.priceRules.find((r) => r.applicantType === "SAUDI_CITIZEN") ?? s.priceRules[0];
  return {
    id: attrs.data.planId,
    name: l10n(s.nameAr, s.nameEn),
    coverage: l10n(s.summaryAr ?? "", s.summaryEn ?? ""),
    medicalCover: attrs.data.medicalCover,
    pricePerWeek: price?.serviceFeeHalalas ?? 0,
    embassyAccepted: attrs.data.embassyAccepted,
    highlights: attrs.data.highlights,
  };
}

/**
 * Resolution order from the schema: (applicant + nationality) → (applicant, any nationality) → not offered.
 * Rules outside their validity window are ignored.
 */
export function resolvePriceRule<R extends Pick<PriceRule, "applicantType" | "nationalityId" | "validFrom" | "validTo">>(
  rules: readonly R[],
  applicant: string,
  nationalityId: string | null,
  at = new Date(),
): R | undefined {
  const live = rules.filter((r) => r.applicantType === applicant && r.validFrom <= at && (!r.validTo || r.validTo > at));
  return (nationalityId ? live.find((r) => r.nationalityId === nationalityId) : undefined) ?? live.find((r) => r.nationalityId === null);
}
