import { describe, expect, it } from "vitest";
import { calculatePrice } from "./pricing";

describe("calculatePrice", () => {
  it("applies VAT to the service fee only", () => {
    const result = calculatePrice([{ governmentFee: 33_000, serviceFee: 20_000 }]);
    expect(result).toMatchObject({ governmentFees: 33_000, serviceFees: 20_000, vat: 3_000, total: 56_000 });
  });

  it("multiplies by quantity for group travelers", () => {
    const result = calculatePrice([{ governmentFee: 10_000, serviceFee: 5_000, quantity: 3 }]);
    expect(result.governmentFees).toBe(30_000);
    expect(result.serviceFees).toBe(15_000);
    expect(result.vat).toBe(2_250);
  });

  it("never discounts government fees", () => {
    const result = calculatePrice([{ governmentFee: 50_000, serviceFee: 10_000 }], { kind: "fixed", value: 99_999 });
    expect(result.discount).toBe(10_000);
    expect(result.vat).toBe(0);
    expect(result.total).toBe(50_000);
  });

  it("caps percent discounts at maxAmount", () => {
    const result = calculatePrice([{ governmentFee: 0, serviceFee: 100_000 }], { kind: "percent", value: 50, maxAmount: 10_000 });
    expect(result.discount).toBe(10_000);
    expect(result.vat).toBe(13_500);
  });

  it("rounds VAT to the nearest halala", () => {
    expect(calculatePrice([{ governmentFee: 0, serviceFee: 3_333 }]).vat).toBe(500);
  });

  it("rejects invalid input", () => {
    expect(() => calculatePrice([{ governmentFee: -1, serviceFee: 0 }])).toThrow(RangeError);
    expect(() => calculatePrice([{ governmentFee: 0, serviceFee: 0, quantity: 0 }])).toThrow(RangeError);
    expect(() => calculatePrice([], { kind: "percent", value: 120 })).toThrow(RangeError);
  });
});
