import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AdminOrderDetail, AdminOrderPage, CouponView, CustomerDetail, CustomerPage, InvoiceView, ReportOverview, StaffMember } from "@myvisa/shared";
import { decodeTlv } from "../src/modules/invoices/zatca";
import { paidOrder, waitFor } from "./flows";
import { type Harness, type Session, as, freshPhone, signIn, startHarness } from "./harness";

const today = () => new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10);

describe("admin operations", () => {
  let h: Harness;
  let customer: Session;
  let agent: Session;
  let accountant: Session;
  let manager: Session;
  let admin: Session;

  const desk = (s: Session, id: string) => h.http.get(`/api/v1/admin/orders/${id}`).set(as(s)).then((r) => r.body as AdminOrderDetail);
  const move = (s: Session, id: string, body: object) => h.http.post(`/api/v1/admin/orders/${id}/status`).set(as(s)).send(body);

  beforeAll(async () => {
    h = await startHarness();
    customer = await signIn(h);
    agent = await signIn(h, "AGENT");
    accountant = await signIn(h, "ACCOUNTANT");
    manager = await signIn(h, "MANAGER");
    admin = await signIn(h, "SUPER_ADMIN");
  }, 60_000);
  afterAll(() => h.close());

  describe("order desk", () => {
    it("queue: open view, per-status counts, search by number and by exact passport (blind index)", async () => {
      const order = await paidOrder(h, customer, "Q1234567");
      const page = (await h.http.get("/api/v1/admin/orders").set(as(agent)).expect(200)).body as AdminOrderPage;
      const row = page.items.find((r) => r.id === order.id)!;
      expect(row).toMatchObject({ status: "RECEIVED", overdue: false, assignee: null, travelers: 1 });
      expect(row.pendingDocuments).toBeGreaterThan(0);
      expect(page.counts.RECEIVED).toBeGreaterThanOrEqual(1);
      const byNumber = (await h.http.get(`/api/v1/admin/orders?q=${order.number}`).set(as(agent))).body as AdminOrderPage;
      expect(byNumber.items.map((r) => r.id)).toEqual([order.id]);
      const byPassport = (await h.http.get("/api/v1/admin/orders?q=q1234567&view=all").set(as(agent))).body as AdminOrderPage;
      expect(byPassport.items.map((r) => r.id)).toEqual([order.id]);
      await h.http.get("/api/v1/admin/orders").set(as(customer)).expect(403);
    });

    it("walks an order from review to delivery, with guard rails and customer notifications", async () => {
      const order = await paidOrder(h, customer, "W7654321");
      let d = await desk(agent, order.id);
      expect(d.nextStatuses).toEqual(["DOCUMENTS_REVIEW", "ACTION_REQUIRED", "CANCELLED", "REFUNDED"]);

      // First review moves RECEIVED → DOCUMENTS_REVIEW and the agent picks the order up.
      const [first, ...rest] = d.order.documents;
      d = (await h.http.post(`/api/v1/admin/order-documents/${first!.id}/review`).set(as(agent)).send({ status: "REJECTED", reason: "صورة غير واضحة" }).expect(200)).body;
      expect(d.order.status).toBe("DOCUMENTS_REVIEW");
      expect(d.assignee?.id).toBe(agent.userId);
      await h.http.post(`/api/v1/admin/order-documents/${first!.id}/review`).set(as(agent)).send({ status: "REJECTED" }).expect(422);

      // Asking the customer for something needs a note they can act on.
      expect((await move(agent, order.id, { to: "ACTION_REQUIRED" }).expect(422)).body.code).toBe("validation_failed");
      await move(agent, order.id, { to: "ACTION_REQUIRED", customerNote: "ارفع صورة أوضح للجواز" }).expect(200);
      const seen = (await h.http.get(`/api/v1/orders/${order.id}`).set(as(customer))).body;
      expect(seen.statusNote).toBe("ارفع صورة أوضح للجواز");
      const notes = await waitFor(
        () => h.prisma.notification.findMany({ where: { userId: customer.userId, template: "order.update", channel: "IN_APP" } }),
        (n) => n.length >= 2,
      );
      expect(notes.some((n) => (n.payload as { note?: string }).note === "ارفع صورة أوضح للجواز")).toBe(true);

      // Staff can't jump the state machine or do the customer's/payment's moves.
      expect((await move(agent, order.id, { to: "DELIVERED" }).expect(409)).body.code).toBe("invalid_transition");
      await move(agent, order.id, { to: "RECEIVED" }).expect(409);

      // Back in review; forward needs every required file approved, and an appointment needs its details.
      await move(agent, order.id, { to: "DOCUMENTS_REVIEW" }).expect(200);
      expect((await move(agent, order.id, { to: "SUBMITTED_TO_EMBASSY" }).expect(409)).body.code).toBe("documents_not_approved");
      for (const doc of [first!, ...rest]) await h.http.post(`/api/v1/admin/order-documents/${doc.id}/review`).set(as(agent)).send({ status: "APPROVED" }).expect(200);
      expect((await move(agent, order.id, { to: "APPOINTMENT_BOOKED" }).expect(409)).body.code).toBe("appointment_missing");
      await h.http.put(`/api/v1/admin/orders/${order.id}/appointment`).set(as(agent)).send({ center: "VFS_GLOBAL", city: "RIYADH", scheduledAt: "2026-11-10T10:30:00+03:00", reference: "VFS-1" }).expect(200);
      await move(agent, order.id, { to: "APPOINTMENT_BOOKED", customerNote: "أحضر الجواز الأصلي" }).expect(200);
      await move(agent, order.id, { to: "SUBMITTED_TO_EMBASSY" }).expect(200);
      expect((await move(agent, order.id, { to: "DECISION_ISSUED" }).expect(422)).body.errors[0].message).toBe("decision_required");
      await move(agent, order.id, { to: "DECISION_ISSUED", decision: "APPROVED" }).expect(200);
      await h.http.post(`/api/v1/admin/orders/${order.id}/shipments`).set(as(agent)).send({ direction: "DELIVERY", carrier: "SMSA", trackingNumber: "SM123" }).expect(201);
      d = (await move(agent, order.id, { to: "DELIVERED" }).expect(200)).body;
      expect(d.order.status).toBe("DELIVERED");
      expect(d.decision).toBe("APPROVED");
      expect(d.slaDueAt).toBeNull();
      expect(d.timeline.shipments[0]).toMatchObject({ carrier: "SMSA", trackingNumber: "SM123" });
      expect(d.timeline.events.map((e) => e.status)).toEqual(["DRAFT", "PENDING_PAYMENT", "RECEIVED", "DOCUMENTS_REVIEW", "ACTION_REQUIRED", "DOCUMENTS_REVIEW", "APPOINTMENT_BOOKED", "SUBMITTED_TO_EMBASSY", "DECISION_ISSUED", "DELIVERED"]);
      expect(await h.prisma.auditLog.count({ where: { action: "order.status", entityId: order.id } })).toBeGreaterThanOrEqual(6);
    });

    it("assignment, internal notes and read-only roles", async () => {
      const order = await paidOrder(h, customer, "N1122334");
      const d = (await h.http.post(`/api/v1/admin/orders/${order.id}/assign`).set(as(manager)).send({ assigneeId: agent.userId }).expect(200)).body as AdminOrderDetail;
      expect(d.assignee?.id).toBe(agent.userId);
      await h.http.post(`/api/v1/admin/orders/${order.id}/assign`).set(as(manager)).send({ assigneeId: customer.userId }).expect(422);
      await h.http.post(`/api/v1/admin/orders/${order.id}/notes`).set(as(agent)).send({ body: "العميل يفضّل التواصل مساءً" }).expect(201);
      expect((await desk(accountant, order.id)).notes[0]?.body).toBe("العميل يفضّل التواصل مساءً");
      // Notes never reach the customer.
      expect(JSON.stringify((await h.http.get(`/api/v1/orders/${order.id}`).set(as(customer))).body)).not.toContain("مساءً");
      await h.http.post(`/api/v1/admin/orders/${order.id}/notes`).set(as(accountant)).send({ body: "x" }).expect(403);
      await move(accountant, order.id, { to: "DOCUMENTS_REVIEW" }).expect(403);
      const mine = (await h.http.get("/api/v1/admin/orders?view=mine").set(as(agent))).body as AdminOrderPage;
      expect(mine.items.some((r) => r.id === order.id)).toBe(true);
    });
  });

  describe("refunds and credit notes", () => {
    it("partial then full refund: gateway, ZATCA credit notes chained to the invoice, order closes", async () => {
      const order = await paidOrder(h, customer, "R5566778");
      const invoice = await waitFor(
        () => h.prisma.invoice.findFirst({ where: { orderId: order.id, type: "SIMPLIFIED" } }),
        (i) => Boolean(i),
      );
      const d0 = await desk(accountant, order.id);
      const payment = d0.payments[0]!;
      await h.http.post(`/api/v1/admin/orders/${order.id}/refunds`).set(as(agent)).send({ paymentId: payment.id, amountHalalas: 100, reason: "x" }).expect(403);
      expect((await h.http.post(`/api/v1/admin/orders/${order.id}/refunds`).set(as(accountant)).send({ paymentId: payment.id, amountHalalas: payment.amountHalalas + 1, reason: "too much" }).expect(422)).body.code).toBe("refund_exceeds");

      const half = Math.floor(payment.amountHalalas / 2);
      let d = (await h.http.post(`/api/v1/admin/orders/${order.id}/refunds`).set(as(accountant)).send({ paymentId: payment.id, amountHalalas: half, reason: "إلغاء أحد المسافرين" }).expect(201)).body as AdminOrderDetail;
      expect(d.payments[0]).toMatchObject({ status: "PARTIALLY_REFUNDED", refundedHalalas: half });
      expect(d.order.status).toBe("RECEIVED");
      const cn1 = await h.prisma.invoice.findUniqueOrThrow({ where: { refundId: d.payments[0]!.refunds[0]!.id }, include: { lines: true } });
      expect(cn1).toMatchObject({ type: "CREDIT_NOTE", totalHalalas: half });
      expect(cn1.number).toMatch(/^CN-\d{4}-\d{6}$/);
      expect(cn1.icv).toBeGreaterThan(invoice!.icv);
      expect(cn1.lines.reduce((s, l) => s + l.lineTotalHalalas, 0)).toBe(half);
      const xml = await (await h.app.get((await import("../src/infra/storage.service")).StorageService).stream(cn1.xmlStorageKey!)).toArray();
      expect(Buffer.concat(xml).toString()).toContain(`<cbc:ID>${invoice!.number}</cbc:ID>`);
      const view = (await h.http.get(`/api/v1/invoices/${cn1.id}`).set(as(customer)).expect(200)).body as InvoiceView;
      expect(view.type).toBe("CREDIT_NOTE");
      expect(decodeTlv(view.qrPayload).get(4)!.toString()).toBe((half / 100).toFixed(2));

      d = (await h.http.post(`/api/v1/admin/orders/${order.id}/refunds`).set(as(accountant)).send({ paymentId: payment.id, amountHalalas: payment.amountHalalas - half, reason: "استرداد كامل" }).expect(201)).body;
      expect(d.payments[0]!.status).toBe("REFUNDED");
      expect(d.order.status).toBe("REFUNDED");
      expect(await h.prisma.invoice.count({ where: { orderId: order.id, type: "CREDIT_NOTE" } })).toBe(2);
      await h.http.post(`/api/v1/admin/orders/${order.id}/refunds`).set(as(accountant)).send({ paymentId: payment.id, amountHalalas: 1, reason: "again" }).expect(409);
    });
  });

  describe("coupons", () => {
    it("managers create and edit coupons; they price real quotes", async () => {
      const body = { code: "winter25", kind: "PERCENT", value: 25, maxDiscountHalalas: 10_000, perUserLimit: 1, serviceSlugs: ["fr-tourism-schengen"] };
      await h.http.post("/api/v1/admin/coupons").set(as(agent)).send(body).expect(403);
      const coupon = (await h.http.post("/api/v1/admin/coupons").set(as(manager)).send(body).expect(201)).body as CouponView;
      expect(coupon).toMatchObject({ code: "WINTER25", serviceSlugs: ["fr-tourism-schengen"], redemptions: 0 });
      expect((await h.http.post("/api/v1/admin/coupons").set(as(manager)).send(body).expect(409)).body.code).toBe("coupon_exists");
      await h.http.post("/api/v1/admin/coupons").set(as(manager)).send({ ...body, code: "BAD", value: 120 }).expect(422);
      const quote = (await h.http.post("/api/v1/orders/quote").set(as(customer)).send({ serviceSlug: "fr-tourism-schengen", travelers: [{ applicantType: "SAUDI_CITIZEN", nationalityIso2: "SA" }], couponCode: "WINTER25" }).expect(200)).body;
      expect(quote.coupon.valid).toBe(true);
      expect(quote.breakdown.discount).toBeGreaterThan(0);
      await h.http.put(`/api/v1/admin/coupons/${coupon.id}`).set(as(manager)).send({ ...body, isActive: false }).expect(200);
      const off = (await h.http.post("/api/v1/orders/quote").set(as(customer)).send({ serviceSlug: "fr-tourism-schengen", travelers: [{ applicantType: "SAUDI_CITIZEN", nationalityIso2: "SA" }], couponCode: "WINTER25" })).body;
      expect(off.coupon.valid).toBe(false);
    });
  });

  it("customers: search and profile with orders, family and consents", async () => {
    const phone = (await h.prisma.user.findUniqueOrThrow({ where: { id: customer.userId } })).phone;
    const page = (await h.http.get(`/api/v1/admin/customers?q=${phone.slice(-6)}`).set(as(agent)).expect(200)).body as CustomerPage;
    expect(page.items[0]).toMatchObject({ id: customer.userId });
    expect(page.items[0]!.paidOrders).toBeGreaterThanOrEqual(4);
    const detail = (await h.http.get(`/api/v1/admin/customers/${customer.userId}`).set(as(agent)).expect(200)).body as CustomerDetail;
    expect(detail.travelers.length).toBeGreaterThanOrEqual(4);
    expect(detail.consents.some((c) => c.type === "TERMS")).toBe(true);
    expect(detail.recentOrders.length).toBe(detail.orders);
    await h.http.get(`/api/v1/admin/customers/${agent.userId}`).set(as(agent)).expect(404);
  });

  describe("staff and roles", () => {
    it("invite, change role, switch off (orders return to the queue), with a self-change guard", async () => {
      await h.http.get("/api/v1/admin/staff").set(as(manager)).expect(403);
      const phone = freshPhone();
      const invited = (await h.http.post("/api/v1/admin/staff").set(as(admin)).send({ phone: `0${phone.slice(4)}`, role: "AGENT", fullNameAr: "سلمان" }).expect(201)).body as StaffMember;
      expect(invited).toMatchObject({ phone, role: "AGENT", isActive: true });
      const order = await paidOrder(h, customer, "S9988771");
      await h.http.post(`/api/v1/admin/orders/${order.id}/assign`).set(as(admin)).send({ assigneeId: invited.id }).expect(200);
      await h.http.put(`/api/v1/admin/staff/${invited.id}`).set(as(admin)).send({ role: "AGENT", isActive: false }).expect(200);
      expect((await desk(admin, order.id)).assignee).toBeNull();

      expect((await h.http.put(`/api/v1/admin/staff/${admin.userId}`).set(as(admin)).send({ role: "MANAGER", isActive: true }).expect(409)).body.code).toBe("self_change");
      expect((await h.http.put(`/api/v1/admin/staff/${admin.userId}`).set(as(admin)).send({ role: "SUPER_ADMIN", isActive: false }).expect(409)).body.code).toBe("self_change");
      // Demoted to customer: off the staff list, sessions ended.
      await h.http.put(`/api/v1/admin/staff/${invited.id}`).set(as(admin)).send({ role: "CUSTOMER", isActive: true }).expect(200);
      const list = (await h.http.get("/api/v1/admin/staff").set(as(admin))).body as StaffMember[];
      expect(list.some((m) => m.id === invited.id)).toBe(false);
    });
  });

  describe("reports", () => {
    it("overview counts captured money in Riyadh days and compares with the previous period", async () => {
      await h.http.get(`/api/v1/admin/reports/overview?from=${today()}&to=${today()}`).set(as(agent)).expect(403);
      const r = (await h.http.get(`/api/v1/admin/reports/overview?from=${today()}&to=${today()}`).set(as(accountant)).expect(200)).body as ReportOverview;
      const paid = await h.prisma.payment.findMany({ where: { status: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] } }, include: { order: { select: { totalHalalas: true } } } });
      expect(r.kpis.paidOrders.value).toBe(paid.length);
      expect(r.kpis.revenueHalalas.value).toBe(paid.reduce((s, p) => s + p.order.totalHalalas, 0));
      expect(r.kpis.paidOrders.previous).toBe(0);
      expect(r.kpis.refundsHalalas.value).toBeGreaterThan(0);
      expect(r.daily).toHaveLength(1);
      expect(r.daily[0]!.orders).toBe(paid.length);
      expect(r.funnel.started).toBeGreaterThanOrEqual(r.funnel.paid);
      expect(r.kpis.medianFirstResponseHours.value).not.toBeNull();
      expect(r.agents.find((a) => a.id === agent.userId)?.handled).toBeGreaterThan(0);
      await h.http.get(`/api/v1/admin/reports/overview?from=${today()}&to=2020-01-01`).set(as(accountant)).expect(422);
    });

    it("live counters for agents and a CSV export for accounting", async () => {
      const live = (await h.http.get("/api/v1/admin/reports/live").set(as(agent)).expect(200)).body;
      expect(live.open).toBeGreaterThan(0);
      const csv = await h.http.get(`/api/v1/admin/reports/orders.csv?from=${today()}&to=${today()}`).set(as(accountant)).expect(200);
      expect(csv.headers["content-type"]).toContain("text/csv");
      expect(csv.headers["content-disposition"]).toContain(".csv");
      expect(csv.text.charCodeAt(0)).toBe(0xfeff);
      expect(csv.text.split("\r\n")[0]).toContain("order,paid_at_riyadh");
      expect(csv.text).toMatch(/INV-\d{4}-\d{6}/);
    });
  });
});
