import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { EVENTS, type MessageCreatedEvent, type OrderStatusChangedEvent, type PaymentFailedEvent } from "../../common/events";
import { PrismaService } from "../../infra/prisma.service";
import { NotificationsService } from "./notifications.service";
import { STATUS_TEMPLATES } from "./templates";

/** Turns domain events into customer messages. Failures here never fail the action that raised the event. */
@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private order(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      select: { id: true, number: true, customerId: true, locale: true, totalHalalas: true, decision: true, service: { select: { nameAr: true, nameEn: true } }, destination: { select: { nameAr: true, nameEn: true } } },
    });
  }

  @OnEvent(EVENTS.orderStatusChanged, { async: true, promisify: true, suppressErrors: false })
  async onStatusChanged(event: OrderStatusChangedEvent) {
    const template = STATUS_TEMPLATES[event.to];
    if (!template) return;
    try {
      const order = await this.order(event.orderId);
      if (!order) return;
      const common = {
        orderId: order.id,
        orderNumber: order.number,
        destination: order.destination ? { ar: order.destination.nameAr, en: order.destination.nameEn } : null,
        service: { ar: order.service.nameAr, en: order.service.nameEn },
      };
      // Don't message customers about their own actions (e.g. resubmitting documents).
      if (template === "order.update" && event.actorId === order.customerId) return;
      if (template === "order.received") {
        await this.notifications.notify({ userId: order.customerId, template, locale: order.locale, payload: { ...common, totalHalalas: order.totalHalalas } });
      } else {
        await this.notifications.notify({ userId: order.customerId, template, locale: order.locale, payload: { ...common, status: event.to, note: event.customerNote, decision: order.decision } });
      }
    } catch (err) {
      this.logger.error(`notify ${template} for ${event.orderId}: ${(err as Error).message}`);
    }
  }

  @OnEvent(EVENTS.paymentFailed, { async: true, promisify: true, suppressErrors: false })
  async onPaymentFailed(event: PaymentFailedEvent) {
    try {
      const order = await this.order(event.orderId);
      if (!order) return;
      await this.notifications.notify({ userId: order.customerId, template: "payment.failed", locale: order.locale, payload: { orderId: order.id, orderNumber: order.number, reason: event.reason } });
    } catch (err) {
      this.logger.error(`notify payment.failed for ${event.orderId}: ${(err as Error).message}`);
    }
  }

  /** Staff replies reach the customer in-app and on WhatsApp; customer messages stay in the thread. */
  @OnEvent(EVENTS.messageCreated, { async: true, promisify: true, suppressErrors: false })
  async onMessage(event: MessageCreatedEvent) {
    if (event.sender !== "STAFF") return;
    try {
      const message = await this.prisma.message.findUnique({ where: { id: event.messageId }, select: { body: true, sender: { select: { fullNameAr: true, fullNameEn: true } }, order: { select: { id: true, number: true, customerId: true, locale: true } } } });
      if (!message) return;
      const { order } = message;
      const agent = (order.locale === "en" ? message.sender?.fullNameEn ?? message.sender?.fullNameAr : message.sender?.fullNameAr ?? message.sender?.fullNameEn)?.split(" ")[0] ?? null;
      await this.notifications.notify({ userId: order.customerId, template: "message.received", locale: order.locale, channels: ["IN_APP", "WHATSAPP"], payload: { orderId: order.id, orderNumber: order.number, agent, preview: message.body } });
    } catch (err) {
      this.logger.error(`notify message.received for ${event.orderId}: ${(err as Error).message}`);
    }
  }
}
