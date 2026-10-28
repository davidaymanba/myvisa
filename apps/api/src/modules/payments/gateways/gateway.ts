import type { PaymentMethod } from "@myvisa/db";

export interface CheckoutRequest {
  paymentId: string;
  orderNumber: string;
  amountHalalas: number;
  description: string;
  /** Where the customer's browser lands after paying (our confirmation page). */
  returnUrl: string;
  /** Server-to-server webhook URL. */
  callbackUrl: string;
  /** Locale prefix for hosted pages we render ourselves (mock gateway). */
  locale: "ar" | "en";
  metadata: Record<string, string>;
}

export interface CheckoutResult {
  providerPaymentId: string;
  redirectUrl: string;
}

/** The gateway's own view of a payment — always re-fetched from its API, never trusted from a webhook body. */
export interface GatewayPayment {
  status: "PAID" | "FAILED" | "PENDING";
  amountHalalas: number;
  method: PaymentMethod | null;
  cardLast4: string | null;
  failureReason: string | null;
  raw: unknown;
}

export interface WebhookNotice {
  /** Unique per delivery-worthy event; duplicates are dropped. */
  eventId: string;
  providerPaymentId: string;
  type: string;
}

export interface GatewayRefund {
  providerRefundId: string;
  /** Some gateways settle refunds asynchronously. */
  status: "COMPLETED" | "PROCESSING" | "FAILED";
  raw: unknown;
}

export interface PaymentGateway {
  readonly name: "mock" | "moyasar" | "tap";
  createCheckout(req: CheckoutRequest): Promise<CheckoutResult>;
  fetch(providerPaymentId: string): Promise<GatewayPayment>;
  /** Refunds part or all of a captured payment back to the original method. */
  refund(providerPaymentId: string, amountHalalas: number, reason: string): Promise<GatewayRefund>;
  /** Verifies authenticity and extracts the event. Throws `WebhookRejected` when it can't be trusted. */
  parseWebhook(headers: Record<string, string | string[] | undefined>, body: unknown): WebhookNotice;
}

export class WebhookRejected extends Error {}

export const PAYMENT_GATEWAY = Symbol("PAYMENT_GATEWAY");

export function lastFour(number: string | undefined | null): string | null {
  const digits = number?.replace(/\D/g, "") ?? "";
  return digits.length >= 4 ? digits.slice(-4) : null;
}
