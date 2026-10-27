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
