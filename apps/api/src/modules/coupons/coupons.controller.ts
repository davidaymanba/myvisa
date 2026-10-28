import { Body, Controller, Get, Param, Post, Put, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { couponInputSchema, type CouponView } from "@myvisa/shared";
import { Audit } from "../../common/audit.decorator";
import { RequirePermissions } from "../../common/auth.decorators";
import type { AuthedRequest } from "../../common/auth.types";
import { CouponsService } from "./coupons.service";

class CouponDto extends createZodDto(couponInputSchema) {}

@ApiTags("admin · coupons")
@Controller("admin/coupons")
@RequirePermissions("admin:access", "catalog:read")
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  @Get()
  list(): Promise<CouponView[]> {
    return this.coupons.list();
  }

  @Post()
  @RequirePermissions("pricing:write")
  @Audit("coupon.create", "Coupon")
  create(@Body() body: CouponDto): Promise<CouponView> {
    return this.coupons.create(body);
  }

  @Put(":id")
  @RequirePermissions("pricing:write")
  @Audit("coupon.update", "Coupon")
  async update(@Param("id") id: string, @Body() body: CouponDto, @Req() req: AuthedRequest): Promise<CouponView> {
    req.audit = { before: await this.coupons.get(id) };
    return this.coupons.update(id, body);
  }
}
