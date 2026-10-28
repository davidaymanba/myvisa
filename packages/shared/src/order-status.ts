/** Keep in sync with `enum OrderStatus` in packages/db/prisma/schema.prisma. */
export const ORDER_STATUSES = [
  "DRAFT",
  "PENDING_PAYMENT",
  "RECEIVED",
  "DOCUMENTS_REVIEW",
  "ACTION_REQUIRED",
  "APPOINTMENT_BOOKED",
  "SUBMITTED_TO_EMBASSY",
  "DECISION_ISSUED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** The six customer-facing milestones on the boarding-pass timeline. */
export const TRACKING_STEPS = [
  "RECEIVED",
  "DOCUMENTS_REVIEW",
  "APPOINTMENT_BOOKED",
  "SUBMITTED_TO_EMBASSY",
  "DECISION_ISSUED",
  "DELIVERED",
] as const;

export type TrackingStep = (typeof TRACKING_STEPS)[number];

/**
 * Index of the milestone the order is currently at, or -1 before it has been received.
 * ACTION_REQUIRED sits on the documents step (the customer owes us something).
 */
export function trackingStepIndex(status: OrderStatus): number {
  if (status === "ACTION_REQUIRED") return TRACKING_STEPS.indexOf("DOCUMENTS_REVIEW");
  if (status === "REFUNDED" || status === "CANCELLED" || status === "DRAFT" || status === "PENDING_PAYMENT") return -1;
  return TRACKING_STEPS.indexOf(status);
}

/**
 * Allowed transitions — the order state machine. Anything not listed is refused by the API.
 * Customers drive DRAFT ⇄ PENDING_PAYMENT; payment moves it to RECEIVED; staff take it from there (Phase 6).
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  DRAFT: ["PENDING_PAYMENT", "CANCELLED"],
  PENDING_PAYMENT: ["DRAFT", "RECEIVED", "CANCELLED"],
  RECEIVED: ["DOCUMENTS_REVIEW", "ACTION_REQUIRED", "CANCELLED", "REFUNDED"],
  DOCUMENTS_REVIEW: ["ACTION_REQUIRED", "APPOINTMENT_BOOKED", "SUBMITTED_TO_EMBASSY", "CANCELLED", "REFUNDED"],
  ACTION_REQUIRED: ["DOCUMENTS_REVIEW", "CANCELLED", "REFUNDED"],
  APPOINTMENT_BOOKED: ["SUBMITTED_TO_EMBASSY", "ACTION_REQUIRED", "CANCELLED", "REFUNDED"],
  SUBMITTED_TO_EMBASSY: ["DECISION_ISSUED"],
  DECISION_ISSUED: ["DELIVERED", "REFUNDED"],
  DELIVERED: [],
  CANCELLED: [],
  REFUNDED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

/** Moves only the customer or the payment flow may make; staff never set these by hand. */
const NOT_BY_STAFF: readonly OrderStatus[] = ["DRAFT", "PENDING_PAYMENT", "RECEIVED"];

/** Where staff may take an order next. Paid orders only (drafts belong to the customer). */
export function staffTransitions(from: OrderStatus): OrderStatus[] {
  if (from === "DRAFT" || from === "PENDING_PAYMENT") return [];
  return ORDER_TRANSITIONS[from].filter((s) => !NOT_BY_STAFF.includes(s));
}

/** Statuses where the next move is ours (the SLA clock runs); elsewhere we wait on the customer, a centre or an embassy. */
export const OUR_TURN: readonly OrderStatus[] = ["RECEIVED", "DOCUMENTS_REVIEW", "DECISION_ISSUED"];

/**
 * SLA per status, in hours from entering it. `null` = no SLA (the customer, the visa centre or the
 * embassy holds the order). RECEIVED honours the "first review within 2 working hours" promise with slack.
 */
export const SLA_HOURS: Record<OrderStatus, number | null> = {
  DRAFT: null,
  PENDING_PAYMENT: null,
  RECEIVED: 4,
  DOCUMENTS_REVIEW: 24,
  ACTION_REQUIRED: null,
  APPOINTMENT_BOOKED: null,
  SUBMITTED_TO_EMBASSY: null,
  DECISION_ISSUED: 72,
  DELIVERED: null,
  CANCELLED: null,
  REFUNDED: null,
};

export function slaDueAt(status: OrderStatus, from: Date = new Date()): Date | null {
  const hours = SLA_HOURS[status];
  return hours === null ? null : new Date(from.getTime() + hours * 3_600_000);
}

export const CLOSED_STATUSES: readonly OrderStatus[] = ["DELIVERED", "CANCELLED", "REFUNDED"];
