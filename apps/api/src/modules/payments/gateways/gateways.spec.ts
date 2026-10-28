import { describe, expect, it, vi } from "vitest";
import { envSchema } from "../../../config/env";
import { WebhookRejected } from "./gateway";
import { createPaymentGateway } from "./gateway.factory";
import { MockGateway } from "./mock.gateway";
import { MoyasarGateway, moyasarMethod } from "./moyasar.gateway";
import { TapGateway, tapHashString, tapMethod } from "./tap.gateway";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const checkout = { paymentId: "pay_1", orderNumber: "MV-26-ABC123", amountHalalas: 71_385, description: "myvisa MV-26-ABC123", returnUrl: "https://myvisa.sa/apply/confirmation?order=o1&payment=pay_1", callbackUrl: "https://api.myvisa.sa/api/v1/payments/webhooks/moyasar", locale: "ar" as const, metadata: { order_id: "o1" } };

describe("Moyasar", () => {
  it("creates an invoice in halalas with basic auth and our URLs", async () => {
    const fetchImpl = vi.fn(async (_u: string | URL | Request, _i?: RequestInit) => json({ id: "inv_1", status: "initiated", amount: 71_385, url: "https://checkout.moyasar.com/invoices/inv_1" }, 201));
    const gw = new MoyasarGateway("sk_test_x", "whsec", fetchImpl as typeof fetch);
    expect(await gw.createCheckout(checkout)).toEqual({ providerPaymentId: "inv_1", redirectUrl: "https://checkout.moyasar.com/invoices/inv_1" });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).toBe("https://api.moyasar.com/v1/invoices");
    expect((init!.headers as Record<string, string>).authorization).toBe(`Basic ${Buffer.from("sk_test_x:").toString("base64")}`);
    const body = JSON.parse(init!.body as string);
    expect(body).toMatchObject({ amount: 71_385, currency: "SAR", callback_url: checkout.callbackUrl, success_url: checkout.returnUrl, metadata: { payment_id: "pay_1" } });
  });

  it("reads the paid payment, method and last four from the invoice", async () => {
    const invoice = { id: "inv_1", status: "paid", amount: 71_385, payments: [{ id: "p0", status: "failed", amount: 71_385, source: { type: "creditcard", company: "visa" } }, { id: "p1", status: "paid", amount: 71_385, source: { type: "creditcard", company: "mada", number: "4201-32XX-XXXX-1234" } }] };
    const gw = new MoyasarGateway("sk", "whsec", (async () => json(invoice)) as typeof fetch);
    expect(await gw.fetch("inv_1")).toMatchObject({ status: "PAID", amountHalalas: 71_385, method: "MADA", cardLast4: "1234" });
  });

  it("maps failed and pending invoices", async () => {
    const failed = new MoyasarGateway("sk", "w", (async () => json({ id: "i", status: "expired", amount: 100, payments: [{ id: "p", status: "failed", amount: 100, source: { type: "applepay", message: "INSUFFICIENT_FUNDS" } }] })) as typeof fetch);
    expect(await failed.fetch("i")).toMatchObject({ status: "FAILED", method: "APPLE_PAY", failureReason: "INSUFFICIENT_FUNDS" });
    const pending = new MoyasarGateway("sk", "w", (async () => json({ id: "i", status: "initiated", amount: 100, payments: [] })) as typeof fetch);
    expect((await pending.fetch("i")).status).toBe("PENDING");
  });

  it("maps every method", () => {
    expect(moyasarMethod({ type: "creditcard", company: "visa" })).toBe("VISA");
    expect(moyasarMethod({ type: "creditcard", company: "master" })).toBe("MASTERCARD");
    expect(moyasarMethod({ type: "stcpay" })).toBe("STC_PAY");
    expect(moyasarMethod(undefined)).toBeNull();
  });

  it("accepts a webhook only with the shared secret", () => {
    const gw = new MoyasarGateway("sk", "whsec_real");
    const event = { id: "evt_1", type: "payment_paid", secret_token: "whsec_real", data: { id: "p1", invoice_id: "inv_1" } };
    expect(gw.parseWebhook({}, event)).toEqual({ eventId: "evt_1", providerPaymentId: "inv_1", type: "payment_paid" });
    expect(() => gw.parseWebhook({}, { ...event, secret_token: "guess" })).toThrow(WebhookRejected);
    expect(() => gw.parseWebhook({}, { ...event, secret_token: undefined })).toThrow(WebhookRejected);
  });

  it("surfaces API errors", async () => {
    const gw = new MoyasarGateway("sk", "w", (async () => json({ message: "Invalid authorization credentials" }, 401)) as typeof fetch);
    await expect(gw.createCheckout(checkout)).rejects.toThrow(/401/);
  });
});

