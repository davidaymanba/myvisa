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
