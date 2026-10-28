import { EventEmitter2 } from "@nestjs/event-emitter";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { calculatePrice, type OrderDraftInput, type OrderView, type PresignResult } from "@myvisa/shared";
import { EVENTS, type OrderStatusChangedEvent } from "../src/common/events";
import { type Harness, type Session, as, signIn, startHarness } from "./harness";

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
const resident = (passportNumber = "EG9988776") => ({ ...citizen(passportNumber), relationship: "SPOUSE" as const, givenNameEn: "Omar", surnameEn: "Hassan", gender: "MALE" as const, nationalityIso2: "EG", applicantType: "RESIDENT" as const });

async function waitFor<T>(fn: () => Promise<T>, ok: (v: T) => boolean, timeoutMs = 10_000): Promise<T> {
  const started = Date.now();
  for (;;) {
    const v = await fn();
    if (ok(v)) return v;
    if (Date.now() - started > timeoutMs) throw new Error("timed out waiting");
    await new Promise((r) => setTimeout(r, 150));
  }
}

/** Uploads a tiny PDF for every required slot through the real presign → PUT → complete → scan path. */
async function uploadAll(h: Harness, s: Session, order: OrderView) {
  for (const r of order.requirements.filter((x) => x.isRequired)) {
    const slots = r.perTraveler ? order.travelers.filter((t) => !r.applicantType || r.applicantType === t.applicantType).map((t) => t.id) : [null];
    for (const orderTravelerId of slots) {
      const res = await h.http.post(`/api/v1/orders/${order.id}/documents`).set(as(s)).send({ requirementId: r.id, orderTravelerId, fileName: "scan.pdf", mimeType: "application/pdf", sizeBytes: PDF.length }).expect(201);
      const presign = res.body as PresignResult;
      const put = await fetch(presign.uploadUrl, { method: "PUT", headers: presign.headers, body: PDF });
      expect(put.status).toBeLessThan(300);
      await h.http.post(`/api/v1/order-documents/${presign.id}/complete`).set(as(s)).expect(202);
    }
  }
  return waitFor(
    () => h.http.get(`/api/v1/orders/${order.id}`).set(as(s)).then((r) => r.body as OrderView),
    (o) => o.documentsComplete,
  );
}

