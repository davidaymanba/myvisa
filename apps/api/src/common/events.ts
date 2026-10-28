import type { OrderStatus } from "@myvisa/shared";

/**
 * In-process domain events (@nestjs/event-emitter). They decouple orders, payments and notifications:
 * payments announce what happened, orders move the state machine, notifications tell the customer.
 */
export const EVENTS = {
  paymentSucceeded: "payment.succeeded",
  paymentFailed: "payment.failed",
  orderStatusChanged: "order.status_changed",
  messageCreated: "message.created",
} as const;

export interface PaymentSucceededEvent {
  orderId: string;
  paymentId: string;
  amountHalalas: number;
}

export interface PaymentFailedEvent {
  orderId: string;
  paymentId: string;
  reason: string | null;
}

export interface OrderStatusChangedEvent {
  orderId: string;
  from: OrderStatus | null;
  to: OrderStatus;
  actorId: string | null;
  customerNote: string | null;
}

export interface MessageCreatedEvent {
  messageId: string;
  orderId: string;
  sender: "CUSTOMER" | "STAFF" | "SYSTEM";
}
