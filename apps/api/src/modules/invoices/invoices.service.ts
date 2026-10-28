import { randomUUID } from "node:crypto";
import { Inject, Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { can, type InvoiceSummary, type InvoiceView } from "@myvisa/shared";
import type { Prisma } from "@myvisa/db";
import { ENV, type Env } from "../../config/env";
import type { RequestUser } from "../../common/auth.types";
import { EVENTS, type OrderStatusChangedEvent } from "../../common/events";
import { Problem } from "../../common/problem";
import { PrismaService } from "../../infra/prisma.service";
import { QUEUES, QueueService } from "../../infra/queue";
import { StorageService } from "../../infra/storage.service";
import { SettingsService } from "../settings/settings.service";
import { type EgsKeys, INITIAL_PIH, loadEgsKeys, stampInvoice } from "./zatca";

/** Serialises invoice issuing across API instances: the ICV and the hash chain must never fork. */
const CHAIN_LOCK = 7_262_001;

interface IssueJob {
  orderId: string;
}

const invoiceInclude = {
  lines: { orderBy: { id: "asc" } },
  order: { select: { id: true, number: true, customerId: true, contactPhone: true } },
} satisfies Prisma.InvoiceInclude;
type InvoiceWithLines = Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>;

/**
 * ZATCA simplified tax invoices. One is issued when an order is paid (→ RECEIVED); invoices are never
 * edited or deleted — corrections are credit notes. Lines keep our VAT-able service fee apart from the
 * government fees we collect on the customer's behalf (out of scope), mirroring the price split on the site.
 */
@Injectable()
export class InvoicesService implements OnModuleInit {
  private readonly logger = new Logger(InvoicesService.name);
  private readonly keys: EgsKeys | null;

  constructor(
    @Inject(ENV) env: Env,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly queues: QueueService,
    private readonly settings: SettingsService,
  ) {
    this.keys = loadEgsKeys(env.ZATCA_EGS_PRIVATE_KEY, env.ZATCA_EGS_CERTIFICATE, env.NODE_ENV !== "production");
    if (!this.keys) this.logger.warn("ZATCA_EGS_PRIVATE_KEY is not set: invoices are hashed and chained but not signed");
  }

  onModuleInit() {
    this.queues.process<IssueJob>(QUEUES.invoices, (job) => this.issueForOrder(job.data.orderId), 1);
  }

  /** Paid → invoice. Issued inline so it is there when the customer lands; a failure is retried by the queue. */
  @OnEvent(EVENTS.orderStatusChanged, { async: true, promisify: true })
  async onStatusChanged(event: OrderStatusChangedEvent) {
    if (event.to !== "RECEIVED" || event.from !== "PENDING_PAYMENT") return;
    try {
      await this.issueForOrder(event.orderId);
    } catch (err) {
      this.logger.error(`invoice for ${event.orderId} failed, queued for retry: ${(err as Error).message}`);
      await this.queues.add<IssueJob>(QUEUES.invoices, "issue", { orderId: event.orderId }, { jobId: `invoice-${event.orderId}`, delay: 5_000 }).catch(() => undefined);
    }
  }

  /** Idempotent: returns the existing simplified invoice when the order already has one. */
  async issueForOrder(orderId: string): Promise<string | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { fullNameAr: true, fullNameEn: true } },
        service: { select: { nameAr: true, nameEn: true } },
        destination: { select: { nameAr: true, nameEn: true } },
        travelers: { select: { id: true, givenNameEn: true, surnameEn: true }, orderBy: { sortOrder: "asc" } },
        invoices: { where: { type: "SIMPLIFIED" }, select: { id: true } },
      },
    });
    if (!order) return null;
    if (order.invoices[0]) return order.invoices[0].id;
    if (order.totalHalalas <= 0) return null;

    const n = order.travelers.length;
    const where = order.destination ? { ar: order.destination.nameAr, en: order.destination.nameEn } : { ar: order.service.nameAr, en: order.service.nameEn };
    const serviceNet = order.serviceFeesHalalas - order.discountHalalas;
    const lines = [
      serviceNet > 0 && {
        descriptionAr: `رسوم خدمة ماي فيزا — ${order.service.nameAr} (${n} ${n === 1 ? "مسافر" : n === 2 ? "مسافران" : "مسافرين"})`,
        descriptionEn: `myvisa service fee — ${order.service.nameEn} (${n} traveller${n === 1 ? "" : "s"})`,
        quantity: 1,
        unitPriceHalalas: serviceNet,
        vatCategory: "S" as const,
        vatRate: order.vatRate,
        vatHalalas: order.vatHalalas,
        lineTotalHalalas: serviceNet + order.vatHalalas,
      },
      order.governmentFeesHalalas > 0 && {
        descriptionAr: `رسوم حكومية وسفارة — ${where.ar} (تُحصَّل نيابةً عنك، خارج نطاق الضريبة)`,
        descriptionEn: `Government and embassy fees — ${where.en} (collected on your behalf, out of VAT scope)`,
        quantity: 1,
        unitPriceHalalas: order.governmentFeesHalalas,
        vatCategory: "O" as const,
        vatRate: 0,
        vatHalalas: 0,
        lineTotalHalalas: order.governmentFeesHalalas,
      },
    ].filter((l) => l !== false);
    const subtotal = order.governmentFeesHalalas + serviceNet;
    const lead = order.travelers[0];
    const buyerName = order.customer.fullNameAr ?? order.customer.fullNameEn ?? (lead ? `${lead.givenNameEn} ${lead.surnameEn}` : null);
    return this.chain({ orderId: order.id, type: "SIMPLIFIED", prefix: "INV", buyerName, lines, subtotal, vat: order.vatHalalas, total: order.totalHalalas, logLabel: order.number });
  }

  /**
   * Credit note for a refund (ZATCA type 381, linked to the order's invoice). The refunded amount is spread
   * over the original lines in proportion, so VAT is credited only on the part that carried VAT.
   */
  async issueCreditNote(refundId: string, reason: string): Promise<string | null> {
    const refund = await this.prisma.refund.findUnique({ where: { id: refundId }, include: { creditNote: { select: { id: true } }, payment: { select: { orderId: true } } } });
    if (!refund) return null;
    if (refund.creditNote) return refund.creditNote.id;
    const original = await this.prisma.invoice.findFirst({ where: { orderId: refund.payment.orderId, type: "SIMPLIFIED" }, include: { lines: { orderBy: { id: "asc" } } } });
    if (!original) return null;
    const amount = Math.min(refund.amountHalalas, original.totalHalalas);
    let remaining = amount;
    const lines = original.lines.map((l, i, all) => {
      const gross = i === all.length - 1 ? remaining : Math.round((l.lineTotalHalalas * amount) / original.totalHalalas);
      remaining -= gross;
      const vat = l.vatCategory === "S" ? Math.round((gross * l.vatRate) / (1 + l.vatRate)) : 0;
      return { descriptionAr: l.descriptionAr, descriptionEn: l.descriptionEn, quantity: 1, unitPriceHalalas: gross - vat, vatCategory: l.vatCategory, vatRate: l.vatRate, vatHalalas: vat, lineTotalHalalas: gross };
    });
    const vat = lines.reduce((s, l) => s + l.vatHalalas, 0);
    return this.chain({ orderId: refund.payment.orderId, type: "CREDIT_NOTE", prefix: "CN", buyerName: original.buyerName, lines, subtotal: amount - vat, vat, total: amount, refundId: refund.id, billingReference: original.number, reason, logLabel: original.number });
  }

  /** Issues the next document in the hash chain (invoice or credit note), serialised by the advisory lock. */
  private async chain(doc: {
    orderId: string;
    type: "SIMPLIFIED" | "CREDIT_NOTE";
    prefix: "INV" | "CN";
    buyerName: string | null;
    lines: { descriptionAr: string; descriptionEn: string; quantity: number; unitPriceHalalas: number; vatCategory: "S" | "O"; vatRate: number; vatHalalas: number; lineTotalHalalas: number }[];
    subtotal: number;
    vat: number;
    total: number;
    refundId?: string;
    billingReference?: string;
    reason?: string;
    logLabel: string;
  }): Promise<string> {
    const company = await this.settings.get("company");
    const postalCode = /\b\d{5}\b/.exec(company.address.en)?.[0] ?? "00000";
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(${CHAIN_LOCK})) AS l`;
        if (doc.type === "SIMPLIFIED") {
          const again = await tx.invoice.findFirst({ where: { orderId: doc.orderId, type: "SIMPLIFIED" }, select: { id: true } });
          if (again) return again.id;
        } else if (doc.refundId) {
          const again = await tx.invoice.findUnique({ where: { refundId: doc.refundId }, select: { id: true } });
          if (again) return again.id;
        }

        const last = await tx.invoice.findFirst({ orderBy: { icv: "desc" }, select: { icv: true, invoiceHash: true } });
        const icv = (last?.icv ?? 0) + 1;
        const issuedAt = new Date();
        const number = `${doc.prefix}-${issuedAt.getUTCFullYear()}-${String(icv).padStart(6, "0")}`;
        const uuid = randomUUID();
        const previousInvoiceHash = last?.invoiceHash ?? INITIAL_PIH;

        const stamped = stampInvoice(
          {
            kind: doc.type === "CREDIT_NOTE" ? "credit" : "invoice",
            billingReference: doc.billingReference,
            reason: doc.reason,
            number,
            uuid,
            icv,
            issuedAt,
            previousInvoiceHash,
            seller: { name: company.legalName.ar, vatNumber: company.vatNumber, crNumber: company.crNumber, street: company.address.en.split(",")[0] ?? company.address.en, city: "Riyadh", postalCode },
            buyerName: doc.buyerName,
            lines: doc.lines.map((l, i) => ({ id: i + 1, name: l.descriptionAr, quantity: l.quantity, unitPriceHalalas: l.unitPriceHalalas, vatCategory: l.vatCategory, vatRate: l.vatRate, vatHalalas: l.vatHalalas, lineExtensionHalalas: l.unitPriceHalalas * l.quantity })),
            subtotalHalalas: doc.subtotal,
            vatHalalas: doc.vat,
            totalHalalas: doc.total,
          },
          this.keys,
        );
        const xmlStorageKey = `invoices/${issuedAt.getUTCFullYear()}/${number}.xml`;
        await this.storage.put(xmlStorageKey, Buffer.from(stamped.xml, "utf8"), "application/xml");

        const invoice = await tx.invoice.create({
          data: {
            number,
            uuid,
            icv,
            type: doc.type,
            orderId: doc.orderId,
            refundId: doc.refundId ?? null,
            issuedAt,
            buyerName: doc.buyerName,
            subtotalHalalas: doc.subtotal,
            vatHalalas: doc.vat,
            totalHalalas: doc.total,
            previousInvoiceHash,
            invoiceHash: stamped.invoiceHash,
            qrPayload: stamped.qrPayload,
            xmlStorageKey,
            lines: { create: doc.lines },
          },
        });
        this.logger.log(`issued ${number} for ${doc.logLabel}`);
        return invoice.id;
      },
      { timeout: 20_000 },
    );
  }

  async listMine(user: RequestUser): Promise<InvoiceSummary[]> {
    const rows = await this.prisma.invoice.findMany({ where: { order: { customerId: user.id } }, include: invoiceInclude, orderBy: { issuedAt: "desc" }, take: 100 });
    return rows.map(toSummary);
  }

  private async load(user: RequestUser, id: string): Promise<InvoiceWithLines> {
    const invoice = await this.prisma.invoice.findUnique({ where: { id }, include: invoiceInclude });
    if (!invoice || (invoice.order.customerId !== user.id && !can(user.role, "finance:read"))) throw Problem.notFound("Invoice");
    return invoice;
  }

  async view(user: RequestUser, id: string): Promise<InvoiceView> {
    const invoice = await this.load(user, id);
    const company = await this.settings.get("company");
    return {
      ...toSummary(invoice),
      uuid: invoice.uuid,
      icv: invoice.icv,
      seller: { name: company.legalName, vatNumber: company.vatNumber, crNumber: company.crNumber, address: company.address },
      buyer: { name: invoice.buyerName, phone: invoice.order.contactPhone, vatNumber: invoice.buyerVatNumber },
      lines: invoice.lines.map((l) => ({
        description: { ar: l.descriptionAr, en: l.descriptionEn },
        quantity: l.quantity,
        unitPriceHalalas: l.unitPriceHalalas,
        vatCategory: l.vatCategory,
        vatRate: l.vatRate,
        vatHalalas: l.vatHalalas,
        lineTotalHalalas: l.lineTotalHalalas,
      })),
      subtotalHalalas: invoice.subtotalHalalas,
      vatHalalas: invoice.vatHalalas,
      invoiceHash: invoice.invoiceHash,
      qrPayload: invoice.qrPayload,
    };
  }

  /** The signed UBL XML, via a short-lived URL. */
  async xmlUrl(user: RequestUser, id: string) {
    const invoice = await this.load(user, id);
    if (!invoice.xmlStorageKey) throw Problem.notFound("Invoice XML");
    return { url: await this.storage.presignGet(invoice.xmlStorageKey, `${invoice.number}.xml`), expiresIn: 300 };
  }
}

function toSummary(i: InvoiceWithLines): InvoiceSummary {
  return { id: i.id, number: i.number, type: i.type, issuedAt: i.issuedAt.toISOString(), totalHalalas: i.totalHalalas, orderId: i.order.id, orderNumber: i.order.number, zatcaStatus: i.zatcaStatus };
}

export { toSummary as toInvoiceSummary, invoiceInclude };
