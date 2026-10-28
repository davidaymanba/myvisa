import { z } from "../zod";
import { ORDER_STATUSES, type OrderStatus } from "../order-status";
import { saudiMobileSchema } from "../phone";
import { STAFF_ROLES, type UserRole } from "../rbac";
import { nullableText } from "./fields";
import type { InvoiceSummary, OrderTimelineView } from "./account";
import { APPOINTMENT_CITIES, type OrderView, type PaymentStatus } from "./orders";

// ── Orders (staff) ──────────────────────────────────────────────────────────

export const ADMIN_ORDER_VIEWS = ["open", "mine", "unassigned", "overdue", "closed", "all"] as const;
export type AdminOrderViewKey = (typeof ADMIN_ORDER_VIEWS)[number];

export const adminOrderQuerySchema = z.object({
  view: z.enum(ADMIN_ORDER_VIEWS).default("open"),
  status: z.enum(ORDER_STATUSES).optional(),
  assigneeId: z.string().max(40).optional(),
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
  pageSize: z.coerce.number().int().min(10).max(300).default(50),
});
export type AdminOrderQuery = z.input<typeof adminOrderQuerySchema>;

export interface StaffRef {
  id: string;
  name: string;
  role: UserRole;
}

export interface AdminOrderRow {
  id: string;
  number: string;
  status: OrderStatus;
  service: { ar: string; en: string };
  destination: { iso2: string; iata: string | null; name: { ar: string; en: string } } | null;
  customer: { id: string; name: string | null; phone: string };
  travelers: number;
  totalHalalas: number;
  assignee: StaffRef | null;
  slaDueAt: string | null;
  /** SLA passed while the ball is in our court. */
  overdue: boolean;
  /** Files waiting for review / customer messages waiting for a reply. */
  pendingDocuments: number;
  unreadMessages: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrderPage {
  items: AdminOrderRow[];
  total: number;
  page: number;
  pageSize: number;
  /** Count per status for the current view (before the status filter): kanban column headers. */
  counts: Partial<Record<OrderStatus, number>>;
}

export interface InternalNoteView {
  id: string;
  body: string;
  author: StaffRef;
  createdAt: string;
}

export interface AdminPaymentView {
  id: string;
  provider: string;
  method: string | null;
  status: PaymentStatus;
  amountHalalas: number;
  refundedHalalas: number;
  cardLast4: string | null;
  paidAt: string | null;
  createdAt: string;
  refunds: { id: string; amountHalalas: number; reason: string; status: "REQUESTED" | "PROCESSING" | "COMPLETED" | "FAILED"; createdAt: string; creditNoteId: string | null }[];
}

export interface AdminOrderDetail {
  order: OrderView;
  timeline: OrderTimelineView;
  customer: { id: string; name: string | null; phone: string; email: string | null; orders: number; memberSince: string };
  assignee: StaffRef | null;
  slaDueAt: string | null;
  overdue: boolean;
  decision: "APPROVED" | "REJECTED" | "PARTIAL" | null;
  notes: InternalNoteView[];
  payments: AdminPaymentView[];
  invoices: InvoiceSummary[];
  /** Statuses this order may move to next (the state machine, minus customer-only moves). */
  nextStatuses: OrderStatus[];
}

export const DECISIONS = ["APPROVED", "REJECTED", "PARTIAL"] as const;

export const statusChangeSchema = z
  .object({
    to: z.enum(ORDER_STATUSES),
    /** Shown to the customer on the timeline and in the notification. */
    customerNote: nullableText(1000),
    decision: z
      .enum(DECISIONS)
      .nullish()
      .transform((v) => v ?? null),
  })
  .superRefine((v, ctx) => {
    if (v.to === "DECISION_ISSUED" && !v.decision) ctx.addIssue({ code: "custom", path: ["decision"], message: "decision_required" });
    if (v.to === "ACTION_REQUIRED" && !v.customerNote) ctx.addIssue({ code: "custom", path: ["customerNote"], message: "note_required" });
  });
export type StatusChangeInput = z.input<typeof statusChangeSchema>;

export const assignSchema = z.object({
  assigneeId: z
    .string()
    .max(40)
    .nullish()
    .transform((v) => v ?? null),
});
export type AssignInput = z.input<typeof assignSchema>;

export const noteSchema = z.object({ body: z.string().trim().min(1).max(4000) });
export type NoteInput = z.input<typeof noteSchema>;

export const documentReviewSchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED"]),
    reason: nullableText(300),
  })
  .superRefine((v, ctx) => {
    if (v.status === "REJECTED" && !v.reason) ctx.addIssue({ code: "custom", path: ["reason"], message: "reason_required" });
  });
export type DocumentReviewInput = z.input<typeof documentReviewSchema>;

export const VISA_CENTERS = ["EMBASSY", "VFS_GLOBAL", "TLS_CONTACT", "BLS_INTERNATIONAL", "OTHER"] as const;

export const appointmentSchema = z.object({
  center: z.enum(VISA_CENTERS),
  city: z.enum(APPOINTMENT_CITIES),
  /** ISO date-time (the admin form sends Riyadh local time with offset). */
  scheduledAt: z.iso.datetime({ offset: true }),
  reference: nullableText(60),
});
export type AppointmentInput = z.input<typeof appointmentSchema>;

export const SHIPMENT_DIRECTIONS = ["PICKUP", "DELIVERY"] as const;
export const SHIPMENT_STATUSES = ["PENDING", "IN_TRANSIT", "DELIVERED", "FAILED"] as const;

