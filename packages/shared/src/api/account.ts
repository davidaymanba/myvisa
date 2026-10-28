import { z } from "../zod";
import type { OrderStatus } from "../order-status";
import { saudiMobileSchema } from "../phone";
import { APPLICANT_TYPES, DOCUMENT_TYPES } from "./catalog-admin";
import { nullableText } from "./fields";
import { GENDERS, RELATIONSHIPS, type ScanStatus } from "./orders";

// ── Profile ─────────────────────────────────────────────────────────────────

export const profileUpdateSchema = z.object({
  fullNameAr: nullableText(120),
  fullNameEn: nullableText(120),
  email: z
    .email()
    .max(200)
    .nullish()
    .transform((v) => v ?? null),
  locale: z.enum(["ar", "en"]),
  marketing: z.boolean(),
});
export type ProfileUpdateInput = z.input<typeof profileUpdateSchema>;

export interface ProfileView {
  id: string;
  phone: string;
  fullNameAr: string | null;
  fullNameEn: string | null;
  email: string | null;
  locale: "ar" | "en";
  marketing: boolean;
  memberSince: string;
}

/** Counters for the dashboard header and the nav badges. */
export interface AccountSummary {
  activeOrders: number;
  actionRequired: number;
  drafts: number;
  travelers: number;
  documents: number;
  /** Passports (saved travellers) expiring within 6 months. */
  expiringSoon: number;
  unreadNotifications: number;
  unreadMessages: number;
}

// ── Saved travellers (the family) ───────────────────────────────────────────

export interface SavedTravelerView {
  id: string;
  relationship: (typeof RELATIONSHIPS)[number];
  givenNameEn: string;
  surnameEn: string;
  fullNameAr: string | null;
  gender: (typeof GENDERS)[number];
  dateOfBirth: string;
  nationalityIso2: string;
  applicantType: (typeof APPLICANT_TYPES)[number];
  passportNumberMasked: string;
  passportExpiry: string;
  documents: number;
  orders: number;
  createdAt: string;
}

// ── Document vault ──────────────────────────────────────────────────────────

export const VAULT_MIME = ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/webp"] as const;
export const VAULT_MAX_MB = 15;

export const vaultPresignSchema = z.object({
  type: z.enum(DOCUMENT_TYPES),
  travelerId: z
    .string()
    .min(1)
    .max(40)
    .nullish()
    .transform((v) => v ?? null),
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.enum(VAULT_MIME),
  sizeBytes: z
    .number()
    .int()
    .min(1)
    .max(VAULT_MAX_MB * 1024 * 1024),
  expiresOn: z.iso
    .date()
    .nullish()
    .transform((v) => v ?? null),
});
export type VaultPresignInput = z.input<typeof vaultPresignSchema>;

export interface VaultPresignResult {
  documentId: string;
  uploadUrl: string;
  headers: Record<string, string>;
  expiresIn: number;
}

export interface VaultDocumentView {
  id: string;
  type: (typeof DOCUMENT_TYPES)[number];
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  scanStatus: ScanStatus;
  uploaded: boolean;
  expiresOn: string | null;
  travelerId: string | null;
  /** True when it was saved to the vault on purpose (not only uploaded for an order). */
  inVault: boolean;
  orders: { id: string; number: string }[];
  createdAt: string;
}

/** Reuse a file already in the vault for an order requirement (no re-upload). */
export const attachDocumentSchema = z.object({
  documentId: z.string().min(1).max(40),
  requirementId: z.string().min(1).max(40),
  orderTravelerId: z
    .string()
    .min(1)
    .max(40)
    .nullish()
    .transform((v) => v ?? null),
});
export type AttachDocumentInput = z.input<typeof attachDocumentSchema>;

// ── Order timeline ──────────────────────────────────────────────────────────

export interface TimelineEvent {
  id: string;
  status: OrderStatus;
  note: string | null;
  at: string;
}

