import { z } from "zod";
import type { PriceBreakdown } from "../pricing";
import type { OrderStatus } from "../order-status";
import { APPLICANT_TYPES, DOCUMENT_TYPES, TRAVEL_PURPOSES, VISA_KINDS } from "./catalog-admin";
import { nullableText } from "./fields";

export const RELATIONSHIPS = ["SELF", "SPOUSE", "CHILD", "PARENT", "SIBLING", "DOMESTIC_WORKER", "OTHER"] as const;
export const GENDERS = ["MALE", "FEMALE"] as const;
export const APPOINTMENT_CITIES = ["RIYADH", "JEDDAH", "KHOBAR"] as const;

const isoDate = z.iso.date();
/** Latin letters as printed in the passport's machine-readable zone. */
const mrzName = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z][A-Z' -]*$/, "latin_name")
  .max(60);

export const travelerInputSchema = z
  .object({
    relationship: z.enum(RELATIONSHIPS),
    givenNameEn: mrzName,
    surnameEn: mrzName,
    fullNameAr: nullableText(120),
    gender: z.enum(GENDERS),
    dateOfBirth: isoDate,
    nationalityIso2: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "iso2"),
    applicantType: z.enum(APPLICANT_TYPES),
    passportNumber: z
      .string()
      .trim()
      .toUpperCase()
      .transform((v) => v.replace(/\s+/g, ""))
      .pipe(z.string().regex(/^[A-Z0-9]{6,12}$/, "passport_number")),
    passportExpiry: isoDate,
  })
  .superRefine((t, ctx) => {
    const today = new Date().toISOString().slice(0, 10);
    if (t.dateOfBirth >= today) ctx.addIssue({ code: "custom", path: ["dateOfBirth"], message: "date_past" });
    if (t.passportExpiry <= today) ctx.addIssue({ code: "custom", path: ["passportExpiry"], message: "passport_expired" });
    if (t.applicantType === "SAUDI_CITIZEN" && t.nationalityIso2 !== "SA") ctx.addIssue({ code: "custom", path: ["nationalityIso2"], message: "citizen_is_saudi" });
  });
export type TravelerInput = z.input<typeof travelerInputSchema>;
export type TravelerData = z.output<typeof travelerInputSchema>;

/** Creates or replaces a draft order. Travelers are sent whole; the server re-prices on every save. */
export const orderDraftSchema = z
  .object({
    serviceSlug: z.string().trim().min(1).max(80),
    purpose: z.enum(TRAVEL_PURPOSES).nullish().transform((v) => v ?? null),
    travelFrom: isoDate.nullish().transform((v) => v ?? null),
    travelTo: isoDate.nullish().transform((v) => v ?? null),
    travelers: z.array(travelerInputSchema).min(1).max(9),
    preferredCity: z.enum(APPOINTMENT_CITIES).nullish().transform((v) => v ?? null),
    preferredDateFrom: isoDate.nullish().transform((v) => v ?? null),
    preferredDateTo: isoDate.nullish().transform((v) => v ?? null),
    appointmentNotes: nullableText(1000),
    /** Optional receipt email, saved on the account when it has none. */
    email: z.email().nullish().transform((v) => v ?? null),
    locale: z.enum(["ar", "en"]).default("ar"),
  })
  .superRefine((o, ctx) => {
    if (o.travelFrom && o.travelTo && o.travelTo < o.travelFrom) ctx.addIssue({ code: "custom", path: ["travelTo"], message: "date_order" });
    if (o.preferredDateFrom && o.preferredDateTo && o.preferredDateTo < o.preferredDateFrom) ctx.addIssue({ code: "custom", path: ["preferredDateTo"], message: "date_order" });
  });
export type OrderDraftInput = z.input<typeof orderDraftSchema>;
export type OrderDraftData = z.output<typeof orderDraftSchema>;

/** Price check without saving (wizard step 2, before an order exists). */
export const quoteSchema = z.object({
  serviceSlug: z.string().trim().min(1).max(80),
  travelers: z.array(z.object({ applicantType: z.enum(APPLICANT_TYPES), nationalityIso2: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/) })).min(1).max(9),
  couponCode: z.string().trim().toUpperCase().max(40).optional(),
});
export type QuoteInput = z.input<typeof quoteSchema>;

export interface QuoteLine {
  index: number;
  applicantType: (typeof APPLICANT_TYPES)[number];
  nationalityIso2: string;
  eligible: boolean;
  governmentFee: number;
  serviceFee: number;
  ineligibleReason: { ar: string; en: string } | null;
}

export interface OrderQuote {
  lines: QuoteLine[];
  breakdown: PriceBreakdown;
  coupon: { code: string; valid: boolean; reason: string | null } | null;
}

