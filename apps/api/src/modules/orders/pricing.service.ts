import { HttpStatus, Injectable } from "@nestjs/common";
import { calculatePrice, type Discount, type OrderQuote, type QuoteLine } from "@myvisa/shared";
import type { Coupon, PriceRule, Service } from "@myvisa/db";
import { Problem } from "../../common/problem";
import { PrismaService } from "../../infra/prisma.service";
import { resolvePriceRule } from "../catalog/catalog.mapper";

type Applicant = QuoteLine["applicantType"];

export interface PricedService {
  service: Service & { priceRules: PriceRule[] };
  quote: OrderQuote;
  coupon: Coupon | null;
}

/**
 * Prices an order the same way everywhere (quote, draft, submit): one line per traveller from the
 * price-rule resolution order, then `calculatePrice` from packages/shared with any coupon.
 */
@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async loadService(slug: string) {
    const now = new Date();
    const service = await this.prisma.service.findUnique({
      where: { slug },
      include: { priceRules: { where: { validFrom: { lte: now }, OR: [{ validTo: null }, { validTo: { gt: now } }] } } },
    });
    if (!service || !service.isActive) throw Problem.notFound("Service");
    return service;
  }

  async price(serviceOrSlug: string | PricedService["service"], travelers: { applicantType: Applicant; nationalityIso2: string }[], couponCode: string | null | undefined, userId: string | null): Promise<PricedService> {
    const service = typeof serviceOrSlug === "string" ? await this.loadService(serviceOrSlug) : serviceOrSlug;
    const isos = [...new Set(travelers.map((t) => t.nationalityIso2))];
    const countries = await this.prisma.country.findMany({ where: { iso2: { in: isos } }, select: { id: true, iso2: true } });
    const idByIso = new Map(countries.map((c) => [c.iso2, c.id]));

    const lines: QuoteLine[] = travelers.map((t, index) => {
      const rule = resolvePriceRule(service.priceRules, t.applicantType, idByIso.get(t.nationalityIso2) ?? null);
      return {
        index,
        applicantType: t.applicantType,
        nationalityIso2: t.nationalityIso2,
        eligible: Boolean(rule?.isEligible),
        governmentFee: rule?.isEligible ? rule.governmentFeeHalalas : 0,
        serviceFee: rule?.isEligible ? rule.serviceFeeHalalas : 0,
        ineligibleReason: rule && !rule.isEligible && rule.ineligibleReasonAr ? { ar: rule.ineligibleReasonAr, en: rule.ineligibleReasonEn ?? rule.ineligibleReasonAr } : rule ? null : { ar: "هذه الخدمة غير متاحة لهذا المتقدم.", en: "This service isn't offered for this applicant." },
      };
    });

    const priced = lines.filter((l) => l.eligible).map((l) => ({ governmentFee: l.governmentFee, serviceFee: l.serviceFee }));
    const base = calculatePrice(priced);
    let coupon: Coupon | null = null;
    let couponView: OrderQuote["coupon"] = null;
    let discount: Discount | undefined;
    if (couponCode) {
      const evaluated = await this.evaluateCoupon(couponCode, service.id, base.governmentFees + base.serviceFees, userId);
      couponView = { code: couponCode.toUpperCase(), valid: evaluated.ok, reason: evaluated.ok ? null : evaluated.reason };
      if (evaluated.ok) {
        coupon = evaluated.coupon;
        discount = evaluated.coupon.kind === "PERCENT" ? { kind: "percent", value: evaluated.coupon.value, ...(evaluated.coupon.maxDiscountHalalas ? { maxAmount: evaluated.coupon.maxDiscountHalalas } : {}) } : { kind: "fixed", value: evaluated.coupon.value };
      }
    }
    return { service, coupon, quote: { lines, breakdown: calculatePrice(priced, discount), coupon: couponView } };
  }

  /** Same pricing, but refuses when any traveller can't be served. */
  async priceStrict(...args: Parameters<PricingService["price"]>): Promise<PricedService> {
    const result = await this.price(...args);
    const blocked = result.quote.lines.find((l) => !l.eligible);
    if (blocked) throw new Problem(HttpStatus.UNPROCESSABLE_ENTITY, "traveler_ineligible", "A traveller can't apply for this service.", { index: blocked.index, reason: blocked.ineligibleReason });
    return result;
  }

  async evaluateCoupon(code: string, serviceId: string, subtotal: number, userId: string | null): Promise<{ ok: true; coupon: Coupon } | { ok: false; reason: string }> {
    const now = new Date();
    const coupon = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() }, include: { services: { select: { serviceId: true } } } });
    if (!coupon || !coupon.isActive) return { ok: false, reason: "coupon_invalid" };
    if ((coupon.startsAt && coupon.startsAt > now) || (coupon.endsAt && coupon.endsAt <= now)) return { ok: false, reason: "coupon_expired" };
    if (coupon.services.length && !coupon.services.some((s) => s.serviceId === serviceId)) return { ok: false, reason: "coupon_not_applicable" };
    if (coupon.minOrderHalalas && subtotal < coupon.minOrderHalalas) return { ok: false, reason: "coupon_min_order" };
    if (coupon.maxRedemptions !== null && (await this.prisma.couponRedemption.count({ where: { couponId: coupon.id } })) >= coupon.maxRedemptions) return { ok: false, reason: "coupon_exhausted" };
    if (userId && (await this.prisma.couponRedemption.count({ where: { couponId: coupon.id, userId } })) >= coupon.perUserLimit) return { ok: false, reason: "coupon_used" };
    return { ok: true, coupon };
  }
}
