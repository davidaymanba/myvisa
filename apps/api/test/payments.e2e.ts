import { randomUUID } from "node:crypto";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.factory";
import { EVENTS, type OrderStatusChangedEvent, type PaymentFailedEvent, type PaymentSucceededEvent } from "../src/common/events";
import { testEnv } from "./env";
import { type Harness, type Session, as, signIn, startHarness } from "./harness";

const TOTAL = 71_385;

async function createOrder(h: Harness, s: Session, data: { status?: "PENDING_PAYMENT" | "DRAFT"; total?: number; locale?: "ar" | "en" } = {}) {
  const service = await h.prisma.service.findFirstOrThrow({ where: { category: "VISA", visaKind: "STICKER" }, include: { country: true } });
  const user = await h.prisma.user.findUniqueOrThrow({ where: { id: s.userId } });
  return h.prisma.order.create({
    data: {
      number: `MV-T-${randomUUID().slice(0, 8).toUpperCase()}`,
      customerId: s.userId,
      serviceId: service.id,
      destinationId: service.countryId,
      contactPhone: user.phone,
      status: data.status ?? "PENDING_PAYMENT",
      locale: data.locale ?? "ar",
      totalHalalas: data.total ?? TOTAL,
      serviceFeesHalalas: 29_900,
      governmentFeesHalalas: 37_000,
      vatHalalas: 4_485,
    },
  });
}

async function until<T>(probe: () => Promise<T>, ok: (v: T) => boolean, timeoutMs = 8000): Promise<T> {
  const started = Date.now();
  for (;;) {
    const v = await probe();
    if (ok(v) || Date.now() - started > timeoutMs) return v;
    await new Promise((r) => setTimeout(r, 150));
  }
}

function capture<T>(app: NestExpressApplication, event: string) {
  const seen: T[] = [];
  app.get(EventEmitter2).on(event, (e: T) => void seen.push(e));
  return seen;
}

