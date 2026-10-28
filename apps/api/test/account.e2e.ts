import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AccountSummary, InvoiceView, MessageView, NotificationPage, OrderTimelineView, OrderView, PresignResult, SavedTravelerView, TrackSession, VaultDocumentView, VaultPresignResult } from "@myvisa/shared";
import { INITIAL_PIH, decodeTlv } from "../src/modules/invoices/zatca";
import { type Harness, type Session, as, freshPhone, signIn, startHarness } from "./harness";

const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

const citizen = (passportNumber = "A1234567") => ({
  relationship: "SELF" as const,
  givenNameEn: "Noura",
  surnameEn: "Alotaibi",
  fullNameAr: "نورة العتيبي",
  gender: "FEMALE" as const,
  dateOfBirth: "1992-04-11",
  nationalityIso2: "SA",
  applicantType: "SAUDI_CITIZEN" as const,
  passportNumber,
  passportExpiry: "2031-01-01",
});

async function waitFor<T>(fn: () => Promise<T>, ok: (v: T) => boolean, timeoutMs = 10_000): Promise<T> {
  const started = Date.now();
  for (;;) {
    const v = await fn();
    if (ok(v)) return v;
    if (Date.now() - started > timeoutMs) throw new Error("timed out waiting");
    await new Promise((r) => setTimeout(r, 150));
  }
}

async function put(url: string, headers: Record<string, string>) {
  const res = await fetch(url, { method: "PUT", headers, body: PDF });
  expect(res.status).toBeLessThan(300);
}

async function uploadSlot(h: Harness, s: Session, orderId: string, requirementId: string, orderTravelerId: string | null) {
  const res = await h.http.post(`/api/v1/orders/${orderId}/documents`).set(as(s)).send({ requirementId, orderTravelerId, fileName: "scan.pdf", mimeType: "application/pdf", sizeBytes: PDF.length }).expect(201);
  const presign = res.body as PresignResult;
  await put(presign.uploadUrl, presign.headers);
  await h.http.post(`/api/v1/order-documents/${presign.id}/complete`).set(as(s)).expect(202);
  return presign.id;
}

const getOrder = (h: Harness, s: Session, id: string) => h.http.get(`/api/v1/orders/${id}`).set(as(s)).then((r) => r.body as OrderView);

async function draftWithDocuments(h: Harness, s: Session, passportNumber = "A1234567") {
  const created = await h.http.post("/api/v1/orders").set(as(s)).send({ serviceSlug: "fr-tourism-schengen", travelFrom: "2027-03-01", travelTo: "2027-03-12", travelers: [citizen(passportNumber)], preferredCity: "RIYADH", locale: "ar" }).expect(201);
  const order = created.body as OrderView;
  for (const r of order.requirements.filter((x) => x.isRequired)) {
    const slots = r.perTraveler ? order.travelers.filter((t) => !r.applicantType || r.applicantType === t.applicantType).map((t) => t.id) : [null];
    for (const tid of slots) await uploadSlot(h, s, order.id, r.id, tid);
  }
  return waitFor(() => getOrder(h, s, order.id), (o) => o.documentsComplete);
}

async function paidOrder(h: Harness, s: Session, passportNumber?: string) {
  const order = await draftWithDocuments(h, s, passportNumber);
  await h.http.post(`/api/v1/orders/${order.id}/submit`).set(as(s)).send({ acceptTerms: true, acceptDataProcessing: true, acceptCrossBorder: true, marketing: false }).expect(200);
  const start = await h.http.post(`/api/v1/orders/${order.id}/payments`).set(as(s)).set("Idempotency-Key", randomUUID()).expect(201);
  await h.http.post(`/api/v1/payments/mock/${start.body.paymentId}/complete`).set(as(s)).send({ outcome: "paid" }).expect(200);
  return waitFor(() => getOrder(h, s, order.id), (o) => o.status === "RECEIVED");
}

