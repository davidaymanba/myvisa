import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { canTransition, type OrderTimelineView, type OrderDraftData, type OrderStatus, type OrderView, type QuoteInput, type TravelerData, type TravelerInput } from "@myvisa/shared";
import type { Prisma } from "@myvisa/db";
import { EVENTS, type OrderStatusChangedEvent, type PaymentSucceededEvent } from "../../common/events";
import { PiiService } from "../../common/pii.service";
import { Problem } from "../../common/problem";
import type { RequestMeta } from "../../common/request-meta";
import type { RequestUser } from "../../common/auth.types";
import { PrismaService } from "../../infra/prisma.service";
import { SettingsService } from "../settings/settings.service";
import { orderNumber } from "./order-number";
import { type OrderWithRelations, documentsComplete, orderInclude, toOrderView } from "./order-view";
import { PricingService } from "./pricing.service";

/** Customer-editable states. Editing a PENDING_PAYMENT order sends it back to DRAFT. */
const EDITABLE: OrderStatus[] = ["DRAFT", "PENDING_PAYMENT"];
const date = (d: string | null) => (d ? new Date(`${d}T00:00:00.000Z`) : null);

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly pii: PiiService,
    private readonly settings: SettingsService,
    private readonly events: EventEmitter2,
  ) {}

  quote(input: QuoteInput & { couponCode?: string | undefined }, userId: string | null) {
    return this.pricing.price(input.serviceSlug, input.travelers.map((t) => ({ applicantType: t.applicantType, nationalityIso2: t.nationalityIso2.toUpperCase() })), input.couponCode, userId).then((r) => r.quote);
  }

  /** Loads an order the user may see: their own, or any order for staff. */
  async load(user: RequestUser, id: string): Promise<OrderWithRelations> {
    const order = await this.prisma.order.findUnique({ where: { id }, include: orderInclude });
    if (!order || (order.customerId !== user.id && user.role === "CUSTOMER")) throw Problem.notFound("Order");
    return order;
  }

  async view(user: RequestUser, id: string): Promise<OrderView> {
    return toOrderView(await this.load(user, id), this.pii);
  }

  /** Full traveller details for the owner to edit a draft (the only place passport numbers are decrypted for display). */
  async editableTravelers(user: RequestUser, id: string): Promise<TravelerInput[]> {
    const order = await this.load(user, id);
    if (order.customerId !== user.id) throw Problem.notFound("Order");
    if (!EDITABLE.includes(order.status)) throw Problem.conflict("order_locked", "This order can no longer be edited.");
    const day = (d: Date) => d.toISOString().slice(0, 10);
    return order.travelers.map((t) => ({
      relationship: t.relationship,
      givenNameEn: t.givenNameEn,
      surnameEn: t.surnameEn,
      fullNameAr: t.fullNameAr,
      gender: t.gender,
      dateOfBirth: day(t.dateOfBirth),
      nationalityIso2: t.nationality.iso2,
      applicantType: t.applicantType as TravelerInput["applicantType"],
      passportNumber: this.pii.decrypt(t.passportNumberEnc),
      passportExpiry: day(t.passportExpiry),
    }));
  }

  async listMine(user: RequestUser) {
    const orders = await this.prisma.order.findMany({ where: { customerId: user.id }, orderBy: { createdAt: "desc" }, take: 50, include: orderInclude });
    return orders.map((o) => toOrderView(o, this.pii));
  }

  private async nationalityIds(travelers: TravelerData[]) {
    const isos = [...new Set(travelers.map((t) => t.nationalityIso2))];
    const rows = await this.prisma.country.findMany({ where: { iso2: { in: isos } }, select: { id: true, iso2: true } });
    const map = new Map(rows.map((r) => [r.iso2, r.id]));
    travelers.forEach((t, index) => {
      if (!map.has(t.nationalityIso2)) throw new Problem(HttpStatus.UNPROCESSABLE_ENTITY, "validation_failed", "Unknown nationality.", { errors: [{ path: `travelers.${index}.nationalityIso2`, code: "custom", message: "iso2" }] });
    });
    return map;
  }

  /** Saved traveller profiles (the family "vault"), matched by the passport blind index. */
  private async upsertSavedTraveler(tx: Prisma.TransactionClient, userId: string, t: TravelerData, nationalityId: string) {
    const passportNumberHash = this.pii.blindIndex(t.passportNumber);
    const data = {
      relationship: t.relationship,
      givenNameEn: t.givenNameEn,
      surnameEn: t.surnameEn,
      fullNameAr: t.fullNameAr,
      gender: t.gender,
      dateOfBirth: date(t.dateOfBirth)!,
      nationalityId,
      applicantType: t.applicantType,
      passportNumberEnc: this.pii.encrypt(t.passportNumber),
      passportExpiry: date(t.passportExpiry)!,
    };
    const existing = await tx.traveler.findFirst({ where: { userId, passportNumberHash, deletedAt: null }, select: { id: true } });
    return existing ? tx.traveler.update({ where: { id: existing.id }, data }) : tx.traveler.create({ data: { ...data, userId, passportNumberHash } });
  }

  async createDraft(user: RequestUser, input: OrderDraftData): Promise<OrderView> {
    const priced = await this.pricing.priceStrict(input.serviceSlug, input.travelers, null, user.id);
    if (priced.service.category === "VISA" && !priced.service.countryId) throw Problem.notFound("Service");
    const nationalities = await this.nationalityIds(input.travelers);
    const { breakdown, lines } = priced.quote;

    const id = await this.prisma.$transaction(async (tx) => {
      if (input.email) await tx.user.updateMany({ where: { id: user.id, email: null }, data: { email: input.email } }).catch(() => undefined);
      const order = await this.createWithNumber(tx, {
        customerId: user.id,
        serviceId: priced.service.id,
        destinationId: priced.service.countryId,
        purpose: input.purpose ?? priced.service.purpose,
        travelFrom: date(input.travelFrom),
        travelTo: date(input.travelTo),
        contactPhone: user.phone,
        locale: input.locale,
        preferredCity: input.preferredCity,
        preferredDateFrom: date(input.preferredDateFrom),
        preferredDateTo: date(input.preferredDateTo),
        appointmentNotes: input.appointmentNotes,
        governmentFeesHalalas: breakdown.governmentFees,
        serviceFeesHalalas: breakdown.serviceFees,
        vatHalalas: breakdown.vat,
        totalHalalas: breakdown.total,
        vatRate: breakdown.vatRate,
      });
      for (const [i, t] of input.travelers.entries()) {
        const nationalityId = nationalities.get(t.nationalityIso2)!;
        const saved = await this.upsertSavedTraveler(tx, user.id, t, nationalityId);
        await tx.orderTraveler.create({ data: this.travelerSnapshot(order.id, t, nationalityId, lines[i]!, i, saved.id) });
      }
      await tx.orderStatusEvent.create({ data: { orderId: order.id, fromStatus: null, toStatus: "DRAFT", actorId: user.id } });
      return order.id;
    });
    return this.view(user, id);
  }

  private travelerSnapshot(orderId: string, t: TravelerData, nationalityId: string, line: { governmentFee: number; serviceFee: number }, sortOrder: number, travelerId: string) {
    return {
      orderId,
      travelerId,
      relationship: t.relationship,
      givenNameEn: t.givenNameEn,
      surnameEn: t.surnameEn,
      fullNameAr: t.fullNameAr,
      gender: t.gender,
      dateOfBirth: date(t.dateOfBirth)!,
      nationalityId,
      applicantType: t.applicantType,
      passportNumberEnc: this.pii.encrypt(t.passportNumber),
      passportExpiry: date(t.passportExpiry)!,
      governmentFeeHalalas: line.governmentFee,
      serviceFeeHalalas: line.serviceFee,
      sortOrder,
    };
  }

  /** Order numbers are random; retry on the (rare) collision. */
  private async createWithNumber(tx: Prisma.TransactionClient, data: Omit<Prisma.OrderUncheckedCreateInput, "number">) {
    for (let attempt = 0; ; attempt++) {
      const number = orderNumber();
      if (await tx.order.findUnique({ where: { number }, select: { id: true } })) {
        if (attempt > 5) throw new Error("could not allocate an order number");
        continue;
      }
      return tx.order.create({ data: { ...data, number } });
    }
  }

  /**
   * Replaces the draft. Travellers are matched to existing order travellers by passport number so
   * their uploaded documents survive edits; removed travellers (and their documents) are dropped.
   */
  async updateDraft(user: RequestUser, id: string, input: OrderDraftData): Promise<OrderView> {
    const order = await this.load(user, id);
    if (order.customerId !== user.id) throw Problem.notFound("Order");
    if (!EDITABLE.includes(order.status)) throw Problem.conflict("order_locked", "This order can no longer be edited.");
    if (order.service.slug !== input.serviceSlug) throw Problem.conflict("service_change", "Start a new application to change the visa.");
    const priced = await this.pricing.priceStrict(order.service.slug, input.travelers, null, user.id);
    const nationalities = await this.nationalityIds(input.travelers);
    const { breakdown, lines } = priced.quote;
    const existing = order.travelers.map((t) => ({ id: t.id, number: this.pii.decrypt(t.passportNumberEnc) }));

    await this.prisma.$transaction(async (tx) => {
      const kept = new Set<string>();
      for (const [i, t] of input.travelers.entries()) {
        const nationalityId = nationalities.get(t.nationalityIso2)!;
        const saved = await this.upsertSavedTraveler(tx, user.id, t, nationalityId);
        const snapshot = this.travelerSnapshot(order.id, t, nationalityId, lines[i]!, i, saved.id);
        const match = existing.find((e) => e.number === t.passportNumber && !kept.has(e.id));
        if (match) {
          kept.add(match.id);
          await tx.orderTraveler.update({ where: { id: match.id }, data: snapshot });
        } else {
          await tx.orderTraveler.create({ data: snapshot });
        }
      }
      // Previously saved travellers that matched nobody were removed from the application.
      const removed = order.travelers.map((t) => t.id).filter((tid) => !kept.has(tid));
      if (removed.length) await tx.orderTraveler.deleteMany({ where: { id: { in: removed } } });
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "DRAFT",
          purpose: input.purpose ?? order.purpose,
          travelFrom: date(input.travelFrom),
          travelTo: date(input.travelTo),
          preferredCity: input.preferredCity,
          preferredDateFrom: date(input.preferredDateFrom),
          preferredDateTo: date(input.preferredDateTo),
          appointmentNotes: input.appointmentNotes,
          locale: input.locale,
          governmentFeesHalalas: breakdown.governmentFees,
          serviceFeesHalalas: breakdown.serviceFees,
          discountHalalas: 0,
          vatHalalas: breakdown.vat,
          totalHalalas: breakdown.total,
          couponId: null,
        },
      });
      if (order.status !== "DRAFT") await tx.orderStatusEvent.create({ data: { orderId: order.id, fromStatus: order.status, toStatus: "DRAFT", actorId: user.id } });
    });
    return this.view(user, id);
  }

  /**
   * Locks the price (with any coupon), records the PDPL consents and the refund-policy version,
   * and moves the order to PENDING_PAYMENT. A zero-total order (e.g. visa-free with no fees) skips payment.
   */
  async submit(user: RequestUser, id: string, input: { couponCode: string | null; marketing: boolean }, meta: RequestMeta): Promise<OrderView> {
    const order = await this.load(user, id);
    if (order.customerId !== user.id) throw Problem.notFound("Order");
    if (!EDITABLE.includes(order.status)) throw Problem.conflict("order_locked", "This order can no longer be changed.");
    if (!documentsComplete(order)) throw new Problem(HttpStatus.UNPROCESSABLE_ENTITY, "documents_incomplete", "Upload every required document first.");

    const travelers = order.travelers.map((t) => ({ applicantType: t.applicantType as "SAUDI_CITIZEN" | "RESIDENT", nationalityIso2: t.nationality.iso2 }));
    const priced = await this.pricing.priceStrict(order.service.slug, travelers, input.couponCode, user.id);
    if (input.couponCode && !priced.coupon) throw new Problem(HttpStatus.UNPROCESSABLE_ENTITY, priced.quote.coupon?.reason ?? "coupon_invalid", "This coupon can't be used.");
    const { breakdown } = priced.quote;
    const legal = await this.settings.get("legal");

    const consents = [
      { type: "TERMS" as const, policyVersion: legal.termsVersion, granted: true },
      { type: "PRIVACY_POLICY" as const, policyVersion: legal.privacyVersion, granted: true },
      { type: "DATA_PROCESSING" as const, policyVersion: legal.privacyVersion, granted: true },
      { type: "CROSS_BORDER_TRANSFER" as const, policyVersion: legal.privacyVersion, granted: true },
      { type: "MARKETING" as const, policyVersion: legal.privacyVersion, granted: input.marketing },
    ];
    const free = breakdown.total === 0;
    const to: OrderStatus = free ? "RECEIVED" : "PENDING_PAYMENT";

    await this.prisma.$transaction(async (tx) => {
      await tx.consent.createMany({ data: consents.map((c) => ({ ...c, userId: user.id, ip: meta.ip, userAgent: meta.userAgent })) });
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: to,
          governmentFeesHalalas: breakdown.governmentFees,
          serviceFeesHalalas: breakdown.serviceFees,
          discountHalalas: breakdown.discount,
          vatHalalas: breakdown.vat,
          totalHalalas: breakdown.total,
          vatRate: breakdown.vatRate,
          couponId: priced.coupon?.id ?? null,
          refundPolicyVersion: legal.refundPolicyVersion,
          submittedAt: new Date(),
          ...(free ? { slaDueAt: this.slaFrom(new Date()) } : {}),
        },
      });
      await tx.orderStatusEvent.create({ data: { orderId: order.id, fromStatus: order.status, toStatus: to, actorId: user.id } });
    });
    if (free) await this.events.emitAsync(EVENTS.orderStatusChanged, { orderId: order.id, from: order.status, to, actorId: user.id, customerNote: null } satisfies OrderStatusChangedEvent);
    return this.view(user, id);
  }

  /** First human review is promised within working hours; Phase 6 refines SLAs per status. */
  private slaFrom(start: Date) {
    return new Date(start.getTime() + 24 * 3_600_000);
  }

  /** Payment confirmed → RECEIVED. Idempotent: only a PENDING_PAYMENT order moves, once. */
  @OnEvent(EVENTS.paymentSucceeded, { async: true, promisify: true })
  async onPaymentSucceeded(event: PaymentSucceededEvent) {
    const order = await this.prisma.order.findUnique({ where: { id: event.orderId }, select: { id: true, status: true, customerId: true, couponId: true, discountHalalas: true, totalHalalas: true } });
    if (!order) return;
    if (!canTransition(order.status, "RECEIVED")) {
      this.logger.warn(`payment ${event.paymentId} succeeded for order ${order.id} in status ${order.status}; leaving it for staff`);
      return;
    }
    const moved = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({ where: { id: order.id, status: "PENDING_PAYMENT" }, data: { status: "RECEIVED", slaDueAt: this.slaFrom(new Date()) } });
      if (count === 0) return false;
      await tx.orderStatusEvent.create({ data: { orderId: order.id, fromStatus: "PENDING_PAYMENT", toStatus: "RECEIVED", actorId: null } });
      if (order.couponId) {
        await tx.couponRedemption.upsert({ where: { orderId: order.id }, create: { couponId: order.couponId, userId: order.customerId, orderId: order.id, amountHalalas: order.discountHalalas }, update: {} });
      }
      return true;
    });
    if (moved) await this.events.emitAsync(EVENTS.orderStatusChanged, { orderId: order.id, from: "PENDING_PAYMENT", to: "RECEIVED", actorId: null, customerNote: null } satisfies OrderStatusChangedEvent);
  }

  /** Status history (customer notes only), appointment, shipments and invoices for the order page. */
  async timeline(user: RequestUser, id: string): Promise<OrderTimelineView> {
    const order = await this.load(user, id);
    const [events, appointment, shipments, invoices] = await Promise.all([
      this.prisma.orderStatusEvent.findMany({ where: { orderId: order.id }, orderBy: { createdAt: "asc" }, select: { id: true, toStatus: true, customerNote: true, createdAt: true } }),
      this.prisma.appointment.findUnique({ where: { orderId: order.id } }),
      this.prisma.shipment.findMany({ where: { orderId: order.id }, orderBy: { createdAt: "asc" } }),
      this.prisma.invoice.findMany({ where: { orderId: order.id }, orderBy: { issuedAt: "desc" } }),
    ]);
    return {
      events: events.map((e) => ({ id: e.id, status: e.toStatus, note: e.customerNote, at: e.createdAt.toISOString() })),
      appointment: appointment ? { center: appointment.center, city: appointment.city, scheduledAt: appointment.scheduledAt.toISOString(), reference: appointment.reference } : null,
      shipments: shipments.map((s) => ({ direction: s.direction, carrier: s.carrier, trackingNumber: s.trackingNumber, status: s.status, updatedAt: s.updatedAt.toISOString() })),
      decision: order.decision,
      invoices: invoices.map((i) => ({ id: i.id, number: i.number, type: i.type, issuedAt: i.issuedAt.toISOString(), totalHalalas: i.totalHalalas, orderId: order.id, orderNumber: order.number, zatcaStatus: i.zatcaStatus })),
    };
  }

  /** The customer fixed what we asked for: ACTION_REQUIRED → DOCUMENTS_REVIEW, back in the agent's queue. */
  async resubmit(user: RequestUser, id: string): Promise<OrderView> {
    const order = await this.load(user, id);
    if (order.customerId !== user.id) throw Problem.notFound("Order");
    if (order.status !== "ACTION_REQUIRED") throw Problem.conflict("order_not_waiting", "This order isn't waiting for you.");
    if (!documentsComplete(order, { excludeRejected: true })) throw new Problem(HttpStatus.UNPROCESSABLE_ENTITY, "documents_incomplete", "Replace every rejected document first.");
    const moved = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({ where: { id: order.id, status: "ACTION_REQUIRED" }, data: { status: "DOCUMENTS_REVIEW", slaDueAt: this.slaFrom(new Date()) } });
      if (count === 0) return false;
      await tx.orderStatusEvent.create({ data: { orderId: order.id, fromStatus: "ACTION_REQUIRED", toStatus: "DOCUMENTS_REVIEW", actorId: user.id } });
      return true;
    });
    if (moved) await this.events.emitAsync(EVENTS.orderStatusChanged, { orderId: order.id, from: "ACTION_REQUIRED", to: "DOCUMENTS_REVIEW", actorId: user.id, customerNote: null } satisfies OrderStatusChangedEvent);
    return this.view(user, id);
  }

  async cancel(user: RequestUser, id: string): Promise<OrderView> {
    const order = await this.load(user, id);
    if (order.customerId !== user.id) throw Problem.notFound("Order");
    if (!EDITABLE.includes(order.status)) throw Problem.conflict("order_locked", "Paid orders are cancelled through support (refund policy applies).");
    await this.prisma.$transaction([
      this.prisma.order.update({ where: { id }, data: { status: "CANCELLED", closedAt: new Date() } }),
      this.prisma.orderStatusEvent.create({ data: { orderId: id, fromStatus: order.status, toStatus: "CANCELLED", actorId: user.id } }),
    ]);
    return this.view(user, id);
  }
}

