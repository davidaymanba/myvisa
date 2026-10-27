import { describe, expect, it } from "vitest";
import { DESTINATIONS } from "./destinations";
import { matchVisa, pickVisa, startingPrice } from "./helpers";
import { SERVICE_CATEGORIES } from "./services";

describe("catalog integrity", () => {
  it("has 15+ destinations with unique slugs and visa ids", () => {
    expect(DESTINATIONS.length).toBeGreaterThanOrEqual(15);
    expect(new Set(DESTINATIONS.map((d) => d.slug)).size).toBe(DESTINATIONS.length);
    const ids = DESTINATIONS.flatMap((d) => d.visas.map((v) => v.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(DESTINATIONS.map((d) => [d.slug, d] as const))("%s offers tourism and prices both applicant types", (_, d) => {
    expect(d.visas.some((v) => v.purpose === "TOURISM")).toBe(true);
    for (const v of d.visas) {
      expect(v.pricing.map((p) => p.applicant).sort()).toEqual(["RESIDENT", "SAUDI_CITIZEN"]);
      expect(v.processingDays[0]).toBeLessThanOrEqual(v.processingDays[1]);
      for (const p of v.pricing) {
        expect(Number.isInteger(p.governmentFee) && p.governmentFee >= 0).toBe(true);
        expect(Number.isInteger(p.serviceFee) && p.serviceFee >= 0).toBe(true);
        if (!p.eligible) expect(p.ineligibleReason).toBeDefined();
      }
      if (v.kind === "VISA_FREE") {
        // We never charge a service fee for travel that needs no visa.
        for (const p of v.pricing.filter((x) => x.eligible)) expect(p.serviceFee).toBe(0);
      }
    }
  });

  it("has every service category", () => {
    expect(SERVICE_CATEGORIES.map((c) => c.slug)).toEqual(["visas", "travel-insurance", "driving-license", "translation", "document-shipping"]);
  });
});

describe("pickVisa", () => {
  const visas = [
    { id: "free", purpose: "TOURISM" as const, pricing: [{ applicant: "SAUDI_CITIZEN" as const, eligible: true }, { applicant: "RESIDENT" as const, eligible: false }] },
    { id: "sticker", purpose: "TOURISM" as const, pricing: [{ applicant: "SAUDI_CITIZEN" as const, eligible: false }, { applicant: "RESIDENT" as const, eligible: true }] },
    { id: "study", purpose: "STUDY" as const, pricing: [{ applicant: "SAUDI_CITIZEN" as const, eligible: true }, { applicant: "RESIDENT" as const, eligible: true }] },
  ];

  it("prefers the option the applicant is eligible for", () => {
    expect(pickVisa(visas, "TOURISM", "SAUDI_CITIZEN")?.visa.id).toBe("free");
    expect(pickVisa(visas, "TOURISM", "RESIDENT")?.visa.id).toBe("sticker");
  });

  it("falls back to tourism when the purpose isn't offered", () => {
    expect(pickVisa(visas, "MEDICAL", "RESIDENT")).toEqual({ visa: visas[1], fallback: true });
  });

  it("matches exact purposes without fallback", () => {
    expect(pickVisa(visas, "STUDY", "RESIDENT")).toEqual({ visa: visas[2], fallback: false });
  });
});

describe("matchVisa / startingPrice", () => {
  it("returns a priced match for a Schengen tourist", () => {
    const m = matchVisa("france", "SAUDI_CITIZEN", "TOURISM");
    expect(m?.visa.kind).toBe("STICKER");
    expect(m?.breakdown.total).toBe(m!.price.governmentFee + m!.price.serviceFee + m!.breakdown.vat);
  });

  it("starting price for visa-free travel is zero", () => {
    expect(startingPrice(DESTINATIONS.find((d) => d.slug === "georgia")!)?.total).toBe(0);
  });
});