describe("payments (mock gateway)", () => {
  let h: Harness;
  let customer: Session;
  let stranger: Session;
  let succeeded: PaymentSucceededEvent[];
  let failed: PaymentFailedEvent[];

  beforeAll(async () => {
    h = await startHarness();
    customer = await signIn(h);
    stranger = await signIn(h);
    succeeded = capture(h.app, EVENTS.paymentSucceeded);
    failed = capture(h.app, EVENTS.paymentFailed);
  });
  afterAll(() => h.close());

  it("requires an Idempotency-Key", async () => {
    const order = await createOrder(h, customer);
    const res = await h.http.post(`/api/v1/orders/${order.id}/payments`).set(as(customer)).expect(400);
    expect(res.body.code).toBe("idempotency_key_required");
  });

  it("is idempotent per key, and reuses an open checkout", async () => {
    const order = await createOrder(h, customer);
    const key = randomUUID();
    const a = await h.http.post(`/api/v1/orders/${order.id}/payments`).set(as(customer)).set("Idempotency-Key", key).expect(201);
    const b = await h.http.post(`/api/v1/orders/${order.id}/payments`).set(as(customer)).set("Idempotency-Key", key).expect(201);
    expect(b.body.paymentId).toBe(a.body.paymentId);
    expect(a.body.redirectUrl).toBe(`http://localhost:3100/pay/mock?payment=${a.body.paymentId}`);
    const c = await h.http.post(`/api/v1/orders/${order.id}/payments`).set(as(customer)).set("Idempotency-Key", randomUUID()).expect(201);
    expect(c.body.paymentId).toBe(a.body.paymentId);
    expect(await h.prisma.payment.count({ where: { orderId: order.id } })).toBe(1);
  });

  it("only charges orders waiting for payment, and only for their owner", async () => {
    const draft = await createOrder(h, customer, { status: "DRAFT" });
    const res = await h.http.post(`/api/v1/orders/${draft.id}/payments`).set(as(customer)).set("Idempotency-Key", randomUUID()).expect(409);
    expect(res.body.code).toBe("order_not_payable");
    const order = await createOrder(h, customer);
    await h.http.post(`/api/v1/orders/${order.id}/payments`).set(as(stranger)).set("Idempotency-Key", randomUUID()).expect(404);
    const start = await h.http.post(`/api/v1/orders/${order.id}/payments`).set(as(customer)).set("Idempotency-Key", randomUUID()).expect(201);
    await h.http.get(`/api/v1/payments/${start.body.paymentId}`).set(as(stranger)).expect(404);
    await h.http.post(`/api/v1/payments/mock/${start.body.paymentId}/complete`).set(as(stranger)).send({ outcome: "paid" }).expect(404);
  });

  it("marks a payment paid once and announces it once", async () => {
    const order = await createOrder(h, customer);
    const { body: start } = await h.http.post(`/api/v1/orders/${order.id}/payments`).set(as(customer)).set("Idempotency-Key", randomUUID()).expect(201);
    const before = succeeded.length;
    const paid = await h.http.post(`/api/v1/payments/mock/${start.paymentId}/complete`).set(as(customer)).send({ outcome: "paid" }).expect(200);
    expect(paid.body).toMatchObject({ paymentId: start.paymentId, orderId: order.id, orderNumber: order.number, status: "PAID", amountHalalas: TOTAL });
    await h.http.post(`/api/v1/payments/mock/${start.paymentId}/complete`).set(as(customer)).send({ outcome: "paid" }).expect(200);
    await h.http.post(`/api/v1/payments/mock/${start.paymentId}/complete`).set(as(customer)).send({ outcome: "failed" }).expect(200);
    expect(succeeded.length - before).toBe(1);
    expect(succeeded.at(-1)).toEqual({ orderId: order.id, paymentId: start.paymentId, amountHalalas: TOTAL });
    const row = await h.prisma.payment.findUniqueOrThrow({ where: { id: start.paymentId } });
    expect(row).toMatchObject({ status: "PAID", method: "MADA", cardLast4: "1111" });
    expect(row.paidAt).not.toBeNull();
    expect(await h.prisma.webhookEvent.count({ where: { eventId: `mock:${start.paymentId}:paid` } })).toBe(1);
    // A paid payment can't be resumed.
    const status = await h.http.get(`/api/v1/payments/${start.paymentId}`).set(as(customer)).expect(200);
    expect(status.body.status).toBe("PAID");
  });

  it("records a failure, announces it, and messages the customer", async () => {
    const order = await createOrder(h, customer);
    const { body: start } = await h.http.post(`/api/v1/orders/${order.id}/payments`).set(as(customer)).set("Idempotency-Key", randomUUID()).expect(201);
    const res = await h.http.post(`/api/v1/payments/mock/${start.paymentId}/complete`).set(as(customer)).send({ outcome: "failed" }).expect(200);
    expect(res.body).toMatchObject({ status: "FAILED", failureReason: "card_declined" });
    expect(failed.at(-1)).toMatchObject({ orderId: order.id, paymentId: start.paymentId, reason: "card_declined" });
    const sms = await until(
      () => h.prisma.notification.findFirst({ where: { userId: customer.userId, template: "payment.failed", channel: "SMS" } }),
      (n) => n?.status === "SENT",
    );
    expect(sms?.status).toBe("SENT");
  });

  it("refuses a payment whose amount no longer matches the order", async () => {
    const order = await createOrder(h, customer);
    const { body: start } = await h.http.post(`/api/v1/orders/${order.id}/payments`).set(as(customer)).set("Idempotency-Key", randomUUID()).expect(201);
    await h.prisma.order.update({ where: { id: order.id }, data: { totalHalalas: 50_000 } });
    const before = succeeded.length;
    const res = await h.http.post(`/api/v1/payments/mock/${start.paymentId}/complete`).set(as(customer)).send({ outcome: "paid" }).expect(200);
    expect(res.body).toMatchObject({ status: "FAILED", failureReason: "amount_mismatch" });
    expect(succeeded.length).toBe(before);
  });

  it("has no webhook for the mock gateway", async () => {
    await h.http.post("/api/v1/payments/webhooks/mock").send({}).expect(404);
    await h.http.post("/api/v1/payments/webhooks/moyasar").send({}).expect(404);
  });

  it("sends order.received on every channel when an order is received", async () => {
    await h.prisma.user.update({ where: { id: customer.userId }, data: { email: "customer@example.com" } });
    const order = await createOrder(h, customer, { locale: "en" });
    await h.app.get(EventEmitter2).emitAsync(EVENTS.orderStatusChanged, { orderId: order.id, from: "PENDING_PAYMENT", to: "RECEIVED", actorId: null, customerNote: null } satisfies OrderStatusChangedEvent);
    const rows = await until(
      async () => (await h.prisma.notification.findMany({ where: { userId: customer.userId, template: "order.received" } })).filter((n) => (n.payload as { orderNumber?: string }).orderNumber === order.number),
      (r) => r.length === 4 && r.every((n) => n.status === "SENT" || n.status === "DELIVERED"),
    );
    const byChannel = Object.fromEntries(rows.map((n) => [n.channel, n.status]));
    expect(byChannel).toEqual({ IN_APP: "DELIVERED", SMS: "SENT", WHATSAPP: "SENT", EMAIL: "SENT" });
    expect((rows[0]!.payload as { locale: string; orderNumber: string })).toMatchObject({ locale: "en", orderNumber: order.number });
  });

  it("sends nothing for statuses without a template", async () => {
    const order = await createOrder(h, customer);
    await h.app.get(EventEmitter2).emitAsync(EVENTS.orderStatusChanged, { orderId: order.id, from: "DRAFT", to: "PENDING_PAYMENT", actorId: null, customerNote: null } satisfies OrderStatusChangedEvent);
    expect(await h.prisma.notification.count({ where: { userId: customer.userId, template: { notIn: ["order.received", "payment.failed"] } } })).toBe(0);
  });
});

