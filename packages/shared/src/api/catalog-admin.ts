import { z } from "zod";
import { cuidSchema, halalasSchema, nullableText, requiredText, slugSchema, sortOrderSchema } from "./fields";

/**
 * Enum values the admin can pick. These are the subsets the public site has labels for
 * (see messages `common.purposes`, `common.visaKinds`, `common.regions`); the Prisma enums are supersets.
 */
export const APPLICANT_TYPES = ["SAUDI_CITIZEN", "RESIDENT"] as const;
export const TRAVEL_PURPOSES = ["TOURISM", "BUSINESS", "STUDY", "MEDICAL", "FAMILY_VISIT"] as const;
export const VISA_KINDS = ["VISA_FREE", "E_VISA", "ETA", "STICKER", "VISA_ON_ARRIVAL"] as const;
export const ENTRY_TYPES = ["SINGLE", "DOUBLE", "MULTIPLE"] as const;
export const REGIONS = ["EUROPE", "ASIA", "AMERICAS", "MIDDLE_EAST", "AFRICA", "OCEANIA"] as const;
export const SERVICE_KINDS = ["VISA", "TRAVEL_INSURANCE", "DRIVING_LICENSE", "TRANSLATION", "DOCUMENT_SHIPPING"] as const;
export const DOCUMENT_TYPES = [
  "PASSPORT",
  "PERSONAL_PHOTO",
  "NATIONAL_ID",
  "IQAMA",
  "BANK_STATEMENT",
  "SALARY_CERTIFICATE",
  "EMPLOYMENT_LETTER",
  "COMMERCIAL_REGISTRATION",
  "HOTEL_BOOKING",
  "FLIGHT_BOOKING",
  "TRAVEL_INSURANCE",
  "UNIVERSITY_ACCEPTANCE",
  "MEDICAL_REPORT",
  "INVITATION_LETTER",
  "FAMILY_RECORD",
  "BIRTH_CERTIFICATE",
  "DRIVING_LICENSE",
  "SOURCE_DOCUMENT",
  "OTHER",
] as const;
export const PUBLISH_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export const FAQ_SCOPES = ["GLOBAL", "PRICING", "COUNTRY", "SERVICE"] as const;

const iso2 = z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "iso2");
const iata = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "iata");

// ── Countries ────────────────────────────────────────────────────────────────

export const countryInputSchema = z
  .object({
    slug: slugSchema,
    iso2,
    iso3: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "iso3").nullish().transform((v) => v ?? null),
    nameAr: requiredText(120),
    nameEn: requiredText(120),
    nationalityAr: nullableText(120),
    nationalityEn: nullableText(120),
    region: z.enum(REGIONS).nullable().default(null),
    isDestination: z.boolean().default(false),
    isPopular: z.boolean().default(false),
    isSchengen: z.boolean().default(false),
    isActive: z.boolean().default(true),
    sortOrder: sortOrderSchema.default(0),
    imageId: nullableText(500),
    imageAltAr: nullableText(300),
    imageAltEn: nullableText(300),
    mainAirportIata: iata.nullish().transform((v) => v ?? null),
    latitude: z.number().min(-90).max(90).nullable().default(null),
    longitude: z.number().min(-180).max(180).nullable().default(null),
    capitalAr: nullableText(120),
    capitalEn: nullableText(120),
    taglineAr: nullableText(120),
    taglineEn: nullableText(120),
    overviewAr: nullableText(3000),
    overviewEn: nullableText(3000),
    bestTimeAr: nullableText(120),
    bestTimeEn: nullableText(120),
    flightHours: z.number().min(0).max(48).nullable().default(null),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "currency").nullish().transform((v) => v ?? null),
    insuranceServiceId: cuidSchema.nullish().transform((v) => v ?? null),
    seoTitleAr: nullableText(120),
    seoTitleEn: nullableText(120),
    seoDescAr: nullableText(300),
    seoDescEn: nullableText(300),
  })
  .superRefine((c, ctx) => {
    if (!c.isDestination) return;
    // A destination renders a full page; refuse to publish one with holes in it.
    const needed = ["region", "imageId", "mainAirportIata", "latitude", "longitude", "capitalAr", "capitalEn", "taglineAr", "taglineEn", "overviewAr", "overviewEn"] as const;
    for (const key of needed) {
      if (c[key] === null || c[key] === undefined) ctx.addIssue({ code: "custom", path: [key], message: "required_for_destination" });
    }
  });
