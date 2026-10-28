import { describe, expect, it } from "vitest";
import { ORDER_STATUSES, canTransition } from "../order-status";
import { orderDraftSchema, orderSubmitSchema, travelerInputSchema } from "./orders";

const traveler = {
  relationship: "SELF",
  givenNameEn: "noura",
  surnameEn: "alotaibi",
  gender: "FEMALE",
  dateOfBirth: "1992-04-11",
  nationalityIso2: "sa",
  applicantType: "SAUDI_CITIZEN",
  passportNumber: "a 123 4567",
  passportExpiry: "2031-01-01",
} as const;

describe("order state machine", () => {
  it("only payment or staff move an order past PENDING_PAYMENT", () => {
    expect(canTransition("DRAFT", "PENDING_PAYMENT")).toBe(true);
    expect(canTransition("PENDING_PAYMENT", "RECEIVED")).toBe(true);
    expect(canTransition("DRAFT", "RECEIVED")).toBe(false);
    expect(canTransition("RECEIVED", "DRAFT")).toBe(false);
  });

  it("terminal states are terminal", () => {
    for (const to of ORDER_STATUSES) {
      expect(canTransition("DELIVERED", to)).toBe(false);
      expect(canTransition("REFUNDED", to)).toBe(false);
      expect(canTransition("CANCELLED", to)).toBe(false);
    }
  });
});

describe("traveller input", () => {
  it("normalises names, nationality and passport number", () => {
    const t = travelerInputSchema.parse(traveler);
    expect(t).toMatchObject({ givenNameEn: "NOURA", surnameEn: "ALOTAIBI", nationalityIso2: "SA", passportNumber: "A1234567" });
  });

  it("rejects Arabic in passport names, expired passports and non-Saudi citizens", () => {
    const r = travelerInputSchema.safeParse({ ...traveler, givenNameEn: "نورة", passportExpiry: "2020-01-01", nationalityIso2: "EG" });
    expect(r.success).toBe(false);
    expect(r.error!.issues.map((i) => i.message).sort()).toEqual(["citizen_is_saudi", "latin_name", "passport_expired"]);
  });

  it("orders dates and caps the group size", () => {
    expect(orderDraftSchema.safeParse({ serviceSlug: "x", travelFrom: "2027-03-10", travelTo: "2027-03-01", travelers: [traveler] }).success).toBe(false);
    expect(orderDraftSchema.safeParse({ serviceSlug: "x", travelers: Array.from({ length: 10 }, () => traveler) }).success).toBe(false);
  });
});

describe("submission consents", () => {
  it("terms, data processing and cross-border transfer are all mandatory", () => {
    expect(orderSubmitSchema.safeParse({ acceptTerms: true, acceptDataProcessing: true, acceptCrossBorder: true }).success).toBe(true);
    const r = orderSubmitSchema.safeParse({ acceptTerms: true, acceptDataProcessing: false, acceptCrossBorder: true });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0]!.message).toBe("consent_required");
  });
});
