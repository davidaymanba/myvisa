import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import type { CustomerDetail, CustomerPage } from "@myvisa/shared";
import { RequirePermissions } from "../../common/auth.decorators";
import { CustomersService } from "./customers.service";

class CustomerQuery extends createZodDto(
  z.object({ q: z.string().trim().max(80).optional(), page: z.coerce.number().int().min(1).max(1000).default(1), pageSize: z.coerce.number().int().min(10).max(100).default(30) }),
) {}

@ApiTags("admin · customers")
@Controller("admin/customers")
@RequirePermissions("admin:access", "orders:read")
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  list(@Query() query: CustomerQuery): Promise<CustomerPage> {
    return this.customers.list(query);
  }

  @Get(":id")
  detail(@Param("id") id: string): Promise<CustomerDetail> {
    return this.customers.detail(id);
  }
}
