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
