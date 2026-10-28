import { HttpStatus, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { can, type MessageView } from "@myvisa/shared";
import type { Prisma } from "@myvisa/db";
import type { RequestUser } from "../../common/auth.types";
import { EVENTS, type MessageCreatedEvent } from "../../common/events";
import { Problem } from "../../common/problem";
import { PrismaService } from "../../infra/prisma.service";
import { StorageService } from "../../infra/storage.service";

const messageInclude = {
  sender: { select: { fullNameAr: true, fullNameEn: true } },
  attachment: { select: { id: true, originalName: true, mimeType: true, deletedAt: true } },
} satisfies Prisma.MessageInclude;
type MessageRow = Prisma.MessageGetPayload<{ include: typeof messageInclude }>;

/**
 * One thread per order between the customer and our agents. Reading the thread marks the other side's
 * messages as read. Staff replies raise `message.created`, which notifies the customer.
 */
@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly events: EventEmitter2,
  ) {}

  private async access(user: RequestUser, orderId: string, write: boolean) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { id: true, customerId: true } });
    if (!order) throw Problem.notFound("Order");
    if (order.customerId === user.id) return { order, side: "CUSTOMER" as const };
    if (can(user.role, write ? "orders:write" : "orders:read")) return { order, side: "STAFF" as const };
    throw Problem.notFound("Order");
  }

  async list(user: RequestUser, orderId: string, locale: "ar" | "en"): Promise<MessageView[]> {
    const { order, side } = await this.access(user, orderId, false);
    const rows = await this.prisma.message.findMany({ where: { orderId: order.id }, include: messageInclude, orderBy: { createdAt: "asc" }, take: 500 });
    const unreadFromOtherSide = rows.filter((m) => !m.readAt && (side === "CUSTOMER" ? m.senderKind !== "CUSTOMER" : m.senderKind === "CUSTOMER")).map((m) => m.id);
    if (unreadFromOtherSide.length) await this.prisma.message.updateMany({ where: { id: { in: unreadFromOtherSide } }, data: { readAt: new Date() } });
    return rows.map((m) => toView(m, locale));
  }

  async create(user: RequestUser, orderId: string, input: { body: string; attachmentDocumentId: string | null }, locale: "ar" | "en"): Promise<MessageView> {
    const { order, side } = await this.access(user, orderId, true);
    if (input.attachmentDocumentId) {
      const doc = await this.prisma.document.findFirst({ where: { id: input.attachmentDocumentId, ownerId: order.customerId, deletedAt: null }, select: { scanStatus: true } });
      if (!doc) throw new Problem(HttpStatus.UNPROCESSABLE_ENTITY, "validation_failed", "Unknown attachment.", { errors: [{ path: "attachmentDocumentId", code: "custom", message: "attachment" }] });
      if (doc.scanStatus !== "CLEAN") throw Problem.conflict("not_scanned", "The file is still being checked.");
    }
    const row = await this.prisma.message.create({
      data: { orderId: order.id, senderId: user.id, senderKind: side, body: input.body, attachmentId: input.attachmentDocumentId },
      include: messageInclude,
    });
    await this.events.emitAsync(EVENTS.messageCreated, { messageId: row.id, orderId: order.id, sender: side } satisfies MessageCreatedEvent);
    return toView(row, locale);
  }

  async attachmentUrl(user: RequestUser, messageId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId }, select: { orderId: true, attachment: { select: { storageKey: true, originalName: true, scanStatus: true, deletedAt: true } } } });
    if (!message?.attachment || message.attachment.deletedAt) throw Problem.notFound("Attachment");
    await this.access(user, message.orderId, false);
    if (message.attachment.scanStatus !== "CLEAN") throw Problem.conflict("not_scanned", "The file is still being checked.");
    return { url: await this.storage.presignGet(message.attachment.storageKey, message.attachment.originalName), expiresIn: 300 };
  }

  /** Unread staff messages across all my orders (nav badge). */
  unreadForCustomer(userId: string) {
    return this.prisma.message.count({ where: { order: { customerId: userId }, senderKind: { not: "CUSTOMER" }, readAt: null } });
  }
}

function toView(m: MessageRow, locale: "ar" | "en"): MessageView {
  const name = locale === "en" ? (m.sender?.fullNameEn ?? m.sender?.fullNameAr) : (m.sender?.fullNameAr ?? m.sender?.fullNameEn);
  return {
    id: m.id,
    sender: m.senderKind,
    // Agents are introduced by first name only.
    senderName: m.senderKind === "STAFF" ? (name?.split(" ")[0] ?? null) : null,
    body: m.body,
    attachment: m.attachment && !m.attachment.deletedAt ? { documentId: m.attachment.id, name: m.attachment.originalName, mimeType: m.attachment.mimeType } : null,
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt?.toISOString() ?? null,
  };
}
