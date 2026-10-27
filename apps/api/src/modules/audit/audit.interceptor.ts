import { type CallHandler, type ExecutionContext, Injectable, Logger, type NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import * as Sentry from "@sentry/nestjs";
import { type Observable, mergeMap } from "rxjs";
import { isStaff } from "@myvisa/shared";
import { AUDIT_KEY, type AuditMeta } from "../../common/audit.decorator";
import type { AuthedRequest } from "../../common/auth.types";
import { requestMeta } from "../../common/request-meta";
import { PrismaService } from "../../infra/prisma.service";

const MUTATIONS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Writes an append-only AuditLog row for every successful mutation made by a staff member.
 * Handlers can enrich the entry through `req.audit` (e.g. the record as it was before the change).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    if (!MUTATIONS.has(req.method)) return next.handle();
    const meta = this.reflector.get<AuditMeta | undefined>(AUDIT_KEY, ctx.getHandler());

    return next.handle().pipe(
      mergeMap(async (result: unknown) => {
        const user = req.user;
        if (!user || !isStaff(user.role)) return result;
        const draft = req.audit ?? {};
        const routePath = (req.route as { path?: string } | undefined)?.path ?? req.path;
        const resultId = isRecord(result) && typeof result.id === "string" ? result.id : undefined;
        const paramId = typeof req.params.id === "string" ? req.params.id : typeof req.params.key === "string" ? req.params.key : undefined;
        try {
          await this.prisma.auditLog.create({
            data: {
              actorId: user.id,
              action: draft.action ?? meta?.action ?? `${req.method} ${routePath}`,
              entityType: draft.entityType ?? meta?.entityType ?? "Unknown",
              entityId: draft.entityId ?? resultId ?? paramId ?? null,
              before: toJson(draft.before),
              after: req.method === "DELETE" ? undefined : toJson(result),
              ...requestMeta(req),
            },
          });
        } catch (err) {
          // The change is already committed; never fail the request over the log, but make noise.
          this.logger.error(`audit write failed: ${(err as Error).message}`);
          Sentry.captureException(err);
        }
        return result;
      }),
    );
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function toJson(value: unknown) {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value)) as object;
}
