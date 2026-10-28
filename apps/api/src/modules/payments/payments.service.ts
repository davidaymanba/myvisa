import { HttpStatus, Inject, Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import * as Sentry from "@sentry/nestjs";
import type { PaymentStart, PaymentStatusView } from "@myvisa/shared";
import { Prisma, type Payment, type PaymentProvider } from "@myvisa/db";
import { ENV, type Env } from "../../config/env";
import { EVENTS, type PaymentFailedEvent, type PaymentSucceededEvent } from "../../common/events";
import { Problem } from "../../common/problem";
import { PrismaService } from "../../infra/prisma.service";
import { type GatewayPayment, PAYMENT_GATEWAY, type PaymentGateway, WebhookRejected } from "./gateways/gateway";

const PROVIDER: Record<PaymentGateway["name"], PaymentProvider> = { mock: "MOCK", moyasar: "MOYASAR", tap: "TAP" };
/** An unfinished checkout younger than this is handed back instead of opening a second one. */
const REUSE_WINDOW_MS = 30 * 60_000;

const json = (v: unknown) => (v === null || v === undefined ? Prisma.DbNull : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue));

/**
 * Checkout, webhooks and the payment state. Orders own the order state: this service only announces
 * `payment.succeeded` / `payment.failed`, each at most once per payment.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  get provider(): PaymentProvider {
    return PROVIDER[this.gateway.name];
  }

  private async ownedOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, customerId: userId }, include: { service: { select: { nameAr: true, nameEn: true } } } });
    if (!order) throw Problem.notFound("Order");
    return order;
  }

  /**
   * Idempotent checkout. The client's `Idempotency-Key` is scoped to the order; retrying with the same key
   * (double click, flaky network) returns the same payment instead of charging twice.
   */
  async start(orderId: string, userId: string, idempotencyKey: string): Promise<PaymentStart> {
    const order = await this.ownedOrder(orderId, userId);
    const scopedKey = `${order.id}:${idempotencyKey}`;

    const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey: scopedKey } });
    if (existing) return this.resume(existing);

    if (order.status !== "PENDING_PAYMENT") throw new Problem(HttpStatus.CONFLICT, "order_not_payable", "This order isn't waiting for payment.");
    if (order.totalHalalas <= 0) throw new Problem(HttpStatus.CONFLICT, "order_not_payable", "Nothing to pay for this order.");

    const open = await this.prisma.payment.findFirst({
      where: { orderId: order.id, provider: this.provider, status: "INITIATED", amountHalalas: order.totalHalalas, providerPaymentId: { not: null }, createdAt: { gt: new Date(Date.now() - REUSE_WINDOW_MS) } },
      orderBy: { createdAt: "desc" },
    });
    if (open) return this.resume(open);

    let payment: Payment;
    try {
      payment = await this.prisma.payment.create({ data: { orderId: order.id, provider: this.provider, amountHalalas: order.totalHalalas, idempotencyKey: scopedKey } });
    } catch (err) {
      // Two concurrent requests with the same key: the loser returns the winner's payment.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const winner = await this.prisma.payment.findUniqueOrThrow({ where: { idempotencyKey: scopedKey } });
        return this.resume(winner);
      }
      throw err;
    }

    const locale = order.locale === "en" ? "en" : "ar";
    const returnUrl = `${this.env.WEB_URL}/${locale === "en" ? "en/" : ""}apply/confirmation?order=${order.id}&payment=${payment.id}`;
    try {
      const checkout = await this.gateway.createCheckout({
        paymentId: payment.id,
        orderNumber: order.number,
        amountHalalas: order.totalHalalas,
        description: `myvisa ${order.number} · ${order.service.nameEn}`,
        returnUrl,
        callbackUrl: `${this.env.API_PUBLIC_URL}/api/v1/payments/webhooks/${this.gateway.name}`,
        locale,
        metadata: { order_id: order.id, order_number: order.number },
      });
      await this.prisma.payment.update({ where: { id: payment.id }, data: { providerPaymentId: checkout.providerPaymentId, raw: json({ redirectUrl: checkout.redirectUrl }) } });
      return { paymentId: payment.id, redirectUrl: checkout.redirectUrl };
    } catch (err) {
      this.logger.error(`checkout via ${this.gateway.name} failed: ${(err as Error).message}`);
      Sentry.captureException(err);
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED", failureReason: "gateway_error" } });
      throw new Problem(HttpStatus.BAD_GATEWAY, "gateway_error", "The payment gateway didn't respond. Try again.");
    }
  }

  private resume(payment: Payment): PaymentStart {
    const redirectUrl = (payment.raw as { redirectUrl?: string } | null)?.redirectUrl;
    if (payment.status !== "INITIATED" || !redirectUrl) throw new Problem(HttpStatus.CONFLICT, "payment_closed", `This payment is ${payment.status.toLowerCase()}.`);
    return { paymentId: payment.id, redirectUrl };
  }

  async status(paymentId: string, userId: string): Promise<PaymentStatusView> {
    let payment = await this.prisma.payment.findFirst({ where: { id: paymentId, order: { customerId: userId } }, include: { order: { select: { number: true } } } });
    if (!payment) throw Problem.notFound("Payment");
    // Customer is back from the gateway before its webhook: ask the gateway once.
    if (payment.status === "INITIATED" && payment.providerPaymentId && this.gateway.name !== "mock") {
      await this.sync(payment.id).catch((err: Error) => this.logger.warn(`sync ${payment!.id}: ${err.message}`));
      payment = await this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { order: { select: { number: true } } } });
    }
    return { paymentId: payment.id, orderId: payment.orderId, orderNumber: payment.order.number, status: payment.status, amountHalalas: payment.amountHalalas, failureReason: payment.failureReason };
  }

  private async sync(paymentId: string) {
    const payment = await this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    if (!payment.providerPaymentId) return;
    await this.apply(payment.id, await this.gateway.fetch(payment.providerPaymentId));
  }

  /**
   * Webhook entry point. Stores the event (unique per provider + event id, so redeliveries are no-ops),
   * then re-fetches the payment from the gateway — the webhook body itself is never trusted for state.
   */
  async handleWebhook(providerName: string, headers: Record<string, string | string[] | undefined>, body: unknown): Promise<{ received: true; duplicate?: true }> {
    if (providerName !== this.gateway.name || this.gateway.name === "mock") throw new Problem(HttpStatus.NOT_FOUND, "not_found", "Unknown webhook");
    let notice;
    try {
      notice = this.gateway.parseWebhook(headers, body);
    } catch (err) {
      if (err instanceof WebhookRejected) {
        this.logger.warn(`rejected ${providerName} webhook: ${err.message}`);
        throw new Problem(HttpStatus.UNAUTHORIZED, "webhook_rejected", "Webhook could not be verified.");
      }
      throw err;
    }
    return this.processEvent(notice.eventId, notice.type, body, async () => {
      const payment = await this.prisma.payment.findUnique({ where: { providerPaymentId: notice.providerPaymentId } });
      if (!payment) {
        this.logger.warn(`${providerName} webhook for unknown payment ${notice.providerPaymentId}`);
        return;
      }
      await this.apply(payment.id, await this.gateway.fetch(notice.providerPaymentId));
    });
  }

  /** Development gateway: the /pay/mock page reports the outcome; it travels the webhook path. */
  async completeMock(paymentId: string, userId: string, outcome: "paid" | "failed") {
    if (this.gateway.name !== "mock" || this.env.NODE_ENV === "production") throw new Problem(HttpStatus.NOT_FOUND, "not_found", "Not available");
    const payment = await this.prisma.payment.findFirst({ where: { id: paymentId, order: { customerId: userId } } });
    if (!payment) throw Problem.notFound("Payment");
    const result: GatewayPayment =
      outcome === "paid"
        ? { status: "PAID", amountHalalas: payment.amountHalalas, method: "MADA", cardLast4: "1111", failureReason: null, raw: { mock: true, outcome } }
        : { status: "FAILED", amountHalalas: payment.amountHalalas, method: "MADA", cardLast4: "1111", failureReason: "card_declined", raw: { mock: true, outcome } };
    await this.processEvent(`mock:${payment.id}:${outcome}`, `payment.${outcome}`, { paymentId, outcome }, () => this.apply(payment.id, result));
    return this.status(paymentId, userId);
  }

  private async processEvent(eventId: string, type: string, payload: unknown, run: () => Promise<void>): Promise<{ received: true; duplicate?: true }> {
    const provider = this.provider;
    try {
      await this.prisma.webhookEvent.create({ data: { provider, eventId, type, payload: (JSON.parse(JSON.stringify(payload ?? {})) as Prisma.InputJsonValue) } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const previous = await this.prisma.webhookEvent.findUnique({ where: { provider_eventId: { provider, eventId } } });
        // A previous attempt that crashed may be retried; a processed one is a duplicate.
        if (previous?.processedAt) return { received: true, duplicate: true };
      } else throw err;
    }
    try {
      await run();
      await this.prisma.webhookEvent.update({ where: { provider_eventId: { provider, eventId } }, data: { processedAt: new Date(), error: null } });
      return { received: true };
    } catch (err) {
      await this.prisma.webhookEvent.update({ where: { provider_eventId: { provider, eventId } }, data: { error: (err as Error).message.slice(0, 500) } });
      throw err;
    }
  }

  /**
   * Applies the gateway's verdict. Conditional updates (`status: INITIATED`) make the transition — and its
   * event — happen once, however many webhooks, syncs and redirects arrive.
   */
  private async apply(paymentId: string, result: GatewayPayment) {
    const payment = await this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { order: { select: { id: true, totalHalalas: true, number: true } } } });
    if (result.status === "PENDING") return;
    const common = { method: result.method, cardLast4: result.cardLast4, raw: json({ ...((payment.raw as object | null) ?? {}), gateway: result.raw }) };

    if (result.status === "PAID") {
      const expected = payment.order.totalHalalas;
      if (result.amountHalalas !== expected || payment.amountHalalas !== expected) {
        this.logger.error(`AMOUNT MISMATCH on ${payment.order.number}: paid ${result.amountHalalas}, payment ${payment.amountHalalas}, order ${expected}`);
        Sentry.captureMessage(`payment amount mismatch ${payment.id}`, "error");
        return this.fail(payment.id, payment.orderId, "amount_mismatch", common);
      }
      const { count } = await this.prisma.payment.updateMany({ where: { id: payment.id, status: "INITIATED" }, data: { ...common, status: "PAID", paidAt: new Date(), failureReason: null } });
      if (count === 1) await this.events.emitAsync(EVENTS.paymentSucceeded, { orderId: payment.orderId, paymentId: payment.id, amountHalalas: result.amountHalalas } satisfies PaymentSucceededEvent);
      return;
    }
    return this.fail(payment.id, payment.orderId, result.failureReason ?? "failed", common);
  }

  private async fail(paymentId: string, orderId: string, reason: string, common: object) {
    const { count } = await this.prisma.payment.updateMany({ where: { id: paymentId, status: "INITIATED" }, data: { ...common, status: "FAILED", failureReason: reason.slice(0, 300) } });
    if (count === 1) await this.events.emitAsync(EVENTS.paymentFailed, { orderId, paymentId, reason } satisfies PaymentFailedEvent);
  }
}