export type CountryInput = z.input<typeof countryInputSchema>;
export type CountryData = z.output<typeof countryInputSchema>;

export interface CountryRecord extends CountryData {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface CountryListItem {
  id: string;
  slug: string;
  iso2: string;
  nameAr: string;
  nameEn: string;
  region: (typeof REGIONS)[number] | null;
  isDestination: boolean;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
  imageId: string | null;
  serviceCount: number;
  updatedAt: string;
}

// ── Services (visas and other products) ─────────────────────────────────────

export const serviceInputSchema = z
  .object({
    category: z.enum(SERVICE_KINDS),
    slug: slugSchema,
    nameAr: requiredText(160),
    nameEn: requiredText(160),
    summaryAr: nullableText(500),
    summaryEn: nullableText(500),
    descriptionAr: nullableText(20_000),
    descriptionEn: nullableText(20_000),
    countryId: cuidSchema.nullish().transform((v) => v ?? null),
    purpose: z.enum(TRAVEL_PURPOSES).nullable().default(null),
    visaKind: z.enum(VISA_KINDS).nullable().default(null),
    entryType: z.enum(ENTRY_TYPES).nullable().default(null),
    validityDays: z.number().int().min(0).max(3650).nullable().default(null),
    maxStayDays: z.number().int().min(0).max(3650).nullable().default(null),
    processingDaysMin: z.number().int().min(0).max(365),
    processingDaysMax: z.number().int().min(0).max(365),
    requiresAppointment: z.boolean().default(false),
    appointmentNoteAr: nullableText(500),
    appointmentNoteEn: nullableText(500),
    attributes: z.record(z.string(), z.unknown()).nullable().default(null),
    isActive: z.boolean().default(true),
    sortOrder: sortOrderSchema.default(0),
  })
  .superRefine((s, ctx) => {
    if (s.processingDaysMin > s.processingDaysMax) ctx.addIssue({ code: "custom", path: ["processingDaysMax"], message: "min_gt_max" });
    if (s.category === "VISA") {
      for (const key of ["countryId", "purpose", "visaKind", "entryType", "validityDays", "maxStayDays"] as const) {
        if (s[key] === null) ctx.addIssue({ code: "custom", path: [key], message: "required_for_visa" });
      }
    }
  });
export type ServiceInput = z.input<typeof serviceInputSchema>;
export type ServiceData = z.output<typeof serviceInputSchema>;

// ── Price rules ──────────────────────────────────────────────────────────────

export const priceRuleInputSchema = z
  .object({
    applicantType: z.enum(APPLICANT_TYPES),
    /** Null = applies to every nationality of this applicant type. */
    nationalityId: cuidSchema.nullish().transform((v) => v ?? null),
    isEligible: z.boolean().default(true),
    governmentFeeHalalas: halalasSchema,
    serviceFeeHalalas: halalasSchema,
    governmentFeeNoteAr: nullableText(500),
    governmentFeeNoteEn: nullableText(500),
    ineligibleReasonAr: nullableText(500),
    ineligibleReasonEn: nullableText(500),
  })
  .superRefine((r, ctx) => {
    if (!r.isEligible && (r.governmentFeeHalalas > 0 || r.serviceFeeHalalas > 0)) {
      ctx.addIssue({ code: "custom", path: ["isEligible"], message: "ineligible_has_fees" });
    }
    if (!r.isEligible && !r.ineligibleReasonAr) ctx.addIssue({ code: "custom", path: ["ineligibleReasonAr"], message: "reason_required" });
  });
export type PriceRuleInput = z.input<typeof priceRuleInputSchema>;
export type PriceRuleData = z.output<typeof priceRuleInputSchema>;

// ── Requirements ─────────────────────────────────────────────────────────────

export const requirementInputSchema = z.object({
  /** Null = every applicant type. */
  applicantType: z.enum(APPLICANT_TYPES).nullable().default(null),
  documentType: z.enum(DOCUMENT_TYPES),
  titleAr: requiredText(200),
  titleEn: requiredText(200),
  detailsAr: nullableText(1000),
  detailsEn: nullableText(1000),
  isRequired: z.boolean().default(true),
  perTraveler: z.boolean().default(true),
  sortOrder: sortOrderSchema.default(0),
});
export type RequirementInput = z.input<typeof requirementInputSchema>;
export type RequirementData = z.output<typeof requirementInputSchema>;

// ── FAQs ─────────────────────────────────────────────────────────────────────

export const faqInputSchema = z
  .object({
    scope: z.enum(FAQ_SCOPES),
    countryId: cuidSchema.nullish().transform((v) => v ?? null),
    serviceId: cuidSchema.nullish().transform((v) => v ?? null),
    questionAr: requiredText(300),
    questionEn: requiredText(300),
    answerAr: requiredText(3000),
    answerEn: requiredText(3000),
    sortOrder: sortOrderSchema.default(0),
    status: z.enum(PUBLISH_STATUSES).default("PUBLISHED"),
  })
  .superRefine((f, ctx) => {
    if (f.scope === "COUNTRY" && !f.countryId) ctx.addIssue({ code: "custom", path: ["countryId"], message: "required" });
    if (f.scope === "SERVICE" && !f.serviceId) ctx.addIssue({ code: "custom", path: ["serviceId"], message: "required" });
  });
export type FaqInput = z.input<typeof faqInputSchema>;
export type FaqData = z.output<typeof faqInputSchema>;

// ── Testimonials ─────────────────────────────────────────────────────────────

export const testimonialInputSchema = z
  .object({
    authorNameAr: requiredText(120),
    authorNameEn: nullableText(120),
    cityAr: nullableText(80),
    cityEn: nullableText(80),
    serviceLabelAr: nullableText(120),
    serviceLabelEn: nullableText(120),
    rating: z.number().int().min(1).max(5),
    quoteAr: requiredText(1000),
    quoteEn: nullableText(1000),
    serviceId: cuidSchema.nullish().transform((v) => v ?? null),
    consentedAt: z.iso.datetime().nullish().transform((v) => v ?? null),
    status: z.enum(PUBLISH_STATUSES).default("DRAFT"),
    sortOrder: sortOrderSchema.default(0),
  })
  .superRefine((t, ctx) => {
    // Publishing a review without the customer's consent is a PDPL problem.
    if (t.status === "PUBLISHED" && !t.consentedAt) ctx.addIssue({ code: "custom", path: ["consentedAt"], message: "consent_required" });
  });
export type TestimonialInput = z.input<typeof testimonialInputSchema>;

/** Reorder payload shared by every sortable list. */
export const reorderSchema = z.object({ ids: z.array(cuidSchema).min(1).max(500) });

// ── Admin read models (JSON over the wire: dates are ISO strings) ────────────

export interface CountryRef {
  id: string;
  slug: string;
  iso2: string;
  nameAr: string;
  nameEn: string;
}

export interface PriceRuleRecord extends PriceRuleData {
  id: string;
  serviceId: string;
  nationality: CountryRef | null;
  validFrom: string;
  validTo: string | null;
  updatedAt: string;
}

export interface RequirementRecord extends RequirementData {
  id: string;
  serviceId: string;
}

export interface ServiceRecord extends ServiceData {
  id: string;
  createdAt: string;
  updatedAt: string;
  country: CountryRef | null;
  priceRules: PriceRuleRecord[];
  requirements: RequirementRecord[];
}

export interface FaqRecord extends FaqData {
  id: string;
}

export interface CountryDetail extends CountryRecord {
  services: ServiceRecord[];
  faqs: FaqRecord[];
}

export interface TestimonialRecord {
  id: string;
  authorNameAr: string;
  authorNameEn: string | null;
  cityAr: string | null;
  cityEn: string | null;
  serviceLabelAr: string | null;
  serviceLabelEn: string | null;
  rating: number;
  quoteAr: string;
  quoteEn: string | null;
  serviceId: string | null;
  consentedAt: string | null;
  isPlaceholder: boolean;
  status: (typeof PUBLISH_STATUSES)[number];
  sortOrder: number;
  updatedAt: string;
}

export interface ContactMessageRecord {
  id: string;
  name: string;
  phone: string;
  topic: "VISA" | "ORDER" | "INSURANCE" | "BUSINESS" | "OTHER";
  message: string;
  locale: "ar" | "en";
  handledAt: string | null;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  ip: string | null;
  createdAt: string;
  actor: { id: string; phone: string; fullNameAr: string | null; fullNameEn: string | null; role: string } | null;
}

export interface Paginated<T> {
  items: T[];
  /** Pass back as `cursor` for the next page; null on the last page. */
  nextCursor: string | null;
}
