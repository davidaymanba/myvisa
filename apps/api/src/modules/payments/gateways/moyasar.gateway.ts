import type { PaymentMethod } from "@myvisa/db";
import { safeEqual } from "../../../common/crypto";
import { type CheckoutRequest, type GatewayPayment, type GatewayRefund, type PaymentGateway, WebhookRejected, lastFour } from "./gateway";

interface MoyasarSource {
  type?: string;
  company?: string;
  number?: string;
  message?: string;
}
interface MoyasarPayment {
  id: string;
  status: string;
  amount: number;
  source?: MoyasarSource;
}
interface MoyasarInvoice {
  id: string;
  status: string;
  amount: number;
  url?: string;
  payments?: MoyasarPayment[];
}

/** Moyasar source → our method enum. Cards report the scheme in `company`. */
export function moyasarMethod(source: MoyasarSource | undefined): PaymentMethod | null {
  switch (source?.type) {
    case "applepay":
      return "APPLE_PAY";
    case "stcpay":
      return "STC_PAY";
    case "creditcard":
    case "mada":
      return source.company === "mada" || source.type === "mada" ? "MADA" : source.company === "master" ? "MASTERCARD" : source.company === "visa" ? "VISA" : null;
    default:
      return null;
  }
}

/**
 * Moyasar Invoices API: a hosted page that offers mada, Visa, Mastercard, Apple Pay and STC Pay.
 * Amounts are integer halalas, same as ours. https://docs.moyasar.com
 */
export class MoyasarGateway implements PaymentGateway {
  readonly name = "moyasar" as const;
  private readonly base = "https://api.moyasar.com/v1";

  constructor(
    private readonly secretKey: string,
    private readonly webhookSecret: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await this.fetchImpl(`${this.base}${path}`, {
      ...init,
      headers: { authorization: `Basic ${Buffer.from(`${this.secretKey}:`).toString("base64")}`, "content-type": "application/json", ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => ({}))) as T & { message?: string };
    if (!res.ok) throw new Error(`moyasar ${path}: ${res.status} ${json.message ?? ""}`.trim());
    return json;
  }

  async createCheckout(req: CheckoutRequest) {
    const invoice = await this.call<MoyasarInvoice>("/invoices", {
      method: "POST",
      body: JSON.stringify({
        amount: req.amountHalalas,
        currency: "SAR",
        description: req.description,
        callback_url: req.callbackUrl,
        success_url: req.returnUrl,
        back_url: req.returnUrl,
        metadata: { ...req.metadata, payment_id: req.paymentId, order_number: req.orderNumber },
      }),
    });
    if (!invoice.url) throw new Error("moyasar: invoice has no checkout url");
    return { providerPaymentId: invoice.id, redirectUrl: invoice.url };
  }

  /** Our payment id is the invoice; the refund goes to the invoice's captured payment. */
  async refund(invoiceId: string, amountHalalas: number): Promise<GatewayRefund> {
    const invoice = await this.call<MoyasarInvoice>(`/invoices/${encodeURIComponent(invoiceId)}`);
    const paid = invoice.payments?.find((p) => p.status === "paid" || p.status === "refunded");
    if (!paid) throw new Error("moyasar: invoice has no captured payment");
    const payment = await this.call<MoyasarPayment>(`/payments/${encodeURIComponent(paid.id)}/refund`, { method: "POST", body: JSON.stringify({ amount: amountHalalas }) });
    return { providerRefundId: `${payment.id}:${amountHalalas}:${Date.now()}`, status: payment.status === "refunded" ? "COMPLETED" : "PROCESSING", raw: payment };
  }

  async fetch(invoiceId: string): Promise<GatewayPayment> {
    const invoice = await this.call<MoyasarInvoice>(`/invoices/${encodeURIComponent(invoiceId)}`);
    const payments = invoice.payments ?? [];
    const paid = payments.find((p) => p.status === "paid");
    const last = paid ?? payments.at(-1);
    const status = invoice.status === "paid" || paid ? "PAID" : ["failed", "expired", "canceled", "voided"].includes(invoice.status) ? "FAILED" : "PENDING";
    return {
      status,
      amountHalalas: paid?.amount ?? invoice.amount,
      method: moyasarMethod(last?.source),
      cardLast4: lastFour(last?.source?.number),
      failureReason: status === "FAILED" ? (last?.source?.message ?? invoice.status) : last?.status === "failed" ? (last.source?.message ?? "failed") : null,
      raw: invoice,
    };
  }

  /** Moyasar signs nothing; it echoes the shared `secret_token` in the body. */
  parseWebhook(_headers: Record<string, string | string[] | undefined>, body: unknown) {
    const event = body as { id?: string; type?: string; secret_token?: string; data?: { id?: string; invoice_id?: string } };
    if (typeof event?.secret_token !== "string" || !safeEqual(event.secret_token, this.webhookSecret)) throw new WebhookRejected("bad secret_token");
    const invoiceId = event.data?.invoice_id;
    if (!event.id || !invoiceId) throw new WebhookRejected("missing event id or invoice id");
    return { eventId: event.id, providerPaymentId: invoiceId, type: event.type ?? "unknown" };
  }
}