export interface OrderTimelineView {
  events: TimelineEvent[];
  appointment: { center: string; city: string; scheduledAt: string; reference: string | null } | null;
  shipments: { direction: "PICKUP" | "DELIVERY"; carrier: string; trackingNumber: string | null; status: "PENDING" | "IN_TRANSIT" | "DELIVERED" | "FAILED"; updatedAt: string }[];
  decision: "APPROVED" | "REJECTED" | "PARTIAL" | null;
  /** Invoices issued for this order (newest first). */
  invoices: InvoiceSummary[];
}

// ── Messages ────────────────────────────────────────────────────────────────

export const messageCreateSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  attachmentDocumentId: z
    .string()
    .min(1)
    .max(40)
    .nullish()
    .transform((v) => v ?? null),
});
export type MessageCreateInput = z.input<typeof messageCreateSchema>;

export interface MessageView {
  id: string;
  sender: "CUSTOMER" | "STAFF" | "SYSTEM";
  /** First name of the agent for staff messages; null otherwise. */
  senderName: string | null;
  body: string;
  attachment: { documentId: string; name: string; mimeType: string } | null;
  createdAt: string;
  readAt: string | null;
}

// ── Notifications ───────────────────────────────────────────────────────────

export interface NotificationView {
  id: string;
  template: string;
  title: string;
  body: string;
  /** Where the notification leads (site-relative, locale-less path). */
  href: string | null;
  orderNumber: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPage {
  items: NotificationView[];
  nextCursor: string | null;
  unread: number;
}

// ── Public tracking (order number + phone OTP) ──────────────────────────────

export const ORDER_NUMBER_RE = /^MV-\d{2}-[0-9A-HJKMNP-TV-Z]{6}$/;
const orderNumberField = z
  .string()
  .trim()
  .toUpperCase()
  .transform((v) => v.replace(/\s+/g, ""))
  .pipe(z.string().regex(ORDER_NUMBER_RE, "order_number"));

export const trackRequestSchema = z.object({ orderNumber: orderNumberField, phone: saudiMobileSchema });
export type TrackRequestInput = z.input<typeof trackRequestSchema>;

export const trackVerifySchema = trackRequestSchema.extend({ code: z.string().trim().regex(/^\d{6}$/, "otp_format") });
export type TrackVerifyInput = z.input<typeof trackVerifySchema>;

/** What an unauthenticated (OTP-verified) visitor may see: no names, passports, documents or prices. */
export interface TrackView {
  number: string;
  status: OrderStatus;
  decision: "APPROVED" | "REJECTED" | "PARTIAL" | null;
  service: { ar: string; en: string };
  destination: { slug: string; iso2: string; iata: string | null; name: { ar: string; en: string } } | null;
  travelers: number;
  processingDays: [number, number];
  createdAt: string;
  events: TimelineEvent[];
  appointment: { city: string; scheduledAt: string } | null;
}

export interface TrackSession {
  token: string;
  expiresIn: number;
  view: TrackView;
}

// ── Invoices (ZATCA) ────────────────────────────────────────────────────────

export interface InvoiceSummary {
  id: string;
  number: string;
  type: "SIMPLIFIED" | "STANDARD" | "CREDIT_NOTE";
  issuedAt: string;
  totalHalalas: number;
  orderId: string;
  orderNumber: string;
  zatcaStatus: "PENDING" | "REPORTED" | "CLEARED" | "REJECTED";
}

export interface InvoiceLineView {
  description: { ar: string; en: string };
  quantity: number;
  unitPriceHalalas: number;
  vatCategory: "S" | "O";
  vatRate: number;
  vatHalalas: number;
  lineTotalHalalas: number;
}

export interface InvoiceView extends InvoiceSummary {
  uuid: string;
  icv: number;
  seller: { name: { ar: string; en: string }; vatNumber: string; crNumber: string; address: { ar: string; en: string } };
  buyer: { name: string | null; phone: string; vatNumber: string | null };
  lines: InvoiceLineView[];
  subtotalHalalas: number;
  vatHalalas: number;
  invoiceHash: string;
  /** Base64 TLV payload to render as the QR code. */
  qrPayload: string;
}
