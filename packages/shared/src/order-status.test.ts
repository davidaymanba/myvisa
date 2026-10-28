import { describe, expect, it } from "vitest";
import { trackingStepIndex } from "./order-status";

describe("trackingStepIndex", () => {
  it("maps milestones in order", () => {
    expect(trackingStepIndex("RECEIVED")).toBe(0);
    expect(trackingStepIndex("DELIVERED")).toBe(5);
  });

  it("keeps ACTION_REQUIRED on the documents step", () => {
    expect(trackingStepIndex("ACTION_REQUIRED")).toBe(trackingStepIndex("DOCUMENTS_REVIEW"));
  });

  it("returns -1 for pre-payment and terminal off-track states", () => {
    expect(trackingStepIndex("PENDING_PAYMENT")).toBe(-1);
    expect(trackingStepIndex("CANCELLED")).toBe(-1);
  });
});

describe("staff transitions and SLA", () => {
  it("staff never touch drafts or mark an order paid", async () => {
    const { staffTransitions } = await import("./order-status");
    expect(staffTransitions("DRAFT")).toEqual([]);
    expect(staffTransitions("PENDING_PAYMENT")).toEqual([]);
    expect(staffTransitions("RECEIVED")).toEqual(["DOCUMENTS_REVIEW", "ACTION_REQUIRED", "CANCELLED", "REFUNDED"]);
    expect(staffTransitions("ACTION_REQUIRED")).not.toContain("RECEIVED");
    expect(staffTransitions("DELIVERED")).toEqual([]);
  });

  it("the SLA clock only runs while the order is in our hands", async () => {
    const { slaDueAt } = await import("./order-status");
    const t0 = new Date("2026-10-28T08:00:00Z");
    expect(slaDueAt("RECEIVED", t0)?.toISOString()).toBe("2026-10-28T12:00:00.000Z");
    expect(slaDueAt("ACTION_REQUIRED", t0)).toBeNull();
    expect(slaDueAt("SUBMITTED_TO_EMBASSY", t0)).toBeNull();
  });
});
