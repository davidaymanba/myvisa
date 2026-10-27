import type { Halalas } from "./money";

/** Standard KSA VAT. Applied to our service fee only; government/embassy fees are pass-through disbursements. */
export const VAT_RATE = 0.15;

export interface PriceLine {
  /** Embassy / government fee collected on the traveler's behalf (no VAT). */
  governmentFee: Halalas;
  /** myvisa service fee (VAT-able). */
  serviceFee: Halalas;
  quantity?: number;
}

export type Discount =
  | { kind: "percent"; value: number; maxAmount?: Halalas }
  | { kind: "fixed"; value: Halalas };

export interface PriceBreakdown {
  governmentFees: Halalas;
  serviceFees: Halalas;
  discount: Halalas;
  vat: Halalas;
  total: Halalas;
  vatRate: number;
}

function roundHalalas(value: number): Halalas {
  return Math.round(value + Number.EPSILON);
}

/**
 * Single source of truth for order totals, shared by the UI and the API.
 * Discounts reduce the service fee only — we never discount money we pass to an embassy.
 */
export function calculatePrice(lines: readonly PriceLine[], discount?: Discount, vatRate = VAT_RATE): PriceBreakdown {
  let governmentFees = 0;
  let serviceFees = 0;
  for (const line of lines) {
    const qty = line.quantity ?? 1;
    if (!Number.isInteger(qty) || qty < 1) throw new RangeError("quantity must be a positive integer");
    if (line.governmentFee < 0 || line.serviceFee < 0) throw new RangeError("fees cannot be negative");
    governmentFees += line.governmentFee * qty;
    serviceFees += line.serviceFee * qty;
  }

  let discountAmount = 0;
  if (discount?.kind === "percent") {
    if (discount.value < 0 || discount.value > 100) throw new RangeError("percent discount must be 0–100");
    discountAmount = roundHalalas((serviceFees * discount.value) / 100);
    if (discount.maxAmount !== undefined) discountAmount = Math.min(discountAmount, discount.maxAmount);
  } else if (discount?.kind === "fixed") {
    discountAmount = discount.value;
  }
  discountAmount = Math.max(0, Math.min(discountAmount, serviceFees));

  const vat = roundHalalas((serviceFees - discountAmount) * vatRate);
  return {
    governmentFees,
    serviceFees,
    discount: discountAmount,
    vat,
    total: governmentFees + serviceFees - discountAmount + vat,
    vatRate,
  };
}
