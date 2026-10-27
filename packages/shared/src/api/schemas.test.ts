import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, SETTING_KEYS, SETTING_SCHEMAS } from "../settings";
import { countryInputSchema, priceRuleInputSchema, serviceInputSchema, testimonialInputSchema } from "./catalog-admin";
import { contactMessageSchema } from "./public";

describe("admin input schemas", () => {
  it("a price rule that is not offered carries no fees and needs a reason", () => {
    const r = priceRuleInputSchema.safeParse({ applicantType: "RESIDENT", isEligible: false, governmentFeeHalalas: 100, serviceFeeHalalas: 0 });
    expect(r.success).toBe(false);
    expect(r.error!.issues.map((i) => i.message).sort()).toEqual(["ineligible_has_fees", "reason_required"]);
    expect(priceRuleInputSchema.safeParse({ applicantType: "RESIDENT", isEligible: false, governmentFeeHalalas: 0, serviceFeeHalalas: 0, ineligibleReasonAr: "غير متاح" }).success).toBe(true);
  });

  it("money is whole halalas", () => {
    expect(priceRuleInputSchema.safeParse({ applicantType: "SAUDI_CITIZEN", governmentFeeHalalas: 10.5, serviceFeeHalalas: 0 }).success).toBe(false);
    expect(priceRuleInputSchema.safeParse({ applicantType: "SAUDI_CITIZEN", governmentFeeHalalas: -1, serviceFeeHalalas: 0 }).success).toBe(false);
  });

  it("a destination must be complete before it can be published", () => {
    const r = countryInputSchema.safeParse({ slug: "peru", iso2: "pe", nameAr: "بيرو", nameEn: "Peru", isDestination: true });
    expect(r.success).toBe(false);
    expect(r.error!.issues.every((i) => i.message === "required_for_destination")).toBe(true);
    const nationalityOnly = countryInputSchema.parse({ slug: "peru", iso2: "pe", nameAr: "بيرو", nameEn: "Peru", taglineAr: "" });
    expect(nationalityOnly.iso2).toBe("PE");
    expect(nationalityOnly.taglineAr).toBeNull();
  });

  it("visas need their country and visa fields; processing min ≤ max", () => {
    const r = serviceInputSchema.safeParse({ category: "VISA", slug: "x-visa", nameAr: "س", nameEn: "X", processingDaysMin: 5, processingDaysMax: 2 });
    expect(r.success).toBe(false);
    const messages = r.error!.issues.map((i) => i.message);
    expect(messages).toContain("min_gt_max");
    expect(messages).toContain("required_for_visa");
  });

  it("publishing a testimonial requires the customer's consent", () => {
    const base = { authorNameAr: "سارة", rating: 5, quoteAr: "ممتاز" };
    expect(testimonialInputSchema.safeParse({ ...base, status: "PUBLISHED" }).success).toBe(false);
    expect(testimonialInputSchema.safeParse({ ...base, status: "PUBLISHED", consentedAt: "2026-10-01T00:00:00.000Z" }).success).toBe(true);
  });

  it("contact form normalises the phone and rejects a filled honeypot", () => {
    expect(contactMessageSchema.parse({ name: "سارة", phone: "٠٥٥١٢٣٤٥٦٧", topic: "visa", message: "أحتاج تأشيرة شنغن" }).phone).toBe("+966551234567");
    expect(contactMessageSchema.safeParse({ name: "Bot", phone: "0551234567", topic: "visa", message: "buy now buy now", website: "x" }).success).toBe(false);
  });
});

describe("settings", () => {
  it("the defaults satisfy their own schemas", () => {
    for (const key of SETTING_KEYS) expect(SETTING_SCHEMAS[key].safeParse(DEFAULT_SETTINGS[key]).success).toBe(true);
  });
});
