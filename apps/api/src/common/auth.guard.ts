import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AUTH_COOKIES, can, type Permission } from "@myvisa/shared";
import { PrismaService } from "../infra/prisma.service";
import { SessionService } from "../modules/auth/session.service";
import { AUTH_MODE_KEY, type AuthMode, PERMISSIONS_KEY } from "./auth.decorators";
import type { AuthedRequest } from "./auth.types";
import { Problem } from "./problem";

/**
 * Global guard. Routes are public unless decorated with @Authenticated, @OptionalAuth or @RequirePermissions.
 * Role and active status are re-read from the DB on every authenticated call, so demoting or
 * deactivating staff takes effect immediately rather than when their access token expires.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    const permissions = this.reflector.getAllAndMerge<Permission[]>(PERMISSIONS_KEY, targets) ?? [];
    const mode = this.reflector.getAllAndOverride<AuthMode | undefined>(AUTH_MODE_KEY, targets) ?? (permissions.length ? "required" : undefined);
    if (!mode) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const token = bearer(req.headers.authorization) ?? (req.cookies?.[AUTH_COOKIES.access] as string | undefined);
    const claims = token ? await this.sessions.verifyAccess(token) : null;
    if (claims) {
      const user = await this.prisma.user.findUnique({
        where: { id: claims.sub },
        select: { id: true, phone: true, role: true, fullNameAr: true, fullNameEn: true, isActive: true, deletedAt: true },
      });
      if (user?.isActive && !user.deletedAt) {
        req.user = { id: user.id, phone: user.phone, role: user.role, fullNameAr: user.fullNameAr, fullNameEn: user.fullNameEn, sessionFamily: claims.sid };
      }
    }

    if (mode === "optional") return true;
    if (!req.user) throw new Problem(HttpStatus.UNAUTHORIZED, "unauthorized", "Please sign in.");
    const missing = permissions.filter((p) => !can(req.user!.role, p));
    if (missing.length) throw new Problem(HttpStatus.FORBIDDEN, "forbidden", "You don't have permission to do this.", { missing });
    return true;
  }
}

function bearer(header: string | undefined): string | undefined {
  return header?.startsWith("Bearer ") ? header.slice(7) : undefined;
}
