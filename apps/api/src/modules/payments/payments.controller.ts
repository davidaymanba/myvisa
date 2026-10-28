import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, Post, Req } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import type { PaymentStart, PaymentStatusView } from "@myvisa/shared";
import { Authenticated, CurrentUser } from "../../common/auth.decorators";
import type { RequestUser } from "../../common/auth.types";
import { Problem } from "../../common/problem";
import { PaymentsService } from "./payments.service";

class MockOutcomeDto extends createZodDto(z.object({ outcome: z.enum(["paid", "failed"]) })) {}

const idempotencyKey = z.string().trim().min(8).max(100).regex(/^[\w.:-]+$/);

@ApiTags("payments")
@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post("orders/:id/payments")
  @Authenticated()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiHeader({ name: "Idempotency-Key", required: true, description: "Client-generated; retries with the same key return the same payment" })
  @ApiOperation({ summary: "Open a hosted checkout for an order waiting for payment" })
  start(@Param("id") orderId: string, @Headers("idempotency-key") key: string | undefined, @CurrentUser() user: RequestUser): Promise<PaymentStart> {
    const parsed = idempotencyKey.safeParse(key);
    if (!parsed.success) throw new Problem(HttpStatus.BAD_REQUEST, "idempotency_key_required", "Send an Idempotency-Key header (8–100 characters).");
    return this.payments.start(orderId, user.id, parsed.data);
  }

  @Get("payments/:id")
  @Authenticated()
  @ApiOperation({ summary: "Payment status (syncs with the gateway once if the webhook hasn't arrived)" })
  status(@Param("id") id: string, @CurrentUser() user: RequestUser): Promise<PaymentStatusView> {
    return this.payments.status(id, user.id);
  }

  @Post("payments/webhooks/:provider")
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  @ApiOperation({ summary: "Gateway webhooks (Moyasar, Tap). Verified, de-duplicated, and confirmed against the gateway API." })
  webhook(@Param("provider") provider: string, @Req() req: Request, @Body() body: unknown) {
    return this.payments.handleWebhook(provider, req.headers, body);
  }

  @Post("payments/mock/:id/complete")
  @HttpCode(HttpStatus.OK)
  @Authenticated()
  @ApiOperation({ summary: "Development only: finish a mock-gateway payment" })
  completeMock(@Param("id") id: string, @Body() body: MockOutcomeDto, @CurrentUser() user: RequestUser): Promise<PaymentStatusView> {
    return this.payments.completeMock(id, user.id, body.outcome);
  }
}