export const shipmentSchema = z.object({
  direction: z.enum(SHIPMENT_DIRECTIONS),
  carrier: z.string().trim().min(1).max(60),
  trackingNumber: nullableText(60),
  status: z.enum(SHIPMENT_STATUSES).default("PENDING"),
});
export type ShipmentInput = z.input<typeof shipmentSchema>;

export const shipmentUpdateSchema = z.object({
  status: z.enum(SHIPMENT_STATUSES),
  trackingNumber: nullableText(60),
});

export const refundSchema = z.object({
  paymentId: z.string().min(1).max(40),
  amountHalalas: z.number().int().min(1),
  reason: z.string().trim().min(3).max(300),
});
export type RefundInput = z.input<typeof refundSchema>;

// ── Coupons ─────────────────────────────────────────────────────────────────

export const couponInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,40}$/, "coupon_code"),
    kind: z.enum(["PERCENT", "FIXED"]),
    value: z.number().int().min(1),
    maxDiscountHalalas: z.number().int().min(1).nullish().transform((v) => v ?? null),
    minOrderHalalas: z.number().int().min(1).nullish().transform((v) => v ?? null),
    maxRedemptions: z.number().int().min(1).nullish().transform((v) => v ?? null),
    perUserLimit: z.number().int().min(1).max(100).default(1),
    startsAt: z.iso.datetime({ offset: true }).nullish().transform((v) => v ?? null),
    endsAt: z.iso.datetime({ offset: true }).nullish().transform((v) => v ?? null),
    isActive: z.boolean().default(true),
    /** Empty = every service. */
    serviceSlugs: z.array(z.string().trim().min(1).max(80)).max(200).default([]),
  })
  .superRefine((c, ctx) => {
    if (c.kind === "PERCENT" && c.value > 100) ctx.addIssue({ code: "custom", path: ["value"], message: "percent_max" });
    if (c.startsAt && c.endsAt && c.endsAt <= c.startsAt) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "date_order" });
  });
export type CouponInput = z.input<typeof couponInputSchema>;

export interface CouponView {
  id: string;
  code: string;
  kind: "PERCENT" | "FIXED";
  value: number;
  maxDiscountHalalas: number | null;
  minOrderHalalas: number | null;
  maxRedemptions: number | null;
  perUserLimit: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  serviceSlugs: string[];
  redemptions: number;
  discountGivenHalalas: number;
  createdAt: string;
}

// ── Customers ───────────────────────────────────────────────────────────────

export interface CustomerRow {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  orders: number;
  paidOrders: number;
  spentHalalas: number;
  lastOrderAt: string | null;
  createdAt: string;
  isActive: boolean;
}

export interface CustomerPage {
  items: CustomerRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CustomerDetail extends CustomerRow {
  locale: "ar" | "en";
  lastLoginAt: string | null;
  travelers: { id: string; name: string; relationship: string; nationalityIso2: string; passportExpiry: string }[];
  recentOrders: AdminOrderRow[];
  consents: { type: string; granted: boolean; policyVersion: string; createdAt: string }[];
}

// ── Staff & roles ───────────────────────────────────────────────────────────

export interface StaffMember {
  id: string;
  phone: string;
  fullNameAr: string | null;
  fullNameEn: string | null;
  email: string | null;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  openOrders: number;
  createdAt: string;
}

export const staffInviteSchema = z.object({
  phone: saudiMobileSchema,
  role: z.enum(STAFF_ROLES),
  fullNameAr: nullableText(120),
  fullNameEn: nullableText(120),
  email: z
    .email()
    .nullish()
    .transform((v) => v ?? null),
});
export type StaffInviteInput = z.input<typeof staffInviteSchema>;

export const staffUpdateSchema = z.object({
  role: z.enum(["CUSTOMER", ...STAFF_ROLES]),
  isActive: z.boolean(),
});
export type StaffUpdateInput = z.input<typeof staffUpdateSchema>;

// ── Reports ─────────────────────────────────────────────────────────────────

export const reportQuerySchema = z.object({
  from: z.iso.date(),
  to: z.iso.date(),
});
export type ReportQuery = z.input<typeof reportQuerySchema>;

export interface ReportOverview {
  range: { from: string; to: string; days: number };
  /** Same-length period just before, for deltas. */
  previous: { from: string; to: string };
  kpis: {
    paidOrders: { value: number; previous: number };
    revenueHalalas: { value: number; previous: number };
    /** Our service fees after discount, excl. VAT — what we actually earn. */
    netServiceHalalas: { value: number; previous: number };
    governmentHalalas: { value: number; previous: number };
    vatHalalas: { value: number; previous: number };
    refundsHalalas: { value: number; previous: number };
    /** Paid ÷ started (drafts created in the period). 0–1. */
    conversion: { value: number; previous: number };
    averageOrderHalalas: { value: number; previous: number };
    /** Hours from payment to the first staff action. */
    medianFirstResponseHours: { value: number | null; previous: number | null };
    approvalRate: { value: number | null; previous: number | null };
  };
  /** Right now, not period-bound. */
  live: { open: number; overdue: number; actionRequired: number; unassigned: number; pendingDocuments: number; unreadMessages: number };
  daily: { date: string; orders: number; revenueHalalas: number }[];
  funnel: { started: number; submitted: number; paid: number; decided: number; delivered: number };
  byStatus: Partial<Record<OrderStatus, number>>;
  topDestinations: { iso2: string; name: { ar: string; en: string }; orders: number; revenueHalalas: number }[];
  agents: { id: string; name: string; open: number; overdue: number; handled: number }[];
}
