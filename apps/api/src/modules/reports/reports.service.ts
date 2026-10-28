import { HttpStatus, Injectable } from "@nestjs/common";
import { OUR_TURN, type ReportOverview } from "@myvisa/shared";
import type { Prisma } from "@myvisa/db";
import { Problem } from "../../common/problem";
import { PrismaService } from "../../infra/prisma.service";

const DAY = 86_400_000;
const OPEN: Prisma.OrderWhereInput = { status: { notIn: ["DRAFT", "PENDING_PAYMENT", "DELIVERED", "CANCELLED", "REFUNDED"] } };
const CAPTURED = ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] as const;

/** Riyadh calendar day → UTC instants (Saudi Arabia has no DST: UTC+3 all year). */
const startOf = (day: string) => new Date(`${day}T00:00:00.000+03:00`);
const endOf = (day: string) => new Date(`${day}T23:59:59.999+03:00`);
const riyadhDay = (d: Date) => new Date(d.getTime() + 3 * 3_600_000).toISOString().slice(0, 10);
const shift = (day: string, days: number) => new Date(startOf(day).getTime() + days * DAY + 3 * 3_600_000).toISOString().slice(0, 10);

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

const csvCell = (v: string | number | null) => {
  const s = v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Management numbers. Money is counted when it was captured (payment `paidAt`), in Riyadh days; refunds when
 * they were issued. Revenue is what customers paid; "net service" is what we actually earn (our fee after
 * discounts, before VAT) — government fees pass straight through.
 */
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private validate(from: string, to: string) {
    if (to < from) throw new Problem(HttpStatus.UNPROCESSABLE_ENTITY, "validation_failed", "`to` is before `from`.", { errors: [{ path: "to", code: "custom", message: "date_order" }] });
    const days = Math.round((startOf(to).getTime() - startOf(from).getTime()) / DAY) + 1;
    if (days > 366) throw new Problem(HttpStatus.UNPROCESSABLE_ENTITY, "validation_failed", "Pick a range of a year or less.", { errors: [{ path: "from", code: "custom", message: "range_too_long" }] });
    return days;
  }

  private paidIn(from: string, to: string) {
    return this.prisma.payment.findMany({
      where: { status: { in: [...CAPTURED] }, paidAt: { gte: startOf(from), lte: endOf(to) } },
      select: {
        paidAt: true,
        order: {
          select: { id: true, totalHalalas: true, serviceFeesHalalas: true, discountHalalas: true, governmentFeesHalalas: true, vatHalalas: true, destination: { select: { iso2: true, nameAr: true, nameEn: true } } },
        },
      },
    });
  }

  private async period(from: string, to: string) {
    const window = { gte: startOf(from), lte: endOf(to) };
    const [payments, started, refunds, decisions] = await Promise.all([
      this.paidIn(from, to),
      this.prisma.order.count({ where: { createdAt: window } }),
      this.prisma.refund.aggregate({ where: { status: { in: ["COMPLETED", "PROCESSING"] }, createdAt: window }, _sum: { amountHalalas: true } }),
      this.prisma.orderStatusEvent.findMany({ where: { toStatus: "DECISION_ISSUED", createdAt: window }, select: { order: { select: { decision: true } } } }),
    ]);
    // One order can have one captured payment; dedupe defensively.
    const orders = [...new Map(payments.map((p) => [p.order.id, p.order])).values()];
    const sum = (f: (o: (typeof orders)[number]) => number) => orders.reduce((s, o) => s + f(o), 0);
    const revenue = sum((o) => o.totalHalalas);

    // First staff action after payment, per order paid in the period.
    const events = orders.length
      ? await this.prisma.orderStatusEvent.findMany({ where: { orderId: { in: orders.map((o) => o.id) } }, select: { orderId: true, toStatus: true, actorId: true, createdAt: true }, orderBy: { createdAt: "asc" } })
      : [];
    const responses: number[] = [];
    for (const o of orders) {
      const mine = events.filter((e) => e.orderId === o.id);
      const received = mine.find((e) => e.toStatus === "RECEIVED");
      const first = received && mine.find((e) => e.createdAt > received.createdAt && e.actorId);
      if (received && first) responses.push((first.createdAt.getTime() - received.createdAt.getTime()) / 3_600_000);
    }
    const decided = decisions.filter((d) => d.order.decision);

    return {
      payments,
      orders,
      kpis: {
        paidOrders: orders.length,
        revenueHalalas: revenue,
        netServiceHalalas: sum((o) => o.serviceFeesHalalas - o.discountHalalas),
        governmentHalalas: sum((o) => o.governmentFeesHalalas),
        vatHalalas: sum((o) => o.vatHalalas),
        refundsHalalas: refunds._sum.amountHalalas ?? 0,
        conversion: started ? Math.min(1, orders.length / started) : 0,
        averageOrderHalalas: orders.length ? Math.round(revenue / orders.length) : 0,
        medianFirstResponseHours: median(responses),
        approvalRate: decided.length ? decided.filter((d) => d.order.decision === "APPROVED").length / decided.length : null,
      },
    };
  }

  /** What needs attention right now (not bound to a period). Agents see these on the admin overview. */
  async live() {
    const now = new Date();
    const [open, overdue, actionRequired, unassigned, pendingDocuments, unreadMessages] = await Promise.all([
      this.prisma.order.count({ where: OPEN }),
      this.prisma.order.count({ where: { status: { in: [...OUR_TURN] }, slaDueAt: { lt: now } } }),
      this.prisma.order.count({ where: { status: "ACTION_REQUIRED" } }),
      this.prisma.order.count({ where: { ...OPEN, assigneeId: null } }),
      this.prisma.orderDocument.count({ where: { reviewStatus: "PENDING", order: OPEN, document: { uploadedAt: { not: null }, deletedAt: null, scanStatus: "CLEAN" } } }),
      this.prisma.message.count({ where: { senderKind: "CUSTOMER", readAt: null, order: OPEN } }),
    ]);
    return { open, overdue, actionRequired, unassigned, pendingDocuments, unreadMessages };
  }

  async overview(from: string, to: string): Promise<ReportOverview> {
    const days = this.validate(from, to);
    const prevTo = shift(from, -1);
    const prevFrom = shift(from, -days);
    const window = { gte: startOf(from), lte: endOf(to) };
    const [cur, prev, live, cohort, byStatus, agents, handled] = await Promise.all([
      this.period(from, to),
      this.period(prevFrom, prevTo),
      this.live(),
      this.prisma.order.findMany({ where: { createdAt: window }, select: { status: true, submittedAt: true, decision: true, payments: { where: { status: { in: [...CAPTURED] } }, select: { id: true }, take: 1 } } }),
      this.prisma.order.groupBy({ by: ["status"], where: { createdAt: window }, _count: { _all: true } }),
      this.prisma.user.findMany({ where: { role: { in: ["AGENT", "MANAGER"] }, isActive: true, deletedAt: null }, select: { id: true, fullNameAr: true, fullNameEn: true, phone: true, assignedOrders: { where: OPEN, select: { status: true, slaDueAt: true } } } }),
      this.prisma.orderStatusEvent.groupBy({ by: ["actorId"], where: { createdAt: window, actorId: { not: null } }, _count: { _all: true } }),
    ]);

    const daily = Array.from({ length: days }, (_, i) => ({ date: shift(from, i), orders: 0, revenueHalalas: 0 }));
    for (const p of cur.payments) {
      const slot = daily.find((d) => d.date === riyadhDay(p.paidAt!));
      if (slot) {
        slot.orders += 1;
        slot.revenueHalalas += p.order.totalHalalas;
      }
    }

    const dest = new Map<string, ReportOverview["topDestinations"][number]>();
    for (const o of cur.orders) {
      if (!o.destination) continue;
      const key = o.destination.iso2;
      const row = dest.get(key) ?? { iso2: key.toLowerCase(), name: { ar: o.destination.nameAr, en: o.destination.nameEn }, orders: 0, revenueHalalas: 0 };
      row.orders += 1;
      row.revenueHalalas += o.totalHalalas;
      dest.set(key, row);
    }

    const now = Date.now();
    const k = (key: keyof typeof cur.kpis) => ({ value: cur.kpis[key], previous: prev.kpis[key] });
    return {
      range: { from, to, days },
      previous: { from: prevFrom, to: prevTo },
      kpis: {
        paidOrders: k("paidOrders") as { value: number; previous: number },
        revenueHalalas: k("revenueHalalas") as { value: number; previous: number },
        netServiceHalalas: k("netServiceHalalas") as { value: number; previous: number },
        governmentHalalas: k("governmentHalalas") as { value: number; previous: number },
        vatHalalas: k("vatHalalas") as { value: number; previous: number },
        refundsHalalas: k("refundsHalalas") as { value: number; previous: number },
        conversion: k("conversion") as { value: number; previous: number },
        averageOrderHalalas: k("averageOrderHalalas") as { value: number; previous: number },
        medianFirstResponseHours: k("medianFirstResponseHours") as { value: number | null; previous: number | null },
        approvalRate: k("approvalRate") as { value: number | null; previous: number | null },
      },
      live,
      daily,
      funnel: {
        started: cohort.length,
        submitted: cohort.filter((o) => o.submittedAt).length,
        paid: cohort.filter((o) => o.payments.length).length,
        decided: cohort.filter((o) => o.decision).length,
        delivered: cohort.filter((o) => o.status === "DELIVERED").length,
      },
      byStatus: Object.fromEntries(byStatus.map((g) => [g.status, g._count._all])),
      topDestinations: [...dest.values()].sort((a, b) => b.revenueHalalas - a.revenueHalalas).slice(0, 8),
      agents: agents
        .map((a) => ({
          id: a.id,
          name: a.fullNameAr ?? a.fullNameEn ?? a.phone,
          open: a.assignedOrders.length,
          overdue: a.assignedOrders.filter((o) => o.slaDueAt && OUR_TURN.includes(o.status) && o.slaDueAt.getTime() < now).length,
          handled: handled.find((h) => h.actorId === a.id)?._count._all ?? 0,
        }))
        .sort((a, b) => b.open - a.open),
    };
  }

  /** Paid orders in the range as CSV (UTF-8 with BOM so Excel opens Arabic correctly). For the accountant. */
  async ordersCsv(from: string, to: string): Promise<string> {
    this.validate(from, to);
    const payments = await this.prisma.payment.findMany({
      where: { status: { in: [...CAPTURED] }, paidAt: { gte: startOf(from), lte: endOf(to) } },
      orderBy: { paidAt: "asc" },
      include: {
        refunds: { where: { status: { in: ["COMPLETED", "PROCESSING"] } }, select: { amountHalalas: true } },
        order: {
          include: {
            customer: { select: { fullNameAr: true, fullNameEn: true, phone: true } },
            service: { select: { nameEn: true } },
            destination: { select: { nameEn: true } },
            invoices: { where: { type: "SIMPLIFIED" }, select: { number: true } },
            _count: { select: { travelers: true } },
          },
        },
      },
    });
    const sar = (h: number) => (h / 100).toFixed(2);
    const header = ["order", "paid_at_riyadh", "customer", "phone", "destination", "service", "travellers", "government_fees", "service_fees", "discount", "vat", "total", "refunded", "status", "invoice", "provider", "method"];
    const lines = payments.map((p) => {
      const o = p.order;
      return [
        o.number,
        new Date(p.paidAt!.getTime() + 3 * 3_600_000).toISOString().slice(0, 16).replace("T", " "),
        o.customer.fullNameAr ?? o.customer.fullNameEn ?? "",
        o.customer.phone,
        o.destination?.nameEn ?? "",
        o.service.nameEn,
        o._count.travelers,
        sar(o.governmentFeesHalalas),
        sar(o.serviceFeesHalalas),
        sar(o.discountHalalas),
        sar(o.vatHalalas),
        sar(o.totalHalalas),
        sar(p.refunds.reduce((s, r) => s + r.amountHalalas, 0)),
        o.status,
        o.invoices[0]?.number ?? "",
        p.provider,
        p.method ?? "",
      ]
        .map(csvCell)
        .join(",");
    });
    return `﻿${[header.join(","), ...lines].join("\r\n")}\r\n`;
  }
}