describe("Tap", () => {
  const charge = { id: "chg_1", status: "CAPTURED", amount: 713.85, currency: "SAR", transaction: { url: "https://checkout.tap.company/chg_1", created: "1730000000000" }, reference: { gateway: "g1", payment: "p1" }, source: { payment_method: "MADA" }, card: { last_four: "4242" } };

  it("creates a charge in SAR with src_all and our references", async () => {
    const fetchImpl = vi.fn(async (_u: string | URL | Request, _i?: RequestInit) => json({ ...charge, status: "INITIATED" }));
    const gw = new TapGateway("sk_test", fetchImpl as typeof fetch);
    expect(await gw.createCheckout(checkout)).toEqual({ providerPaymentId: "chg_1", redirectUrl: "https://checkout.tap.company/chg_1" });
    const body = JSON.parse(fetchImpl.mock.calls[0]![1]!.body as string);
    expect(body).toMatchObject({ amount: 713.85, currency: "SAR", source: { id: "src_all" }, redirect: { url: checkout.returnUrl }, reference: { transaction: "pay_1", order: "MV-26-ABC123" } });
  });

  it("maps a captured charge back to halalas", async () => {
    const gw = new TapGateway("sk", (async () => json(charge)) as typeof fetch);
    expect(await gw.fetch("chg_1")).toMatchObject({ status: "PAID", amountHalalas: 71_385, method: "MADA", cardLast4: "4242" });
    const declined = new TapGateway("sk", (async () => json({ ...charge, status: "DECLINED", response: { message: "Declined" } })) as typeof fetch);
    expect(await declined.fetch("chg_1")).toMatchObject({ status: "FAILED", failureReason: "Declined" });
  });

  it("verifies the hashstring header", () => {
    const gw = new TapGateway("sk_secret");
    const hash = tapHashString(charge, "sk_secret");
    expect(gw.parseWebhook({ hashstring: hash }, charge)).toEqual({ eventId: "chg_1:CAPTURED", providerPaymentId: "chg_1", type: "charge.captured" });
    expect(() => gw.parseWebhook({ hashstring: tapHashString(charge, "other") }, charge)).toThrow(WebhookRejected);
    expect(() => gw.parseWebhook({}, charge)).toThrow(WebhookRejected);
  });

  it("maps methods", () => {
    expect(tapMethod({ source: { payment_method: "APPLE_PAY" } })).toBe("APPLE_PAY");
    expect(tapMethod({ card: { brand: "MASTERCARD" } })).toBe("MASTERCARD");
  });
});

describe("gateway factory", () => {
  const base = { DATABASE_URL: "postgresql://x@h/x", REDIS_URL: "redis://h:1", JWT_ACCESS_SECRET: "x".repeat(40), HASH_PEPPER: "p".repeat(20), S3_ACCESS_KEY: "a", S3_SECRET_KEY: "s", DATA_ENCRYPTION_KEY: Buffer.alloc(32).toString("base64"), BLIND_INDEX_KEY: "b".repeat(20) };

  it("uses the mock in development and points it at our page", async () => {
    const gw = createPaymentGateway(envSchema.parse({ ...base, WEB_URL: "http://localhost:3100" }));
    expect(gw).toBeInstanceOf(MockGateway);
    expect((await gw.createCheckout({ ...checkout, locale: "en" })).redirectUrl).toBe("http://localhost:3100/en/pay/mock?payment=pay_1");
  });

  it("needs credentials for real gateways", () => {
    expect(() => envSchema.parse({ ...base, PAYMENT_PROVIDER: "moyasar" })).toThrow(/MOYASAR_SECRET_KEY/);
    expect(createPaymentGateway(envSchema.parse({ ...base, PAYMENT_PROVIDER: "tap", TAP_SECRET_KEY: "sk" }))).toBeInstanceOf(TapGateway);
  });
});

describe("refunds", () => {
  it("Moyasar refunds the invoice's captured payment, in halalas", async () => {
    const calls: [string, RequestInit | undefined][] = [];
    const fetchImpl = vi.fn(async (u: string | URL | Request, init?: RequestInit) => {
      calls.push([String(u), init]);
      return String(u).endsWith("/invoices/inv_1") ? json({ id: "inv_1", status: "paid", amount: 71_385, payments: [{ id: "pay_9", status: "paid", amount: 71_385 }] }) : json({ id: "pay_9", status: "refunded", amount: 71_385 });
    });
    const gw = new MoyasarGateway("sk", "w", fetchImpl as typeof fetch);
    const refund = await gw.refund("inv_1", 30_000);
    expect(calls[1]![0]).toBe("https://api.moyasar.com/v1/payments/pay_9/refund");
    expect(JSON.parse(String(calls[1]![1]!.body))).toEqual({ amount: 30_000 });
    expect(refund.status).toBe("COMPLETED");
  });

  it("Tap refunds the charge in SAR and reports pending refunds as processing", async () => {
    const fetchImpl = vi.fn(async (_u: string | URL | Request, _i?: RequestInit) => json({ id: "re_1", status: "PENDING" }));
    const refund = await new TapGateway("sk", fetchImpl as typeof fetch).refund("chg_1", 30_050, "customer cancelled");
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).toBe("https://api.tap.company/v2/refunds");
    expect(JSON.parse(String(init!.body))).toMatchObject({ charge_id: "chg_1", amount: 300.5, currency: "SAR" });
    expect(refund).toMatchObject({ providerRefundId: "re_1", status: "PROCESSING" });
  });

  it("the mock settles immediately", async () => {
    expect((await new MockGateway("http://x").refund()).status).toBe("COMPLETED");
  });
});
