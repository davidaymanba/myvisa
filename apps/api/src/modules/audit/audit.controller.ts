import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import type { AuditLogRecord, Paginated } from "@myvisa/shared";
import { RequirePermissions } from "../../common/auth.decorators";
import { PrismaService } from "../../infra/prisma.service";

class AuditQuery extends createZodDto(
  z.object({
    entityType: z.string().max(60).optional(),
    entityId: z.string().max(60).optional(),
    actorId: z.string().max(40).optional(),
    cursor: z.string().max(40).optional(),
    take: z.coerce.number().int().min(1).max(100).default(50),
  }),
) {}

@ApiTags("admin · audit")
@Controller("admin/audit-logs")
@RequirePermissions("admin:access", "audit:read")
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: "Staff mutations, newest first" })
  async list(@Query() q: AuditQuery): Promise<Paginated<AuditLogRecord>> {
    const rows = await this.prisma.auditLog.findMany({
      where: { ...(q.entityType ? { entityType: q.entityType } : {}), ...(q.entityId ? { entityId: q.entityId } : {}), ...(q.actorId ? { actorId: q.actorId } : {}) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: q.take + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      include: { actor: { select: { id: true, phone: true, fullNameAr: true, fullNameEn: true, role: true } } },
    });
    const items = rows.slice(0, q.take).map(({ actorId: _a, userAgent: _u, ...r }) => ({ ...r, createdAt: r.createdAt.toISOString() }));
    return { items, nextCursor: rows.length > q.take ? (items.at(-1)?.id ?? null) : null };
  }
}
