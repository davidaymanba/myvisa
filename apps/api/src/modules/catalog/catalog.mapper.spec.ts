import { describe, expect, it } from "vitest";
import { resolvePriceRule } from "./catalog.mapper";

const rule = (applicantType: string, nationalityId: string | null, extra: Partial<{ validFrom: Date; validTo: Date | null; id: string }> = {}) => ({
  id: extra.id ?? `${applicantType}-${nationalityId}`,
  applicantType: applicantType as "RESIDENT",
  nationalityId,
  validFrom: extra.validFrom ?? new Date("2026-01-01"),
  validTo: extra.validTo ?? null,
});

describe("resolvePriceRule", () => {
  const at = new Date("2026-10-27");
  const rules = [rule("SAUDI_CITIZEN", null), rule("RESIDENT", null), rule("RESIDENT", "EG")];

  it("prefers the nationality-specific rule", () => {
    expect(resolvePriceRule(rules, "RESIDENT", "EG", at)?.id).toBe("RESIDENT-EG");
  });

  it("falls back to the any-nationality rule", () => {
    expect(resolvePriceRule(rules, "RESIDENT", "IN", at)?.id).toBe("RESIDENT-null");
    expect(resolvePriceRule(rules, "RESIDENT", null, at)?.id).toBe("RESIDENT-null");
  });

  it("returns nothing when the applicant type is not offered", () => {
    expect(resolvePriceRule(rules, "GCC_CITIZEN", null, at)).toBeUndefined();
  });

  it("ignores rules outside their validity window", () => {
    const windowed = [
      rule("RESIDENT", "EG", { id: "expired", validTo: new Date("2026-06-01") }),
      rule("RESIDENT", "EG", { id: "future", validFrom: new Date("2027-01-01") }),
      rule("RESIDENT", null, { id: "generic" }),
    ];
    expect(resolvePriceRule(windowed, "RESIDENT", "EG", at)?.id).toBe("generic");
  });
});