describe("customer account", () => {
  let h: Harness;
  let customer: Session;
  let stranger: Session;
  let agent: Session;
  let accountant: Session;
  let paid: OrderView;

  beforeAll(async () => {
    h = await startHarness();
    customer = await signIn(h);
    stranger = await signIn(h);
    agent = await signIn(h, "AGENT");
    accountant = await signIn(h, "ACCOUNTANT");
    paid = await paidOrder(h, customer);
  }, 60_000);
  afterAll(() => h.close());

  describe("invoices (ZATCA)", () => {
    it("issues one simplified invoice on payment, with the price split and a full QR", async () => {
      const list = await waitFor(
        () => h.http.get("/api/v1/me/invoices").set(as(customer)).then((r) => r.body as { id: string; number: string; orderId: string }[]),
        (l) => l.length === 1,
      );
      expect(list[0]!.orderId).toBe(paid.id);
      const invoice = (await h.http.get(`/api/v1/invoices/${list[0]!.id}`).set(as(customer)).expect(200)).body as InvoiceView;
      expect(invoice.number).toMatch(/^INV-\d{4}-\d{6}$/);
      expect(invoice.totalHalalas).toBe(paid.price.total);
      expect(invoice.vatHalalas).toBe(paid.price.vat);
      expect(invoice.subtotalHalalas + invoice.vatHalalas).toBe(invoice.totalHalalas);
      expect(invoice.lines.map((l) => l.vatCategory).sort()).toEqual(["O", "S"]);
      expect(invoice.lines.find((l) => l.vatCategory === "O")!.lineTotalHalalas).toBe(paid.price.governmentFees);

      const tags = decodeTlv(invoice.qrPayload);
      expect(tags.get(4)!.toString()).toBe((paid.price.total / 100).toFixed(2));
      expect(tags.get(6)!.toString()).toBe(invoice.invoiceHash);
      expect(tags.has(7) && tags.has(8)).toBe(true);

      const stored = await h.prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
      expect(stored.previousInvoiceHash).toBe(INITIAL_PIH);
      expect(stored.icv).toBe(1);
      const xml = (await h.http.get(`/api/v1/invoices/${invoice.id}/xml`).set(as(customer)).expect(200)).body as { url: string };
      const body = await (await fetch(xml.url)).text();
      expect(body).toContain(`<cbc:ID>${invoice.number}</cbc:ID>`);
    });

    it("chains the next invoice to the previous hash and never issues twice", async () => {
      const second = await paidOrder(h, customer, "B7654321");
      const rows = await waitFor(
        () => h.prisma.invoice.findMany({ orderBy: { icv: "asc" } }),
        (r) => r.length === 2,
      );
      expect(rows[1]!.orderId).toBe(second.id);
      expect(rows[1]!.icv).toBe(2);
      expect(rows[1]!.previousInvoiceHash).toBe(rows[0]!.invoiceHash);
      const { InvoicesService } = await import("../src/modules/invoices/invoices.service");
      expect(await h.app.get(InvoicesService).issueForOrder(second.id)).toBe(rows[1]!.id);
      expect(await h.prisma.invoice.count()).toBe(2);
    });

    it("is private to the customer; accountants can read it, agents can't", async () => {
      const [invoice] = (await h.http.get("/api/v1/me/invoices").set(as(customer))).body as { id: string }[];
      await h.http.get(`/api/v1/invoices/${invoice!.id}`).set(as(stranger)).expect(404);
      await h.http.get(`/api/v1/invoices/${invoice!.id}`).set(as(agent)).expect(404);
      await h.http.get(`/api/v1/invoices/${invoice!.id}`).set(as(accountant)).expect(200);
    });
  });

  it("timeline lists the status history and the invoice", async () => {
    const t = (await h.http.get(`/api/v1/orders/${paid.id}/timeline`).set(as(customer)).expect(200)).body as OrderTimelineView;
    expect(t.events.map((e) => e.status)).toEqual(["DRAFT", "PENDING_PAYMENT", "RECEIVED"]);
    expect(t.invoices).toHaveLength(1);
    await h.http.get(`/api/v1/orders/${paid.id}/timeline`).set(as(stranger)).expect(404);
  });

  it("in-app notifications: list, render in the asked language, mark read", async () => {
    const page = await waitFor(
      () => h.http.get("/api/v1/me/notifications?locale=en").set(as(customer)).then((r) => r.body as NotificationPage),
      (p) => p.items.some((i) => i.template === "order.received" && i.orderNumber === paid.number),
    );
    const received = page.items.find((i) => i.template === "order.received" && i.orderNumber === paid.number)!;
    expect(received.title).toContain(paid.number);
    expect(received.title).toMatch(/^We received/);
    expect(received.href).toBe(`/track?order=${paid.number}`);
    expect(page.unread).toBeGreaterThan(0);
    await h.http.post(`/api/v1/me/notifications/${received.id}/read`).set(as(stranger)).expect(404);
    await h.http.post("/api/v1/me/notifications/read-all").set(as(customer)).expect(200);
    const after = (await h.http.get("/api/v1/me/notifications").set(as(customer))).body as NotificationPage;
    expect(after.unread).toBe(0);
    expect(after.items.every((i) => i.readAt)).toBe(true);
  });

  describe("messages", () => {
    it("customer and agent talk on the order; staff replies notify the customer", async () => {
      await h.http.post(`/api/v1/orders/${paid.id}/messages`).set(as(customer)).send({ body: "متى موعد البصمة؟" }).expect(201);
      await h.prisma.user.update({ where: { id: agent.userId }, data: { fullNameAr: "ريم القحطاني", fullNameEn: "Reem Alqahtani" } });
      const reply = (await h.http.post(`/api/v1/orders/${paid.id}/messages?locale=ar`).set(as(agent)).send({ body: "نحجزه هذا الأسبوع إن شاء الله" }).expect(201)).body as MessageView;
      expect(reply.sender).toBe("STAFF");
      expect(reply.senderName).toBe("ريم");

      const before = (await h.http.get("/api/v1/me/summary").set(as(customer))).body as AccountSummary;
      expect(before.unreadMessages).toBe(1);
      const thread = (await h.http.get(`/api/v1/orders/${paid.id}/messages`).set(as(customer)).expect(200)).body as MessageView[];
      expect(thread.map((m) => m.sender)).toEqual(["CUSTOMER", "STAFF"]);
      const after = (await h.http.get("/api/v1/me/summary").set(as(customer))).body as AccountSummary;
      expect(after.unreadMessages).toBe(0);

      const notes = await waitFor(
        () => h.prisma.notification.findMany({ where: { userId: customer.userId, template: "message.received" } }),
        (n) => n.length === 2,
      );
      expect(notes.map((n) => n.channel).sort()).toEqual(["IN_APP", "WHATSAPP"]);
    });

    it("strangers and read-only staff can't post", async () => {
      await h.http.post(`/api/v1/orders/${paid.id}/messages`).set(as(stranger)).send({ body: "hi" }).expect(404);
      await h.http.post(`/api/v1/orders/${paid.id}/messages`).set(as(accountant)).send({ body: "hi" }).expect(404);
      await h.http.get(`/api/v1/orders/${paid.id}/messages`).set(as(accountant)).expect(200);
      await h.http.post(`/api/v1/orders/${paid.id}/messages`).set(as(customer)).send({ body: "   " }).expect(422);
    });
  });

  describe("public tracking", () => {
    const phoneOf = async (s: Session) => (await h.prisma.user.findUniqueOrThrow({ where: { id: s.userId } })).phone;

    it("never reveals whether an order exists, and sends no code on a mismatch", async () => {
      const wrongPhone = freshPhone();
      const a = await h.http.post("/api/v1/track/request").send({ orderNumber: paid.number, phone: wrongPhone }).expect(202);
      expect(a.body).toEqual({ expiresIn: expect.any(Number), resendIn: expect.any(Number) });
      expect(await h.prisma.otpChallenge.count({ where: { phone: wrongPhone } })).toBe(0);
      const v = await h.http.post("/api/v1/track/verify").send({ orderNumber: paid.number, phone: wrongPhone, code: "000000" }).expect(400);
      expect(v.body.code).toBe("otp_expired");
      await h.http.post("/api/v1/track/request").send({ orderNumber: "nonsense", phone: wrongPhone }).expect(422);
    });

    it("order number + code → a read-only view without personal data, refreshable with the token", async () => {
      const phone = await phoneOf(customer);
      await h.http.post("/api/v1/track/request").send({ orderNumber: paid.number.toLowerCase(), phone }).expect(202);
      const session = (await h.http.post("/api/v1/track/verify").send({ orderNumber: paid.number, phone, code: "000000" }).expect(200)).body as TrackSession;
      expect(session.view.number).toBe(paid.number);
      expect(session.view.status).toBe("RECEIVED");
      expect(session.view.events.map((e) => e.status)).toEqual(["RECEIVED"]);
      expect(JSON.stringify(session.view)).not.toMatch(/Noura|A1234567|passport/i);

      const again = await h.http.get("/api/v1/track").set("x-track-token", session.token).expect(200);
      expect(again.body.number).toBe(paid.number);
      await h.http.get("/api/v1/track").set("x-track-token", "nope").expect(401);
      // A tracking token is not a session.
      await h.http.get("/api/v1/auth/me").set("Authorization", `Bearer ${session.token}`).expect(401);
    });
  });

  describe("saved travellers", () => {
    it("create, mask, read in full, update, refuse duplicates, delete", async () => {
      const s = await signIn(h);
      const created = (await h.http.post("/api/v1/me/travelers").set(as(s)).send({ ...citizen("P1122334"), relationship: "CHILD", givenNameEn: "Sara", dateOfBirth: "2015-06-01" }).expect(201)).body as SavedTravelerView;
      expect(created.passportNumberMasked).toBe("•••••334");
      expect(created.givenNameEn).toBe("SARA");
      await h.http.post("/api/v1/me/travelers").set(as(s)).send({ ...citizen("p1122334") }).expect(409);
      const full = await h.http.get(`/api/v1/me/travelers/${created.id}`).set(as(s)).expect(200);
      expect(full.body.passportNumber).toBe("P1122334");
      await h.http.get(`/api/v1/me/travelers/${created.id}`).set(as(stranger)).expect(404);
      const updated = await h.http.put(`/api/v1/me/travelers/${created.id}`).set(as(s)).send({ ...citizen("P1122334"), passportExpiry: "2027-01-01" }).expect(200);
      expect(updated.body.passportExpiry).toBe("2027-01-01");
      const summary = (await h.http.get("/api/v1/me/summary").set(as(s))).body as AccountSummary;
      expect(summary.travelers).toBe(1);
      expect(summary.expiringSoon).toBe(1);
      await h.http.delete(`/api/v1/me/travelers/${created.id}`).set(as(s)).expect(204);
      expect((await h.http.get("/api/v1/me/travelers").set(as(s))).body).toEqual([]);
    });

    it("the apply flow saves travellers to the family", async () => {
      const list = (await h.http.get("/api/v1/me/travelers").set(as(customer))).body as SavedTravelerView[];
      expect(list.map((t) => t.passportNumberMasked).sort()).toEqual(["•••••321", "•••••567"]);
      expect(list.every((t) => t.orders === 1)).toBe(true);
    });
  });

  it("profile: update details and record marketing consent changes only", async () => {
    const s = await signIn(h);
    const res = await h.http.put("/api/v1/me/profile").set(as(s)).send({ fullNameAr: "نورة", fullNameEn: "Noura", email: "noura@example.com", locale: "en", marketing: true }).expect(200);
    expect(res.body).toMatchObject({ fullNameEn: "Noura", email: "noura@example.com", locale: "en", marketing: true });
    await h.http.put("/api/v1/me/profile").set(as(s)).send({ fullNameAr: "نورة", fullNameEn: "Noura", email: "noura@example.com", locale: "en", marketing: true }).expect(200);
    expect(await h.prisma.consent.count({ where: { userId: s.userId, type: "MARKETING" } })).toBe(1);
    const other = await signIn(h);
    const clash = await h.http.put("/api/v1/me/profile").set(as(other)).send({ fullNameAr: null, fullNameEn: null, email: "noura@example.com", locale: "ar", marketing: false }).expect(409);
    expect(clash.body.code).toBe("email_taken");
  });

  describe("document vault", () => {
    it("upload to the vault, reuse it in an order, and removing from the vault keeps the order's copy", async () => {
      const s = await signIn(h);
      const presign = (await h.http.post("/api/v1/me/documents").set(as(s)).send({ type: "PASSPORT", fileName: "passport.pdf", mimeType: "application/pdf", sizeBytes: PDF.length, expiresOn: "2031-01-01" }).expect(201)).body as VaultPresignResult;
      await put(presign.uploadUrl, presign.headers);
      await h.http.post(`/api/v1/me/documents/${presign.documentId}/complete`).set(as(s)).expect(202);
      const stored = await waitFor(
        () => h.http.get("/api/v1/me/documents").set(as(s)).then((r) => r.body as VaultDocumentView[]),
        (l) => l[0]?.scanStatus === "CLEAN",
      );
      expect(stored[0]).toMatchObject({ type: "PASSPORT", inVault: true, expiresOn: "2031-01-01", orders: [] });
      await h.http.get(`/api/v1/me/documents/${presign.documentId}/url`).set(as(stranger)).expect(404);

      const order = (await h.http.post("/api/v1/orders").set(as(s)).send({ serviceSlug: "fr-tourism-schengen", travelers: [citizen("Z9988776")], locale: "ar" }).expect(201)).body as OrderView;
      const passport = order.requirements.find((r) => r.documentType === "PASSPORT")!;
      await h.http.post(`/api/v1/orders/${order.id}/documents/attach`).set(as(s)).send({ documentId: presign.documentId, requirementId: passport.id, orderTravelerId: order.travelers[0]!.id }).expect(201);
      await h.http.post(`/api/v1/orders/${order.id}/documents/attach`).set(as(s)).send({ documentId: presign.documentId, requirementId: passport.id, orderTravelerId: order.travelers[0]!.id }).expect(409);
      await h.http.post(`/api/v1/orders/${order.id}/documents/attach`).set(as(stranger)).send({ documentId: presign.documentId, requirementId: passport.id, orderTravelerId: order.travelers[0]!.id }).expect(404);

      await h.http.delete(`/api/v1/me/documents/${presign.documentId}`).set(as(s)).expect(204);
      const after = (await h.http.get("/api/v1/me/documents").set(as(s))).body as VaultDocumentView[];
      expect(after[0]).toMatchObject({ id: presign.documentId, inVault: false, orders: [{ id: order.id, number: order.number }] });
      const view = await getOrder(h, s, order.id);
      expect(view.documents.some((d) => d.document.id === presign.documentId)).toBe(true);
    });
  });

  it("ACTION_REQUIRED: replace the rejected file, then resubmit for review (no self-notification)", async () => {
    const s = await signIn(h);
    const order = await paidOrder(h, s, "C5544332");
    const target = order.documents[0]!;
    await h.prisma.$transaction([
      h.prisma.orderDocument.update({ where: { id: target.id }, data: { reviewStatus: "REJECTED", rejectionReason: "الصورة غير واضحة" } }),
      h.prisma.order.update({ where: { id: order.id }, data: { status: "ACTION_REQUIRED" } }),
      h.prisma.orderStatusEvent.create({ data: { orderId: order.id, fromStatus: "RECEIVED", toStatus: "ACTION_REQUIRED", customerNote: "نحتاج صورة أوضح للجواز" } }),
    ]);
    const waiting = await getOrder(h, s, order.id);
    expect(waiting.documentsComplete).toBe(false);
    expect(waiting.statusNote).toBe("نحتاج صورة أوضح للجواز");
    const refused = await h.http.post(`/api/v1/orders/${order.id}/resubmit`).set(as(s)).expect(422);
    expect(refused.body.code).toBe("documents_incomplete");

    await uploadSlot(h, s, order.id, target.requirementId!, target.orderTravelerId);
    await waitFor(() => getOrder(h, s, order.id), (o) => o.documentsComplete);
    const done = await h.http.post(`/api/v1/orders/${order.id}/resubmit`).set(as(s)).expect(200);
    expect(done.body.status).toBe("DOCUMENTS_REVIEW");
    await h.http.post(`/api/v1/orders/${order.id}/resubmit`).set(as(s)).expect(409);
    await new Promise((r) => setTimeout(r, 300));
    expect(await h.prisma.notification.count({ where: { userId: s.userId, template: "order.update" } })).toBe(0);
  });
});
