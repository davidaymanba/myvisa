import { z } from "zod";
import { saudiMobileSchema } from "../phone";
import { APPLICANT_TYPES, TRAVEL_PURPOSES } from "./catalog-admin";
import type { Destination, InsurancePlan, Nationality, VisaMatch } from "../catalog";
import type { Settings } from "../settings";

/** GET /v1/catalog — the whole public catalog in the shapes the website already renders. */
export interface PublicCatalog {
  destinations: Destination[];
  nationalities: Nationality[];
  insurancePlans: InsurancePlan[];
  /** ISO timestamp of the newest catalog edit; changes whenever the admin saves. */
  version: string;
}

export const finderQuerySchema = z.object({
  to: z.string().trim().min(1).max(80),
  applicant: z.enum(APPLICANT_TYPES).default("SAUDI_CITIZEN"),
  purpose: z.enum(TRAVEL_PURPOSES).default("TOURISM"),
  /** ISO2 of the resident's nationality; narrows price rules when a nationality-specific one exists. */
  nationality: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/).optional(),
});
export type FinderQuery = z.input<typeof finderQuerySchema>;
export type FinderResult = Omit<VisaMatch, "destination"> & { destination: Pick<Destination, "slug" | "iso2" | "name"> };

export type PublicSettings = Settings;

export interface PublicTestimonial {
  id: string;
  name: { ar: string; en: string | null };
  city: { ar: string | null; en: string | null };
  service: { ar: string | null; en: string | null };
  quote: { ar: string; en: string | null };
  rating: number;
}

export const CONTACT_TOPICS = ["visa", "order", "insurance", "business", "other"] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export const contactMessageSchema = z.object({
  name: z.string().trim().min(2, "name").max(120),
  phone: saudiMobileSchema,
  topic: z.enum(CONTACT_TOPICS),
  message: z.string().trim().min(10, "message").max(2000),
  locale: z.enum(["ar", "en"]).default("ar"),
  /** Honeypot — real users never fill it. */
  website: z.string().max(0).optional(),
});
export type ContactMessageInput = z.input<typeof contactMessageSchema>;

export const CONSENT_TYPES = ["TERMS", "PRIVACY_POLICY", "DATA_PROCESSING", "CROSS_BORDER_TRANSFER", "MARKETING"] as const;

/** POST /v1/consents — append-only PDPL ledger. A withdrawal is `granted: false`. */
export const consentInputSchema = z.object({
  type: z.enum(CONSENT_TYPES),
  policyVersion: z.string().trim().min(1).max(20),
  granted: z.boolean(),
  /** Only for consent captured before sign-in (e.g. public order tracking). Ignored when authenticated. */
  phone: saudiMobileSchema.optional(),
});
export type ConsentInput = z.input<typeof consentInputSchema>;
