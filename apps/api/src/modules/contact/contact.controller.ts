import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Query, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { contactMessageSchema, type ContactMessageRecord, type Paginated } from "@myvisa/shared";
import { Audit } from "../../common/audit.decorator";
import { RequirePermissions } from "../../common/auth.decorators";
import type { AuthedRequest } from "../../common/auth.types";
import { requestMeta } from "../../common/request-meta";
import { PrismaService } from "../../infra/prisma.service";

class ContactDto extends createZodDto(contactMessageSchema) {}
class InboxQuery extends createZodDto(
  z.object({ status: z.enum(["open", "handled", "all"]).default("open"), cursor: z.string().max(40).optional(), take: z.coerce.number().int().min(1).max(100).default(30) }),
) {}
class HandledDto extends createZodDto(z.object({ handled: z.boolean() })) {}

@ApiTags("contact")
@Controller()
export class ContactController {
  constructor(private readonly prisma: PrismaService) {}

  @Post("contact")
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiOperation({ summary: "Public contact form (5 per hour per IP)" })
  async create(@Body() body: ContactDto, @Req() req: AuthedRequest): Promise<{ received: true }> {
    // Honeypot filled → pretend success so bots learn nothing.
    if (body.website) return { received: true };
    const { website: _honeypot, topic, ...rest } = body;
    await this.prisma.contactMessage.create({ data: { ...rest, topic: topic.toUpperCase() as Uppercase<typeof topic>, ...requestMeta(req) } });
    return { received: true };
  }

  @Get("admin/contact-messages")
  @RequirePermissions("admin:access", "contact:read")
  async inbox(@Query() query: InboxQuery): Promise<Paginated<ContactMessageRecord>> {
    const rows = await this.prisma.contactMessage.findMany({
      where: query.status === "open" ? { handledAt: null } : query.status === "handled" ? { handledAt: { not: null } } : {},
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: { id: true, name: true, phone: true, topic: true, message: true, locale: true, handledAt: true, createdAt: true },
    });
    const items = rows.slice(0, query.take).map((r) => ({ ...r, handledAt: r.handledAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString() }));
    return { items, nextCursor: rows.length > query.take ? (items.at(-1)?.id ?? null) : null };
  }

  @Put("admin/contact-messages/:id/handled")
  @RequirePermissions("admin:access", "contact:write")
  @Audit("contact_message.handle", "ContactMessage")
  handle(@Param("id") id: string, @Body() body: HandledDto) {
    return this.prisma.contactMessage.update({ where: { id }, data: { handledAt: body.handled ? new Date() : null } });
  }
}
