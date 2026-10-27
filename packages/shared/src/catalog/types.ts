import type { Halalas } from "../money";

/** Bilingual string. Every customer-facing text in the catalog carries both locales. */
export interface L10n {
  ar: string;
  en: string;
}

/** Mirrors the Prisma enums of the same names. */
export type ApplicantType = "SAUDI_CITIZEN" | "RESIDENT";
export type TravelPurpose = "TOURISM" | "BUSINESS" | "STUDY" | "MEDICAL" | "FAMILY_VISIT";
export type VisaKind = "VISA_FREE" | "E_VISA" | "ETA" | "STICKER" | "VISA_ON_ARRIVAL";
export type EntryType = "SINGLE" | "DOUBLE" | "MULTIPLE";
export type Region = "EUROPE" | "ASIA" | "AMERICAS" | "MIDDLE_EAST" | "AFRICA" | "OCEANIA";
export type InsurancePlanId = "SCHENGEN" | "TURKEY" | "GEORGIA" | "USA_CANADA" | "WORLDWIDE";

export type DocumentType =
  | "PASSPORT"
  | "PERSONAL_PHOTO"
  | "NATIONAL_ID"
  | "IQAMA"
  | "BANK_STATEMENT"
  | "SALARY_CERTIFICATE"
  | "EMPLOYMENT_LETTER"
  | "COMMERCIAL_REGISTRATION"
  | "HOTEL_BOOKING"
  | "FLIGHT_BOOKING"
  | "TRAVEL_INSURANCE"
  | "UNIVERSITY_ACCEPTANCE"
  | "MEDICAL_REPORT"
  | "INVITATION_LETTER"
  | "FAMILY_RECORD"
  | "BIRTH_CERTIFICATE"
  | "OTHER";

export interface Requirement {
  doc: DocumentType;
  title: L10n;
  details?: L10n;
  /** Only for this applicant type; omit = everyone. */
  applicant?: ApplicantType;
  optional?: boolean;
}

export interface PriceOption {
  applicant: ApplicantType;
  eligible: boolean;
  /** Embassy / government fee in halalas (SAR × 100). 0 when free. */
  governmentFee: Halalas;
  /** myvisa service fee in halalas, before VAT. */
  serviceFee: Halalas;
  /** E.g. "Fee set in EUR; SAR amount varies with the exchange rate." */
  note?: L10n;
  /** Shown when eligible = false. */
  ineligibleReason?: L10n;
}

export interface VisaOption {
  /** Unique slug, e.g. "tr-tourism-evisa". */
  id: string;
  purpose: TravelPurpose;
  kind: VisaKind;
  name: L10n;
  entry: EntryType;
  validityDays: number;
  maxStayDays: number;
  /** Working days, [min, max]. */
  processingDays: readonly [number, number];
  appointment: boolean;
  appointmentNote?: L10n;
  pricing: PriceOption[];
  requirements: Requirement[];
}

export interface Faq {
  q: L10n;
  a: L10n;
}

export interface Destination {
  slug: string;
  iso2: string;
  /** Main airport, used on stamps and route visuals. */
  iata: string;
  lat: number;
  lon: number;
  name: L10n;
  capital: L10n;
  region: Region;
  schengen: boolean;
  popular: boolean;
  /** One evocative line for cards (≤ 60 chars). */
  tagline: L10n;
  /** 2–3 sentences for the destination page. */
  overview: L10n;
  /** Unsplash photo id (the part after "photo-"), verified to depict this country. */
  imageId: string;
  imageAlt: L10n;
  bestTime: L10n;
  /** Approximate direct/one-stop flight time from Riyadh, hours. */
  flightHours: number;
  currency: string;
  visas: VisaOption[];
  faqs: Faq[];
  insurance?: InsurancePlanId;
}

export interface Nationality {
  iso2: string;
  name: L10n;
}
