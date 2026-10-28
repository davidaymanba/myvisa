import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { createZodDto } from "nestjs-zod";
import { orderDraftSchema, orderSubmitSchema, quoteSchema, type OrderQuote, type OrderTimelineView, type OrderView } from "@myvisa/shared";
import { Authenticated, CurrentUser, OptionalAuth } from "../../common/auth.decorators";
import type { AuthedRequest, RequestUser } from "../../common/auth.types";
import { requestMeta } from "../../common/request-meta";
import { OrdersService } from "./orders.service";

class QuoteDto extends createZodDto(quoteSchema) {}
class OrderDraftDto extends createZodDto(orderDraftSchema) {}
class OrderSubmitDto extends createZodDto(orderSubmitSchema) {}

@ApiTags("orders")
@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post("quote")
  @HttpCode(HttpStatus.OK)
  @OptionalAuth()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: "Price an application per traveller (no order is created)" })
  quote(@Body() body: QuoteDto, @Req() req: AuthedRequest): Promise<OrderQuote> {
    return this.orders.quote(body, req.user?.id ?? null);
  }

  @Post()
  @Authenticated()
  @ApiOperation({ summary: "Start an application (draft order)" })
  create(@Body() body: OrderDraftDto, @CurrentUser() user: RequestUser): Promise<OrderView> {
    return this.orders.createDraft(user, body);
  }

  @Get()
  @Authenticated()
  @ApiOperation({ summary: "My orders, newest first" })
  mine(@CurrentUser() user: RequestUser): Promise<OrderView[]> {
    return this.orders.listMine(user);
  }

  @Get(":id")
  @Authenticated()
  view(@Param("id") id: string, @CurrentUser() user: RequestUser): Promise<OrderView> {
    return this.orders.view(user, id);
  }

  @Get(":id/travelers")
  @Authenticated()
  @ApiOperation({ summary: "Full traveller details of a draft, for editing (owner only)" })
  travelers(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.orders.editableTravelers(user, id);
  }

  @Put(":id")
  @Authenticated()
  @ApiOperation({ summary: "Replace a draft (travellers, dates, appointment preference); re-prices" })
  update(@Param("id") id: string, @Body() body: OrderDraftDto, @CurrentUser() user: RequestUser): Promise<OrderView> {
    return this.orders.updateDraft(user, id, body);
  }

  @Post(":id/submit")
  @HttpCode(HttpStatus.OK)
  @Authenticated()
  @ApiOperation({ summary: "Lock the price, record consents, move to PENDING_PAYMENT" })
  submit(@Param("id") id: string, @Body() body: OrderSubmitDto, @CurrentUser() user: RequestUser, @Req() req: AuthedRequest): Promise<OrderView> {
    return this.orders.submit(user, id, body, requestMeta(req));
  }

  @Get(":id/timeline")
  @Authenticated()
  @ApiOperation({ summary: "Status history, appointment, shipments and invoices" })
  timeline(@Param("id") id: string, @CurrentUser() user: RequestUser): Promise<OrderTimelineView> {
    return this.orders.timeline(user, id);
  }

  @Post(":id/resubmit")
  @HttpCode(HttpStatus.OK)
  @Authenticated()
  @ApiOperation({ summary: "Send an ACTION_REQUIRED order back for review once the missing documents are in" })
  resubmit(@Param("id") id: string, @CurrentUser() user: RequestUser): Promise<OrderView> {
    return this.orders.resubmit(user, id);
  }

  @Post(":id/cancel")
  @HttpCode(HttpStatus.OK)
  @Authenticated()
  cancel(@Param("id") id: string, @CurrentUser() user: RequestUser): Promise<OrderView> {
    return this.orders.cancel(user, id);
  }
}
