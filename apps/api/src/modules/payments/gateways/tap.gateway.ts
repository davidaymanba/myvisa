import { createHmac } from "node:crypto";
import type { PaymentMethod } from "@myvisa/db";
import { safeEqual } from "../../../common/crypto";
import { type CheckoutRequest, type GatewayPayment, type PaymentGateway, WebhookRejected } from "./gateway";

interface TapCharge {
  id: string;
  status: string;
  amount: number;
  currency?: string;
  created?: string | number;
  transaction?: { url?: string; created?: string | number };
  reference?: { gateway?: string; payment?: string };
  source?: { payment_method?: string };
  card?: { last_four?: string; brand?: string };
  response?: { message?: string };
}

const toHalalas = (sar: number) => Math.round(sar * 100);
const toSar = (halalas: number) => Number((halalas / 100).toFixed(2));

export function tapMethod(charge: Pick<TapCharge, "source" | "card">): PaymentMethod | null {
  const m = (charge.source?.payment_method ?? charge.card?.brand ?? "").toUpperCase().replace(/[\s-]/g, "_");
  if (m.includes("MADA")) return "MADA";
  if (m.includes("APPLE")) return "APPLE_PAY";
  if (m.includes("STC")) return "STC_PAY";
  if (m.includes("MASTER")) return "MASTERCARD";
  if (m.includes("VISA")) return "VISA";
  return null;
}

/** Tap's documented webhook hash: HMAC-SHA256 over a fixed concatenation of charge fields. */
export function tapHashString(charge: TapCharge, secret: string): string {
  const amount = Number(charge.amount).toFixed(2);
  const message = `x_id${charge.id}x_amount${amount}x_currency${charge.currency ?? ""}x_gateway_reference${charge.reference?.gateway ?? ""}x_payment_reference${charge.reference?.payment ?? ""}x_status${charge.status}x_created${charge.transaction?.created ?? charge.created ?? ""}`;
  return createHmac("sha256", secret).update(message).digest("hex");
}

/** Tap Charges API with `src_all`: Tap's hosted page offers every enabled method. https://developers.tap.company */
export class TapGateway implements PaymentGateway {
  readonly name = "tap" as const;
  private readonly base = "https://api.tap.company/v2";

  constructor(
    private readonly secretKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await this.fetchImpl(`${this.base}${path}`, {
      ...init,
      headers: { authorization: `Bearer ${this.secretKey}`, "content-type": "application/json", ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => ({}))) as T & { errors?: { description?: string }[] };
    if (!res.ok) throw new Error(`tap ${path}: ${res.status} ${json.errors?.[0]?.description ?? ""}`.trim());
    return json;
  }

  async createCheckout(req: CheckoutRequest) {
    const charge = await this.call<TapCharge>("/charges", {
      method: "POST",
      body: JSON.stringify({
        amount: toSar(req.amountHalalas),
        currency: "SAR",
        description: req.description,
        source: { id: "src_all" },
        redirect: { url: req.returnUrl },
        post: { url: req.callbackUrl },
        reference: { transaction: req.paymentId, order: req.orderNumber },
        metadata: req.metadata,
      }),
    });
    if (!charge.transaction?.url) throw new Error("tap: charge has no checkout url");
    return { providerPaymentId: charge.id, redirectUrl: charge.transaction.url };
  }

  async fetch(chargeId: string): Promise<GatewayPayment> {
    const charge = await this.call<TapCharge>(`/charges/${encodeURIComponent(chargeId)}`);
    const status = charge.status === "CAPTURED" ? "PAID" : ["INITIATED", "IN_PROGRESS", "AUTHORIZED"].includes(charge.status) ? "PENDING" : "FAILED";
    return {
      status,
      amountHalalas: toHalalas(charge.amount),
      method: tapMethod(charge),
      cardLast4: charge.card?.last_four ?? null,
      failureReason: status === "FAILED" ? (charge.response?.message ?? charge.status) : null,
      raw: charge,
    };
  }

  /** Verifies the `hashstring` header; the charge is still re-fetched before anything is trusted. */
  parseWebhook(headers: Record<string, string | string[] | undefined>, body: unknown) {
    const charge = body as TapCharge;
    if (!charge?.id || !charge.status) throw new WebhookRejected("not a charge");
    const hash = headers.hashstring;
    if (typeof hash !== "string" || !safeEqual(hash, tapHashString(charge, this.secretKey))) throw new WebhookRejected("bad hashstring");
    return { eventId: `${charge.id}:${charge.status}`, providerPaymentId: charge.id, type: `charge.${charge.status.toLowerCase()}` };
  }
}
