import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DESTINATIONS, INSURANCE_PLANS, NATIONALITIES, PURPOSES, matchVisa, type Destination, type PublicCatalog } from "@myvisa/shared";
import { type Harness, as, signIn, startHarness } from "./harness";

/** JSON round-trip, and price options in a stable order (the DB sorts by applicant type). */
function normalize(destinations: Destination[]) {
  const copy = JSON.parse(JSON.stringify(destinations)) as Destination[];
  for (const d of copy) for (const v of d.visas) v.pricing.sort((a, b) => a.applicant.localeCompare(b.applicant));
  return copy;
}

describe("public catalog", () => {
  let h: Harness;
  beforeAll(async () => {
    h = await startHarness();
  });
  afterAll(() => h.close());

  it("serves exactly the catalog the website was built from", async () => {
    const res = await h.http.get("/api/v1/catalog").expect(200);
    const body = res.body as PublicCatalog;
    expect(normalize(body.destinations)).toEqual(normalize(DESTINATIONS));
    expect(body.nationalities).toEqual(JSON.parse(JSON.stringify(NATIONALITIES)));
    expect(body.insurancePlans).toEqual(JSON.parse(JSON.stringify(INSURANCE_PLANS)));
  });

  it("answers the finder with matchVisa semantics", async () => {
    for (const d of DESTINATIONS.slice(0, 8)) {
      for (const applicant of ["SAUDI_CITIZEN", "RESIDENT"] as const) {
        for (const purpose of PURPOSES) {
          const expected = matchVisa(d.slug, applicant, purpose)!;
          const res = await h.http.get("/api/v1/catalog/finder").query({ to: d.slug, applicant, purpose }).expect(200);
          expect(res.body.visa.id).toBe(expected.visa.id);
          expect(res.body.fallback).toBe(expected.fallback);
          expect(res.body.breakdown).toEqual(expected.breakdown);
        }
      }
    }
  });

  it("404s unknown destinations as problem+json", async () => {
    const res = await h.http.get("/api/v1/catalog/destinations/atlantis").expect(404);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    expect(res.body.code).toBe("not_found");
  });

  it("applies a nationality-specific resident price over the generic rule", async () => {
    const manager = await signIn(h, "MANAGER");
    const service = await h.prisma.service.findFirstOrThrow({ where: { category: "VISA", visaKind: "STICKER", purpose: "TOURISM" }, include: { country: true } });
    const egypt = await h.prisma.country.findUniqueOrThrow({ where: { iso2: "EG" } });
    await h.http
      .post(`/api/v1/admin/services/${service.id}/price-rules`)
      .set(as(manager))
      .send({ applicantType: "RESIDENT", nationalityId: egypt.id, governmentFeeHalalas: 12_300, serviceFeeHalalas: 4_500 })
      .expect(201);
    const res = await h.http.get("/api/v1/catalog/finder").query({ to: service.country!.slug, applicant: "RESIDENT", purpose: "TOURISM", nationality: "EG" }).expect(200);
    expect(res.body.price.governmentFee).toBe(12_300);
    expect(res.body.breakdown.vat).toBe(675);
  });
});