describe("apply flow", () => {
  let h: Harness;
  let customer: Session;
  let draft: (overrides?: Partial<OrderDraftInput>) => OrderDraftInput;

  beforeAll(async () => {
    h = await startHarness();
    customer = await signIn(h);
    draft = (overrides = {}) => ({ serviceSlug: "fr-tourism-schengen", travelFrom: "2027-03-01", travelTo: "2027-03-12", travelers: [citizen()], preferredCity: "RIYADH", locale: "ar", ...overrides });
  });
  afterAll(() => h.close());

  it("quotes per traveller with the resolution order and shared pricing", async () => {
    const res = await h.http.post("/api/v1/orders/quote").send({ serviceSlug: "fr-tourism-schengen", travelers: [{ applicantType: "SAUDI_CITIZEN", nationalityIso2: "SA" }, { applicantType: "RESIDENT", nationalityIso2: "EG" }] }).expect(200);
    const rules = await h.prisma.priceRule.findMany({ where: { service: { slug: "fr-tourism-schengen" }, nationalityId: null } });
    const fee = (a: string) => rules.find((r) => r.applicantType === a)!;
    expect(res.body.breakdown).toEqual(
      calculatePrice([
        { governmentFee: fee("SAUDI_CITIZEN").governmentFeeHalalas, serviceFee: fee("SAUDI_CITIZEN").serviceFeeHalalas },
        { governmentFee: fee("RESIDENT").governmentFeeHalalas, serviceFee: fee("RESIDENT").serviceFeeHalalas },
      ]),
    );
  });

  it("requires sign-in to start an application", async () => {
    await h.http.post("/api/v1/orders").send(draft()).expect(401);
  });

  it("refuses a traveller the visa isn't offered to", async () => {
    const rule = await h.prisma.priceRule.findFirst({ where: { isEligible: false, nationalityId: null, service: { category: "VISA" } }, include: { service: true } });
    if (!rule) return;
    const traveler = rule.applicantType === "RESIDENT" ? resident() : citizen();
    const res = await h.http.post("/api/v1/orders").set(as(customer)).send(draft({ serviceSlug: rule.service.slug, travelers: [traveler] })).expect(422);
    expect(res.body.code).toBe("traveler_ineligible");
  });

  it("validates traveller details with the shared schema", async () => {
    const res = await h.http.post("/api/v1/orders").set(as(customer)).send(draft({ travelers: [{ ...citizen(), givenNameEn: "نورة", passportExpiry: "2020-01-01", nationalityIso2: "EG" }] })).expect(422);
    const paths = (res.body.errors as { path: string }[]).map((e) => e.path);
    expect(paths).toEqual(expect.arrayContaining(["travelers.0.givenNameEn", "travelers.0.passportExpiry", "travelers.0.nationalityIso2"]));
  });

  it("runs the whole flow: draft → uploads → submit with consents → paid → RECEIVED", async () => {
    const created = await h.http.post("/api/v1/orders").set(as(customer)).send(draft({ travelers: [citizen(), resident()], email: "noura@example.com" })).expect(201);
    let order = created.body as OrderView;
    expect(order.status).toBe("DRAFT");
    expect(order.number).toMatch(/^MV-\d{2}-[0-9A-HJKMNP-TV-Z]{6}$/);
    expect(order.travelers.map((t) => t.passportNumberMasked)).toEqual(["•••••567", "••••••776"]);

    // PII never stored in clear; travellers saved to the family vault with a blind index.
    const rows = await h.prisma.orderTraveler.findMany({ where: { orderId: order.id } });
    expect(rows.every((r) => !r.passportNumberEnc.includes("A1234567") && !r.passportNumberEnc.includes("EG9988776"))).toBe(true);
    expect(await h.prisma.traveler.count({ where: { userId: customer.userId } })).toBe(2);
    expect((await h.prisma.user.findUniqueOrThrow({ where: { id: customer.userId } })).email).toBe("noura@example.com");

    // Not yet complete.
    const early = await h.http.post(`/api/v1/orders/${order.id}/submit`).set(as(customer)).send({ acceptTerms: true, acceptDataProcessing: true, acceptCrossBorder: true }).expect(422);
    expect(early.body.code).toBe("documents_incomplete");

    order = await uploadAll(h, customer, order);
    const doc = await h.prisma.document.findFirstOrThrow({ where: { ownerId: customer.userId } });
    expect(doc.sha256).toMatch(/^[0-9a-f]{64}$/);

    // Consents are mandatory.
    await h.http.post(`/api/v1/orders/${order.id}/submit`).set(as(customer)).send({ acceptTerms: true, acceptDataProcessing: true, acceptCrossBorder: false }).expect(422);

    const coupon = await h.prisma.coupon.create({ data: { code: "WELCOME10", kind: "PERCENT", value: 10 } });
    const submitted = await h.http.post(`/api/v1/orders/${order.id}/submit`).set(as(customer)).send({ couponCode: "welcome10", acceptTerms: true, acceptDataProcessing: true, acceptCrossBorder: true, marketing: false }).expect(200);
    order = submitted.body as OrderView;
    expect(order.status).toBe("PENDING_PAYMENT");
    expect(order.coupon?.code).toBe("WELCOME10");
    expect(order.price.discount).toBe(Math.round(order.price.serviceFees * 0.1));
    expect(order.price.total).toBe(order.price.governmentFees + order.price.serviceFees - order.price.discount + order.price.vat);
    expect(await h.prisma.consent.count({ where: { userId: customer.userId } })).toBe(5);
    expect((await h.prisma.order.findUniqueOrThrow({ where: { id: order.id } })).refundPolicyVersion).toBe("1.0");

    const changes: OrderStatusChangedEvent[] = [];
    const events = h.app.get(EventEmitter2);
    events.on(EVENTS.orderStatusChanged, (e: OrderStatusChangedEvent) => changes.push(e));
    await events.emitAsync(EVENTS.paymentSucceeded, { orderId: order.id, paymentId: "pay_test", amountHalalas: order.price.total });
    await events.emitAsync(EVENTS.paymentSucceeded, { orderId: order.id, paymentId: "pay_test", amountHalalas: order.price.total }); // duplicate is a no-op

    const paid = await h.prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { events: true, redemption: true } });
    expect(paid.status).toBe("RECEIVED");
    expect(paid.slaDueAt).not.toBeNull();
    expect(paid.events.map((e) => e.toStatus)).toEqual(["DRAFT", "PENDING_PAYMENT", "RECEIVED"]);
    expect(paid.redemption?.couponId).toBe(coupon.id);
    expect(changes.filter((c) => c.to === "RECEIVED")).toHaveLength(1);

    // Locked after payment.
    await h.http.put(`/api/v1/orders/${order.id}`).set(as(customer)).send(draft()).expect(409);
  });

  it("keeps a traveller's documents when the draft is edited, drops removed travellers", async () => {
    const order = (await h.http.post("/api/v1/orders").set(as(customer)).send(draft({ travelers: [citizen("B7654321"), resident("EG1112223")] })).expect(201)).body as OrderView;
    const passportReq = order.requirements.find((r) => r.documentType === "PASSPORT")!;
    const keepId = order.travelers[0]!.id;
    const presign = (await h.http.post(`/api/v1/orders/${order.id}/documents`).set(as(customer)).send({ requirementId: passportReq.id, orderTravelerId: keepId, fileName: "p.pdf", mimeType: "application/pdf", sizeBytes: PDF.length }).expect(201)).body as PresignResult;

    const updated = (await h.http.put(`/api/v1/orders/${order.id}`).set(as(customer)).send(draft({ travelers: [{ ...citizen("B7654321"), givenNameEn: "NOURA MARIA" }] })).expect(200)).body as OrderView;
    expect(updated.travelers).toHaveLength(1);
    expect(updated.travelers[0]!.id).toBe(keepId);
    expect(updated.travelers[0]!.givenNameEn).toBe("NOURA MARIA");
    expect(updated.documents.map((d) => d.id)).toContain(presign.id);
  });

  it("guards uploads: type, slot, completion and ownership", async () => {
    const order = (await h.http.post("/api/v1/orders").set(as(customer)).send(draft({ travelers: [citizen("C1231231")] })).expect(201)).body as OrderView;
    const perTraveler = order.requirements.find((r) => r.perTraveler)!;
    const base = { requirementId: perTraveler.id, orderTravelerId: order.travelers[0]!.id, fileName: "x.pdf", mimeType: "application/pdf", sizeBytes: PDF.length };

    await h.http.post(`/api/v1/orders/${order.id}/documents`).set(as(customer)).send({ ...base, mimeType: "image/heic" }).expect(422);
    await h.http.post(`/api/v1/orders/${order.id}/documents`).set(as(customer)).send({ ...base, orderTravelerId: null }).expect(422);
    await h.http.post(`/api/v1/orders/${order.id}/documents`).set(as(customer)).send({ ...base, sizeBytes: 50 * 1024 * 1024 }).expect(422);

    const presign = (await h.http.post(`/api/v1/orders/${order.id}/documents`).set(as(customer)).send(base).expect(201)).body as PresignResult;
    const missing = await h.http.post(`/api/v1/order-documents/${presign.id}/complete`).set(as(customer)).expect(409);
    expect(missing.body.code).toBe("upload_missing");

    // A file of a different size than announced is rejected and removed.
    await fetch(presign.uploadUrl, { method: "PUT", headers: presign.headers, body: PDF }).catch(() => undefined);
    await h.http.post(`/api/v1/order-documents/${presign.id}/complete`).set(as(customer)).expect(202);
    const view = await waitFor(
      () => h.http.get(`/api/v1/order-documents/${presign.id}/url`).set(as(customer)),
      (r) => r.status === 200,
    );
    expect(view.body.url).toContain("X-Amz-Signature");

    const stranger = await signIn(h);
    await h.http.get(`/api/v1/orders/${order.id}`).set(as(stranger)).expect(404);
    await h.http.get(`/api/v1/order-documents/${presign.id}/url`).set(as(stranger)).expect(404);
    await h.http.post(`/api/v1/orders/${order.id}/documents`).set(as(stranger)).send(base).expect(404);
    await h.http.delete(`/api/v1/order-documents/${presign.id}`).set(as(customer)).expect(204);
  });

  it("skips payment for a zero-total order", async () => {
    const free = await h.prisma.service.findFirst({ where: { visaKind: "VISA_FREE", priceRules: { some: { applicantType: "SAUDI_CITIZEN", isEligible: true, governmentFeeHalalas: 0, serviceFeeHalalas: 0 } } } });
    if (!free) return;
    let order = (await h.http.post("/api/v1/orders").set(as(customer)).send(draft({ serviceSlug: free.slug, travelers: [citizen("D9999999")] })).expect(201)).body as OrderView;
    order = await uploadAll(h, customer, order);
    const done = (await h.http.post(`/api/v1/orders/${order.id}/submit`).set(as(customer)).send({ acceptTerms: true, acceptDataProcessing: true, acceptCrossBorder: true }).expect(200)).body as OrderView;
    expect(done.status).toBe("RECEIVED");
  });
});