/** PUT /orders/:id/submit — consents captured before payment (PDPL + refund policy). */
export const orderSubmitSchema = z.object({
  couponCode: z.string().trim().toUpperCase().max(40).nullish().transform((v) => v ?? null),
  acceptTerms: z.literal(true, { error: "consent_required" }),
  acceptDataProcessing: z.literal(true, { error: "consent_required" }),
  acceptCrossBorder: z.literal(true, { error: "consent_required" }),
  marketing: z.boolean().default(false),
});
export type OrderSubmitInput = z.input<typeof orderSubmitSchema>;

export const presignSchema = z.object({
  requirementId: z.string().min(1).max(40),
  orderTravelerId: z.string().min(1).max(40).nullish().transform((v) => v ?? null),
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/heic", "image/webp"]),
  sizeBytes: z.number().int().min(1).max(25 * 1024 * 1024),
});
export type PresignInput = z.input<typeof presignSchema>;

export interface PresignResult {
  /** OrderDocument id — what the wizard tracks. */
  id: string;
  documentId: string;
  uploadUrl: string;
  /** Headers the PUT must carry exactly (they are part of the signature). */
  headers: Record<string, string>;
  expiresIn: number;
}

export type ScanStatus = "PENDING" | "CLEAN" | "INFECTED" | "FAILED";
export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface OrderDocumentView {
  id: string;
  requirementId: string | null;
  orderTravelerId: string | null;
  reviewStatus: ReviewStatus;
  rejectionReason: string | null;
  document: { id: string; originalName: string; mimeType: string; sizeBytes: number; scanStatus: ScanStatus; uploaded: boolean; createdAt: string };
}

export interface OrderRequirementView {
  id: string;
  documentType: (typeof DOCUMENT_TYPES)[number];
  title: { ar: string; en: string };
  details: { ar: string; en: string } | null;
  isRequired: boolean;
  perTraveler: boolean;
  applicantType: (typeof APPLICANT_TYPES)[number] | null;
  acceptedMime: string[];
  maxSizeMb: number;
}

export interface OrderTravelerView {
  id: string;
  relationship: (typeof RELATIONSHIPS)[number];
  givenNameEn: string;
  surnameEn: string;
  fullNameAr: string | null;
  gender: (typeof GENDERS)[number];
  dateOfBirth: string;
  nationalityIso2: string;
  applicantType: (typeof APPLICANT_TYPES)[number];
  /** Masked, e.g. "••••••678". The full number never leaves the API in order views. */
  passportNumberMasked: string;
  passportExpiry: string;
  governmentFee: number;
  serviceFee: number;
}

export interface OrderView {
  id: string;
  number: string;
  status: OrderStatus;
  locale: "ar" | "en";
  service: {
    slug: string;
    name: { ar: string; en: string };
    purpose: (typeof TRAVEL_PURPOSES)[number] | null;
    visaKind: (typeof VISA_KINDS)[number] | null;
    processingDays: [number, number];
    requiresAppointment: boolean;
    destination: { slug: string; iso2: string; name: { ar: string; en: string }; imageId: string | null; iata: string | null } | null;
  };
  travelFrom: string | null;
  travelTo: string | null;
  preferredCity: (typeof APPOINTMENT_CITIES)[number] | null;
  preferredDateFrom: string | null;
  preferredDateTo: string | null;
  appointmentNotes: string | null;
  travelers: OrderTravelerView[];
  requirements: OrderRequirementView[];
  documents: OrderDocumentView[];
  /** True when every required document for every traveller is uploaded and scanned clean. */
  documentsComplete: boolean;
  /** The note staff left with the latest status change (e.g. what is needed when ACTION_REQUIRED). */
  statusNote: string | null;
  price: PriceBreakdown;
  coupon: { code: string } | null;
  payment: { id: string; status: PaymentStatus; provider: PaymentProviderName } | null;
  createdAt: string;
  submittedAt: string | null;
}

// ── Payments ────────────────────────────────────────────────────────────────

export const PAYMENT_PROVIDERS = ["mock", "moyasar", "tap"] as const;
export type PaymentProviderName = (typeof PAYMENT_PROVIDERS)[number];
export type PaymentStatus = "INITIATED" | "AUTHORIZED" | "PAID" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";

/** POST /orders/:id/payments with header `Idempotency-Key`. */
export interface PaymentStart {
  paymentId: string;
  /** Hosted checkout (provider page, or the local mock gateway in development). */
  redirectUrl: string;
}

export interface PaymentStatusView {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  status: PaymentStatus;
  amountHalalas: number;
  failureReason: string | null;
}
