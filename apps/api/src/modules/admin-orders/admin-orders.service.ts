import { HttpStatus, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  CLOSED_STATUSES,
  OUR_TURN,
  can,
  isStaff,
  slaDueAt,
  staffTransitions,
  type AdminOrderDetail,
  type AdminOrderPage,
  type AdminOrderRow,
  type AppointmentInput,
  type OrderStatus,
  type ShipmentInput,
  type StaffRef,
} from "@myvisa/shared";
import type { Prisma } from "@myvisa/db";
import type { RequestUser } from "../../common/auth.types";
import { EVENTS, type OrderStatusChangedEvent } from "../../common/events";
import { PiiService } from "../../common/pii.service";
import { Problem } from "../../common/problem";
import { PrismaService } from "../../infra/prisma.service";
import { InvoicesService } from "../invoices/invoices.service";
import { orderInclude } from "../orders/order-view";
import { OrdersService } from "../orders/orders.service";
import { PaymentsService } from "../payments/payments.service";

const OPEN_EXCLUDED: OrderStatus[] = ["DRAFT", "PENDING_PAYMENT", ...CLOSED_STATUSES];

export const rowInclude = {
  customer: { select: { id: true, fullNameAr: true, fullNameEn: true, phone: true } },
  assignee: { select: { id: true, fullNameAr: true, fullNameEn: true, phone: true, role: true } },
  service: { select: { nameAr: true, nameEn: true } },
  destination: { select: { iso2: true, mainAirportIata: true, nameAr: true, nameEn: true } },
  _count: {
    select: {
      travelers: true,
      documents: { where: { reviewStatus: "PENDING", document: { uploadedAt: { not: null }, deletedAt: null, scanStatus: "CLEAN" } } },
      messages: { where: { senderKind: "CUSTOMER", readAt: null } },
    },
  },
} satisfies Prisma.OrderInclude;
type OrderRow = Prisma.OrderGetPayload<{ include: typeof rowInclude }>;

export function staffRef(u: { id: string; fullNameAr: string | null; fullNameEn: string | null; phone: string; role: StaffRef["role"] }): StaffRef {
  return { id: u.id, name: u.fullNameAr ?? u.fullNameEn ?? u.phone, role: u.role };
}

export const isOverdue = (o: { status: OrderStatus; slaDueAt: Date | null }, now = Date.now()) => Boolean(o.slaDueAt && OUR_TURN.includes(o.status) && o.slaDueAt.getTime() < now);

