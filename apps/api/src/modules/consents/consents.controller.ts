import { Body, Controller, Get, HttpStatus, Post, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { createZodDto } from "nestjs-zod";
import { consentInputSchema } from "@myvisa/shared";
import { Authenticated, CurrentUser, OptionalAuth } from "../../common/auth.decorators";
import type { AuthedRequest, RequestUser } from "../../common/auth.types";
import { Problem } from "../../common/problem";
import { requestMeta } from "../../common/request-meta";
import { PrismaService } from "../../infra/prisma.service";

class ConsentDto extends createZodDto(consentInputSchema) {}

/** PDPL consent ledger. Append-only: withdrawing consent adds a `granted: false` row; nothing is updated or deleted. */
@ApiTags("consents")
@Controller("consents")
export class ConsentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @OptionalAuth()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: "Record that consent was granted or withdrawn" })
  record(@Body() body: ConsentDto, @Req() req: AuthedRequest) {
    const userId = req.user?.id ?? null;
    if (!userId && !body.phone) throw new Problem(HttpStatus.UNPROCESSABLE_ENTITY, "phone_required", "Sign in or give the phone number the consent belongs to.");
    const { userAgent, ip } = requestMeta(req);
    return this.prisma.consent.create({
      data: { userId, phone: userId ? null : (body.phone ?? null), type: body.type, policyVersion: body.policyVersion, granted: body.granted, ip, userAgent },
      select: { id: true, type: true, policyVersion: true, granted: true, createdAt: true },
    });
  }

  @Get("me")
  @Authenticated()
  @ApiOperation({ summary: "The signed-in user's current consent per type (latest entry wins)" })
  async mine(@CurrentUser() user: RequestUser) {
    const rows = await this.prisma.consent.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      distinct: ["type"],
      select: { type: true, policyVersion: true, granted: true, createdAt: true },
    });
    return rows;
  }
}