describe("payments (Moyasar webhooks, gateway faked at the network layer)", () => {
  let h: Harness;
  let moyasar: NestExpressApplication;
  let http: ReturnType<typeof request>;
  let customer: Session;
  const invoices = new Map<string, { status: string; amount: number }>();
  const realFetch = globalThis.fetch;

  beforeAll(async () => {
    h = await startHarness();
    customer = await signIn(h);
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input instanceof Request ? input.url : input);
      if (!url.startsWith("https://api.moyasar.com/")) return realFetch(input, init);
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { amount: number };
        const id = `inv_${invoices.size + 1}`;
        invoices.set(id, { status: "initiated", amount: body.amount });
        return new Response(JSON.stringify({ id, status: "initiated", amount: body.amount, url: `https://checkout.moyasar.com/invoices/${id}` }), { status: 201 });
      }
      const id = url.split("/").pop()!;
      const inv = invoices.get(id)!;
      const payments = inv.status === "paid" ? [{ id: "pay_x", status: "paid", amount: inv.amount, source: { type: "creditcard", company: "visa", number: "4111-11XX-XXXX-1111" } }] : [];
      return new Response(JSON.stringify({ id, ...inv, payments }), { status: 200 });
    });
    moyasar = await createApp(testEnv({ PAYMENT_PROVIDER: "moyasar", MOYASAR_SECRET_KEY: "sk_test_fake", MOYASAR_WEBHOOK_SECRET: "whsec_fake_secret" }), { logger: false });
    await moyasar.init();
    http = request(moyasar.getHttpServer());
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    await moyasar.close();
    await h.close();
  });

  it("opens a Moyasar invoice and confirms payment from the API, once per event", async () => {
    const succeeded = capture<PaymentSucceededEvent>(moyasar, EVENTS.paymentSucceeded);
    const order = await createOrder(h, customer);
    const start = await http.post(`/api/v1/orders/${order.id}/payments`).set(as(customer)).set("Idempotency-Key", randomUUID()).expect(201);
    expect(start.body.redirectUrl).toMatch(/^https:\/\/checkout\.moyasar\.com\/invoices\/inv_/);
    const payment = await h.prisma.payment.findUniqueOrThrow({ where: { id: start.body.paymentId } });
    expect(payment.provider).toBe("MOYASAR");

    // Not paid yet: a webhook that claims otherwise changes nothing (the API is the source of truth).
    const event = { id: `evt_${randomUUID()}`, type: "payment_paid", secret_token: "whsec_fake_secret", data: { id: "pay_x", invoice_id: payment.providerPaymentId } };
    await http.post("/api/v1/payments/webhooks/moyasar").send(event).expect(200);
    expect((await h.prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe("INITIATED");

    invoices.get(payment.providerPaymentId!)!.status = "paid";
    const real = { ...event, id: `evt_${randomUUID()}` };
    const first = await http.post("/api/v1/payments/webhooks/moyasar").send(real).expect(200);
    const second = await http.post("/api/v1/payments/webhooks/moyasar").send(real).expect(200);
    expect(first.body).toEqual({ received: true });
    expect(second.body).toEqual({ received: true, duplicate: true });
    expect(succeeded).toHaveLength(1);
    expect(await h.prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).toMatchObject({ status: "PAID", method: "VISA", cardLast4: "1111" });
  });

  it("syncs from the gateway when the customer returns before the webhook", async () => {
    const order = await createOrder(h, customer);
    const start = await http.post(`/api/v1/orders/${order.id}/payments`).set(as(customer)).set("Idempotency-Key", randomUUID()).expect(201);
    const payment = await h.prisma.payment.findUniqueOrThrow({ where: { id: start.body.paymentId } });
    invoices.get(payment.providerPaymentId!)!.status = "paid";
    const res = await http.get(`/api/v1/payments/${payment.id}`).set(as(customer)).expect(200);
    expect(res.body.status).toBe("PAID");
  });

  it("rejects webhooks without the shared secret", async () => {
    const res = await http.post("/api/v1/payments/webhooks/moyasar").send({ id: "evt_forged", type: "payment_paid", secret_token: "guess", data: { invoice_id: "inv_1" } }).expect(401);
    expect(res.body.code).toBe("webhook_rejected");
  });
});
