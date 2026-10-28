import { randomUUID } from "node:crypto";
import { expect } from "vitest";
import type { OrderView, PresignResult } from "@myvisa/shared";
import { type Harness, type Session, as } from "./harness";

/** Shared e2e flows: a real draft → uploads → submit → mock payment, through the HTTP API. */
export const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

export const citizen = (passportNumber = "A1234567") => ({
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

export async function waitFor<T>(fn: () => Promise<T>, ok: (v: T) => boolean, timeoutMs = 10_000): Promise<T> {
  const started = Date.now();
  for (;;) {
    const v = await fn();
    if (ok(v)) return v;
    if (Date.now() - started > timeoutMs) throw new Error("timed out waiting");
    await new Promise((r) => setTimeout(r, 150));
  }
}

export async function put(url: string, headers: Record<string, string>) {
  const res = await fetch(url, { method: "PUT", headers, body: PDF });
  expect(res.status).toBeLessThan(300);
}

export async function uploadSlot(h: Harness, s: Session, orderId: string, requirementId: string, orderTravelerId: string | null) {
  const res = await h.http.post(`/api/v1/orders/${orderId}/documents`).set(as(s)).send({ requirementId, orderTravelerId, fileName: "scan.pdf", mimeType: "application/pdf", sizeBytes: PDF.length }).expect(201);
  const presign = res.body as PresignResult;
  await put(presign.uploadUrl, presign.headers);
  await h.http.post(`/api/v1/order-documents/${presign.id}/complete`).set(as(s)).expect(202);
  return presign.id;
}

export const getOrder = (h: Harness, s: Session, id: string) => h.http.get(`/api/v1/orders/${id}`).set(as(s)).then((r) => r.body as OrderView);

export async function draftWithDocuments(h: Harness, s: Session, passportNumber = "A1234567") {
  const created = await h.http.post("/api/v1/orders").set(as(s)).send({ serviceSlug: "fr-tourism-schengen", travelFrom: "2027-03-01", travelTo: "2027-03-12", travelers: [citizen(passportNumber)], preferredCity: "RIYADH", locale: "ar" }).expect(201);
  const order = created.body as OrderView;
  for (const r of order.requirements.filter((x) => x.isRequired)) {
    const slots = r.perTraveler ? order.travelers.filter((t) => !r.applicantType || r.applicantType === t.applicantType).map((t) => t.id) : [null];
    for (const tid of slots) await uploadSlot(h, s, order.id, r.id, tid);
  }
  return waitFor(() => getOrder(h, s, order.id), (o) => o.documentsComplete);
}

export async function paidOrder(h: Harness, s: Session, passportNumber?: string) {
  const order = await draftWithDocuments(h, s, passportNumber);
  await h.http.post(`/api/v1/orders/${order.id}/submit`).set(as(s)).send({ acceptTerms: true, acceptDataProcessing: true, acceptCrossBorder: true, marketing: false }).expect(200);
  const start = await h.http.post(`/api/v1/orders/${order.id}/payments`).set(as(s)).set("Idempotency-Key", randomUUID()).expect(201);
  await h.http.post(`/api/v1/payments/mock/${start.body.paymentId}/complete`).set(as(s)).send({ outcome: "paid" }).expect(200);
  return waitFor(() => getOrder(h, s, order.id), (o) => o.status === "RECEIVED");
}

