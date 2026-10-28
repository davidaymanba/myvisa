import { HttpStatus, Injectable } from "@nestjs/common";
import type { CouponView } from "@myvisa/shared";
import { Prisma } from "@myvisa/db";
import { Problem } from "../../common/problem";
import { PrismaService } from "../../infra/prisma.service";

type CouponData = {
  code: string;
  kind: "PERCENT" | "FIXED";
  value: number;
  maxDiscountHalalas: number | null;
  minOrderHalalas: number | null;
  maxRedemptions: number | null;
  perUserLimit: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  serviceSlugs: string[];
};

const include = { services: { select: { service: { select: { slug: true } } } }, redemptions: { select: { amountHalalas: true } } } satisfies Prisma.CouponInclude;

/** Promotions. Discounts only ever reduce our service fee (see shared pricing); redemption happens on payment. */
@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  private toView(c: Prisma.CouponGetPayload<{ include: typeof include }>): CouponView {
    return {
      id: c.id,
      code: c.code,
      kind: c.kind,
      value: c.value,
      maxDiscountHalalas: c.maxDiscountHalalas,
      minOrderHalalas: c.minOrderHalalas,
      maxRedemptions: c.maxRedemptions,
      perUserLimit: c.perUserLimit,
      startsAt: c.startsAt?.toISOString() ?? null,
      endsAt: c.endsAt?.toISOString() ?? null,
      isActive: c.isActive,
      serviceSlugs: c.services.map((s) => s.service.slug),
      redemptions: c.redemptions.length,
      discountGivenHalalas: c.redemptions.reduce((s, r) => s + r.amountHalalas, 0),
      createdAt: c.createdAt.toISOString(),
    };
  }

  async list(): Promise<CouponView[]> {
    const rows = await this.prisma.coupon.findMany({ include, orderBy: { createdAt: "desc" } });
    return rows.map((c) => this.toView(c));
  }

  async get(id: string): Promise<CouponView> {
    const c = await this.prisma.coupon.findUnique({ where: { id }, include });
    if (!c) throw Problem.notFound("Coupon");
    return this.toView(c);
  }

  private async serviceIds(slugs: string[]) {
    if (!slugs.length) return [];
    const rows = await this.prisma.service.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } });
    const missing = slugs.filter((s) => !rows.some((r) => r.slug === s));
    if (missing.length) throw new Problem(HttpStatus.UNPROCESSABLE_ENTITY, "validation_failed", "Unknown service.", { errors: [{ path: "serviceSlugs", code: "custom", message: "service" }] });
    return rows.map((r) => r.id);
  }

  private data(input: CouponData) {
    return {
      code: input.code,
      kind: input.kind,
      value: input.value,
      maxDiscountHalalas: input.kind === "PERCENT" ? input.maxDiscountHalalas : null,
      minOrderHalalas: input.minOrderHalalas,
      maxRedemptions: input.maxRedemptions,
      perUserLimit: input.perUserLimit,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      isActive: input.isActive,
    };
  }

  private duplicate(err: unknown): never {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") throw new Problem(HttpStatus.CONFLICT, "coupon_exists", "A coupon with this code exists.", { errors: [{ path: "code", code: "custom", message: "coupon_exists" }] });
    throw err;
  }

  async create(input: CouponData): Promise<CouponView> {
    const ids = await this.serviceIds(input.serviceSlugs);
    try {
      const c = await this.prisma.coupon.create({ data: { ...this.data(input), services: { create: ids.map((serviceId) => ({ serviceId })) } } });
      return this.get(c.id);
    } catch (err) {
      this.duplicate(err);
    }
  }

  async update(id: string, input: CouponData): Promise<CouponView> {
    await this.get(id);
    const ids = await this.serviceIds(input.serviceSlugs);
    try {
      await this.prisma.$transaction([
        this.prisma.couponService.deleteMany({ where: { couponId: id } }),
        this.prisma.coupon.update({ where: { id }, data: { ...this.data(input), services: { create: ids.map((serviceId) => ({ serviceId })) } } }),
      ]);
    } catch (err) {
      this.duplicate(err);
    }
    return this.get(id);
  }
}