describe("catalog admin", () => {
  let h: Harness;
  beforeAll(async () => {
    h = await startHarness();
  });
  afterAll(() => h.close());

  it("updates a price rule, writes the audit log, and the public catalog reflects it", async () => {
    const manager = await signIn(h, "MANAGER");
    const visa = DESTINATIONS.find((d) => d.slug === "france")!.visas[0]!;
    const service = await h.prisma.service.findUniqueOrThrow({ where: { slug: visa.id }, include: { priceRules: true } });
    const rule = service.priceRules.find((r) => r.applicantType === "SAUDI_CITIZEN")!;

    await h.http.get("/api/v1/catalog").expect(200); // warm the cache
    const res = await h.http
      .put(`/api/v1/admin/price-rules/${rule.id}`)
      .set(as(manager))
      .send({ applicantType: "SAUDI_CITIZEN", governmentFeeHalalas: rule.governmentFeeHalalas, serviceFeeHalalas: 25_000, governmentFeeNoteAr: rule.governmentFeeNoteAr, governmentFeeNoteEn: rule.governmentFeeNoteEn })
      .expect(200);
    expect(res.body.serviceFeeHalalas).toBe(25_000);

    const log = await h.prisma.auditLog.findFirstOrThrow({ where: { entityType: "PriceRule", entityId: rule.id } });
    expect(log.action).toBe("price_rule.update");
    expect(log.actorId).toBe(manager.userId);
    expect((log.before as { serviceFeeHalalas: number }).serviceFeeHalalas).toBe(rule.serviceFeeHalalas);
    expect((log.after as { serviceFeeHalalas: number }).serviceFeeHalalas).toBe(25_000);

    const catalog = (await h.http.get("/api/v1/catalog").expect(200)).body as PublicCatalog;
    const price = catalog.destinations.find((d) => d.slug === "france")!.visas[0]!.pricing.find((p) => p.applicant === "SAUDI_CITIZEN")!;
    expect(price.serviceFee).toBe(25_000);
  });

  it("refuses a service fee on a visa-free option", async () => {
    const manager = await signIn(h, "MANAGER");
    const visaFree = await h.prisma.service.findFirstOrThrow({ where: { visaKind: "VISA_FREE" } });
    const res = await h.http
      .post(`/api/v1/admin/services/${visaFree.id}/price-rules`)
      .set(as(manager))
      .send({ applicantType: "RESIDENT", nationalityId: (await h.prisma.country.findUniqueOrThrow({ where: { iso2: "IN" } })).id, governmentFeeHalalas: 0, serviceFeeHalalas: 100 })
      .expect(422);
    expect(res.body.code).toBe("visa_free_fee");
  });

  it("rejects a duplicate rule for the same applicant and nationality", async () => {
    const manager = await signIn(h, "MANAGER");
    const service = await h.prisma.service.findFirstOrThrow({ where: { category: "VISA", visaKind: { not: "VISA_FREE" } } });
    const res = await h.http.post(`/api/v1/admin/services/${service.id}/price-rules`).set(as(manager)).send({ applicantType: "SAUDI_CITIZEN", governmentFeeHalalas: 1, serviceFeeHalalas: 1 }).expect(409);
    expect(res.body.code).toBe("duplicate_rule");
  });

  it("validates bodies with the shared Zod schemas (422 with field paths)", async () => {
    const manager = await signIn(h, "MANAGER");
    const res = await h.http.post("/api/v1/admin/countries").set(as(manager)).send({ slug: "Not A Slug", iso2: "x", nameAr: "", nameEn: "X", isDestination: true }).expect(422);
    expect(res.body.code).toBe("validation_failed");
    const paths = (res.body.errors as { path: string }[]).map((e) => e.path);
    expect(paths).toEqual(expect.arrayContaining(["slug", "iso2", "nameAr"]));
  });

  it("creates, edits and deletes a country end to end", async () => {
    const manager = await signIn(h, "MANAGER");
    const body = { slug: "portugal", iso2: "PT", nameAr: "البرتغال", nameEn: "Portugal" };
    const created = await h.http.post("/api/v1/admin/countries").set(as(manager)).send(body).expect(201);
    await h.http.put(`/api/v1/admin/countries/${created.body.id}`).set(as(manager)).send({ ...body, nationalityAr: "برتغالي", nationalityEn: "Portuguese" }).expect(200);
    const catalog = (await h.http.get("/api/v1/catalog").expect(200)).body as PublicCatalog;
    expect(catalog.nationalities.map((n) => n.iso2)).toContain("PT");
    await h.http.delete(`/api/v1/admin/countries/${created.body.id}`).set(as(manager)).expect(204);
    expect(await h.prisma.auditLog.count({ where: { entityType: "Country", entityId: created.body.id } })).toBe(3);
  });

  it("will not delete a country that still has services", async () => {
    const manager = await signIn(h, "MANAGER");
    const france = await h.prisma.country.findUniqueOrThrow({ where: { slug: "france" } });
    const res = await h.http.delete(`/api/v1/admin/countries/${france.id}`).set(as(manager)).expect(409);
    expect(res.body.code).toBe("in_use");
  });
});
