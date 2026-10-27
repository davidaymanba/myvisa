import { calculatePrice, type PriceBreakdown } from "../pricing";
import { DESTINATIONS } from "./destinations";
import type { ApplicantType, Destination, PriceOption, TravelPurpose, VisaOption } from "./types";

export const PURPOSES: readonly TravelPurpose[] = ["TOURISM", "BUSINESS", "STUDY", "MEDICAL", "FAMILY_VISIT"];

export function getDestination(slug: string): Destination | undefined {
  return DESTINATIONS.find((d) => d.slug === slug);
}

export function popularDestinations(): Destination[] {
  return DESTINATIONS.filter((d) => d.popular);
}

export function priceFor(visa: VisaOption, applicant: ApplicantType): PriceOption | undefined {
  return visa.pricing.find((p) => p.applicant === applicant);
}

/** Lowest all-in price (government + service + VAT) a given applicant can get for a destination. */
export function startingPrice(destination: Destination, applicant: ApplicantType = "SAUDI_CITIZEN"): PriceBreakdown | undefined {
  let best: PriceBreakdown | undefined;
  for (const visa of destination.visas) {
    const p = priceFor(visa, applicant);
    if (!p?.eligible) continue;
    const total = calculatePrice([{ governmentFee: p.governmentFee, serviceFee: p.serviceFee }]);
    if (!best || total.total < best.total) best = total;
  }
  return best;
}

interface Pickable {
  purpose: TravelPurpose;
  pricing: readonly { applicant: ApplicantType; eligible: boolean }[];
}

/**
 * Chooses the visa to show for (purpose, applicant). Some destinations offer different visas to
 * citizens and residents for the same purpose, so prefer the option this applicant is eligible for;
 * fall back to tourism when the purpose isn't offered. Works on full and slimmed (client) shapes.
 */
export function pickVisa<T extends Pickable>(visas: readonly T[], purpose: TravelPurpose, applicant: ApplicantType): { visa: T; fallback: boolean } | undefined {
  const eligible = (v: T) => v.pricing.some((p) => p.applicant === applicant && p.eligible);
  const forPurpose = visas.filter((v) => v.purpose === purpose);
  const exact = forPurpose.find(eligible) ?? forPurpose[0];
  if (exact) return { visa: exact, fallback: false };
  const tourism = visas.filter((v) => v.purpose === "TOURISM");
  const visa = tourism.find(eligible) ?? tourism[0] ?? visas[0];
  return visa ? { visa, fallback: true } : undefined;
}

/** Purposes a destination offers, in catalog order, without duplicates. */
export function purposesOf(visas: readonly { purpose: TravelPurpose }[]): TravelPurpose[] {
  return Array.from(new Set(visas.map((v) => v.purpose)));
}

export interface VisaMatch {
  destination: Destination;
  visa: VisaOption;
  price: PriceOption;
  breakdown: PriceBreakdown;
  /** True when the exact purpose wasn't offered and we fell back to the tourism option. */
  fallback: boolean;
}

/** The visa-finder query: who is travelling, where, and why → the option we would file. */
export function matchVisa(slug: string, applicant: ApplicantType, purpose: TravelPurpose): VisaMatch | undefined {
  const destination = getDestination(slug);
  if (!destination) return undefined;
  const picked = pickVisa(destination.visas, purpose, applicant);
  if (!picked) return undefined;
  const { visa } = picked;
  const price = priceFor(visa, applicant);
  if (!price) return undefined;
  return {
    destination,
    visa,
    price,
    breakdown: calculatePrice([{ governmentFee: price.governmentFee, serviceFee: price.serviceFee }]),
    fallback: picked.fallback,
  };
}