export function toRow(o: OrderRow): AdminOrderRow {
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    service: { ar: o.service.nameAr, en: o.service.nameEn },
    destination: o.destination ? { iso2: o.destination.iso2.toLowerCase(), iata: o.destination.mainAirportIata, name: { ar: o.destination.nameAr, en: o.destination.nameEn } } : null,
    customer: { id: o.customer.id, name: o.customer.fullNameAr ?? o.customer.fullNameEn, phone: o.customer.phone },
    travelers: o._count.travelers,
    totalHalalas: o.totalHalalas,
    assignee: o.assignee ? staffRef(o.assignee) : null,
    slaDueAt: o.slaDueAt?.toISOString() ?? null,
    overdue: isOverdue(o),
    pendingDocuments: o._count.documents,
    unreadMessages: o._count.messages,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

/**
 * The operations side of an order: the queue, the order desk and every staff action. Each status change
 * goes through the shared state machine, records a timeline event (with the note the customer sees) and
 * raises `order.status_changed`, which notifies the customer.
 */
@Injectable()
export class AdminOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly payments: PaymentsService,
    private readonly invoices: InvoicesService,
    private readonly pii: PiiService,
    private readonly events: EventEmitter2,
  ) {}

  private viewWhere(user: RequestUser, view: string): Prisma.OrderWhereInput {
    const open: Prisma.OrderWhereInput = { status: { notIn: OPEN_EXCLUDED } };
    switch (view) {
      case "mine":
        return { ...open, assigneeId: user.id };
      case "unassigned":
        return { ...open, assigneeId: null };
      case "overdue":
        return { status: { in: [...OUR_TURN] }, slaDueAt: { lt: new Date() } };
      case "closed":
        return { status: { in: [...CLOSED_STATUSES] } };
      case "all":
        return {};
      default:
        return open;
    }
  }

  /** Search by order number, customer phone or name, or an exact passport number (via the blind index). */
  private searchWhere(q: string | undefined): Prisma.OrderWhereInput {
    if (!q) return {};
    const term = q.trim();
    const digits = term.replace(/\D/g, "");
    const or: Prisma.OrderWhereInput[] = [
      { number: { contains: term.toUpperCase() } },
      { customer: { fullNameAr: { contains: term, mode: "insensitive" } } },
      { customer: { fullNameEn: { contains: term, mode: "insensitive" } } },
      { travelers: { some: { OR: [{ givenNameEn: { contains: term.toUpperCase() } }, { surnameEn: { contains: term.toUpperCase() } }] } } },
    ];
    if (digits.length >= 5) or.push({ customer: { phone: { contains: digits.replace(/^0/, "") } } }, { contactPhone: { contains: digits.replace(/^0/, "") } });
    if (/^[A-Za-z0-9]{6,12}$/.test(term)) or.push({ travelers: { some: { traveler: { passportNumberHash: this.pii.blindIndex(term) } } } });
    return { OR: or };
  }

  async list(user: RequestUser, query: { view: string; status?: OrderStatus; assigneeId?: string; q?: string; page: number; pageSize: number }): Promise<AdminOrderPage> {
    const base: Prisma.OrderWhereInput = { AND: [this.viewWhere(user, query.view), this.searchWhere(query.q), query.assigneeId ? { assigneeId: query.assigneeId } : {}] };
    const where: Prisma.OrderWhereInput = query.status ? { AND: [base, { status: query.status }] } : base;
    const [rows, total, grouped] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: rowInclude,
        // Most urgent first: SLA due soonest, then newest.
        orderBy: [{ slaDueAt: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.order.count({ where }),
      this.prisma.order.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
    ]);
    return { items: rows.map(toRow), total, page: query.page, pageSize: query.pageSize, counts: Object.fromEntries(grouped.map((g) => [g.status, g._count._all])) };
  }

  async detail(user: RequestUser, id: string): Promise<AdminOrderDetail> {
    const [order, timeline, row] = await Promise.all([
      this.orders.view(user, id),
      this.orders.timeline(user, id),
      this.prisma.order.findUnique({
        where: { id },
        include: {
          customer: { select: { id: true, fullNameAr: true, fullNameEn: true, phone: true, email: true, createdAt: true, _count: { select: { orders: true } } } },
          assignee: { select: { id: true, fullNameAr: true, fullNameEn: true, phone: true, role: true } },
          notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { id: true, fullNameAr: true, fullNameEn: true, phone: true, role: true } } } },
          payments: { orderBy: { createdAt: "desc" }, include: { refunds: { orderBy: { createdAt: "desc" }, include: { creditNote: { select: { id: true } } } } } },
        },
      }),
    ]);
    if (!row) throw Problem.notFound("Order");
    return {
      order,
      timeline,
      customer: { id: row.customer.id, name: row.customer.fullNameAr ?? row.customer.fullNameEn, phone: row.customer.phone, email: row.customer.email, orders: row.customer._count.orders, memberSince: row.customer.createdAt.toISOString() },
      assignee: row.assignee ? staffRef(row.assignee) : null,
      slaDueAt: row.slaDueAt?.toISOString() ?? null,
      overdue: isOverdue(row),
      decision: row.decision,
      notes: row.notes.map((n) => ({ id: n.id, body: n.body, author: staffRef(n.author), createdAt: n.createdAt.toISOString() })),
      payments: row.payments.map((p) => ({
        id: p.id,
        provider: p.provider.toLowerCase(),
        method: p.method,
        status: p.status,
        amountHalalas: p.amountHalalas,
        refundedHalalas: p.refunds.filter((r) => r.status === "COMPLETED" || r.status === "PROCESSING").reduce((s, r) => s + r.amountHalalas, 0),
        cardLast4: p.cardLast4,
        paidAt: p.paidAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
        refunds: p.refunds.map((r) => ({ id: r.id, amountHalalas: r.amountHalalas, reason: r.reason, status: r.status, createdAt: r.createdAt.toISOString(), creditNoteId: r.creditNote?.id ?? null })),
      })),
      invoices: timeline.invoices,
      nextStatuses: staffTransitions(order.status),
    };
  }

  /** Every required slot has a clean file that staff approved. */
  private async documentsApproved(orderId: string) {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude });
    const ok = (requirementId: string, travelerId: string | null) =>
      order.documents.some((d) => d.requirementId === requirementId && d.orderTravelerId === travelerId && d.reviewStatus === "APPROVED" && !d.document.deletedAt);
    for (const r of order.service.requirements.filter((x) => x.isRequired)) {
      if (r.perTraveler) {
        for (const t of order.travelers) if ((!r.applicantType || r.applicantType === t.applicantType) && !ok(r.id, t.id)) return false;
      } else if (!ok(r.id, null)) return false;
    }
    return true;
  }

  /** Moves the order, with the guard rails each step needs, and tells the customer. */
  async changeStatus(user: RequestUser, id: string, input: { to: OrderStatus; customerNote: string | null; decision: "APPROVED" | "REJECTED" | "PARTIAL" | null }) {
    const order = await this.prisma.order.findUnique({ where: { id }, select: { id: true, status: true, assigneeId: true, payments: { select: { status: true } }, appointment: { select: { id: true } } } });
    if (!order) throw Problem.notFound("Order");
    const from = order.status;
    if (!staffTransitions(from).includes(input.to)) throw new Problem(HttpStatus.CONFLICT, "invalid_transition", `An order can't go from ${from} to ${input.to}.`, { from, to: input.to });
    if (input.to === "APPOINTMENT_BOOKED" && !order.appointment) throw Problem.conflict("appointment_missing", "Add the appointment details first.");
    if ((input.to === "APPOINTMENT_BOOKED" || input.to === "SUBMITTED_TO_EMBASSY") && from === "DOCUMENTS_REVIEW" && !(await this.documentsApproved(id))) {
      throw Problem.conflict("documents_not_approved", "Approve every required document first.");
    }
    if (input.to === "REFUNDED" && !order.payments.some((p) => p.status === "REFUNDED")) throw Problem.conflict("refund_first", "Issue the refund first; the order follows.");

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id, status: from },
        data: {
          status: input.to,
          slaDueAt: slaDueAt(input.to, now),
          ...(input.to === "DECISION_ISSUED" ? { decision: input.decision } : {}),
          ...(CLOSED_STATUSES.includes(input.to) ? { closedAt: now } : {}),
          // Whoever picks up an unassigned order owns it.
          ...(!order.assigneeId && can(user.role, "orders:write") ? { assigneeId: user.id } : {}),
        },
      });
      if (count === 0) throw Problem.conflict("order_changed", "Someone else just changed this order. Reload and try again.");
      await tx.orderStatusEvent.create({ data: { orderId: id, fromStatus: from, toStatus: input.to, customerNote: input.customerNote, actorId: user.id, createdAt: now } });
    });
    await this.events.emitAsync(EVENTS.orderStatusChanged, { orderId: id, from, to: input.to, actorId: user.id, customerNote: input.customerNote } satisfies OrderStatusChangedEvent);
    return this.detail(user, id);
  }

  async assign(user: RequestUser, id: string, assigneeId: string | null) {
    if (!(await this.prisma.order.findUnique({ where: { id }, select: { id: true } }))) throw Problem.notFound("Order");
    if (assigneeId) {
      const target = await this.prisma.user.findUnique({ where: { id: assigneeId }, select: { role: true, isActive: true } });
      if (!target || !target.isActive || !isStaff(target.role) || !can(target.role, "orders:write")) throw new Problem(HttpStatus.UNPROCESSABLE_ENTITY, "validation_failed", "Pick an active agent.", { errors: [{ path: "assigneeId", code: "custom", message: "assignee" }] });
    }
    await this.prisma.order.update({ where: { id }, data: { assigneeId } });
    return this.detail(user, id);
  }

  async addNote(user: RequestUser, id: string, body: string) {
    if (!(await this.prisma.order.findUnique({ where: { id }, select: { id: true } }))) throw Problem.notFound("Order");
    const note = await this.prisma.internalNote.create({ data: { orderId: id, authorId: user.id, body }, include: { author: { select: { id: true, fullNameAr: true, fullNameEn: true, phone: true, role: true } } } });
    return { id: note.id, body: note.body, author: staffRef(note.author), createdAt: note.createdAt.toISOString() };
  }

  /**
   * Approve or reject one file. The first review of a freshly paid order moves it into DOCUMENTS_REVIEW
   * (and the customer hears that a specialist is on it).
   */
  async reviewDocument(user: RequestUser, orderDocumentId: string, input: { status: "APPROVED" | "REJECTED"; reason: string | null }) {
    const link = await this.prisma.orderDocument.findUnique({ where: { id: orderDocumentId }, include: { order: { select: { id: true, status: true } }, document: { select: { scanStatus: true, deletedAt: true } } } });
    if (!link || link.document.deletedAt) throw Problem.notFound("Document");
    if (!["RECEIVED", "DOCUMENTS_REVIEW", "ACTION_REQUIRED"].includes(link.order.status)) throw Problem.conflict("order_locked", "Documents are no longer under review for this order.");
    if (link.document.scanStatus !== "CLEAN") throw Problem.conflict("not_scanned", "The file hasn't passed the virus scan.");
    await this.prisma.orderDocument.update({ where: { id: link.id }, data: { reviewStatus: input.status, rejectionReason: input.status === "REJECTED" ? input.reason : null, reviewerId: user.id, reviewedAt: new Date() } });
    if (link.order.status === "RECEIVED") await this.changeStatus(user, link.order.id, { to: "DOCUMENTS_REVIEW", customerNote: null, decision: null });
    return this.detail(user, link.order.id);
  }

  async setAppointment(user: RequestUser, id: string, input: Required<Pick<AppointmentInput, "center" | "city" | "scheduledAt">> & { reference: string | null }) {
    const order = await this.prisma.order.findUnique({ where: { id }, select: { status: true } });
    if (!order) throw Problem.notFound("Order");
    if (CLOSED_STATUSES.includes(order.status) || order.status === "DRAFT" || order.status === "PENDING_PAYMENT") throw Problem.conflict("order_locked", "This order isn't active.");
    const city = { RIYADH: "Riyadh", JEDDAH: "Jeddah", KHOBAR: "Khobar" }[input.city];
    const data = { center: input.center, city, scheduledAt: new Date(input.scheduledAt), reference: input.reference };
    await this.prisma.appointment.upsert({ where: { orderId: id }, create: { orderId: id, ...data }, update: data });
    return this.detail(user, id);
  }

  async addShipment(user: RequestUser, id: string, input: Required<Pick<ShipmentInput, "direction" | "carrier" | "status">> & { trackingNumber: string | null }) {
    if (!(await this.prisma.order.findUnique({ where: { id }, select: { id: true } }))) throw Problem.notFound("Order");
    await this.prisma.shipment.create({ data: { orderId: id, direction: input.direction, carrier: input.carrier, trackingNumber: input.trackingNumber, status: input.status } });
    return this.detail(user, id);
  }

  async updateShipment(user: RequestUser, shipmentId: string, input: { status: ShipmentInput["status"] & string; trackingNumber: string | null }) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId }, select: { orderId: true } });
    if (!shipment) throw Problem.notFound("Shipment");
    await this.prisma.shipment.update({ where: { id: shipmentId }, data: { status: input.status, trackingNumber: input.trackingNumber } });
    return this.detail(user, shipment.orderId);
  }

  /**
   * Refund through the gateway, then the ZATCA credit note, then — when nothing is left — the order
   * becomes REFUNDED (which tells the customer).
   */
  async refund(user: RequestUser, id: string, input: { paymentId: string; amountHalalas: number; reason: string }) {
    const order = await this.prisma.order.findUnique({ where: { id }, select: { status: true } });
    if (!order) throw Problem.notFound("Order");
    const { refund, fullyRefunded } = await this.payments.refund({ orderId: id, paymentId: input.paymentId, amountHalalas: input.amountHalalas, reason: input.reason, issuedById: user.id });
    await this.invoices.issueCreditNote(refund.id, input.reason);
    if (fullyRefunded && staffTransitions(order.status).includes("REFUNDED")) {
      return this.changeStatus(user, id, { to: "REFUNDED", customerNote: input.reason, decision: null });
    }
    return this.detail(user, id);
  }

  /** Active staff who can take orders (assignment picker). */
  async agents(): Promise<StaffRef[]> {
    const users = await this.prisma.user.findMany({ where: { role: { in: ["AGENT", "MANAGER", "SUPER_ADMIN"] }, isActive: true, deletedAt: null }, select: { id: true, fullNameAr: true, fullNameEn: true, phone: true, role: true }, orderBy: { createdAt: "asc" } });
    return users.map(staffRef);
  }
}
