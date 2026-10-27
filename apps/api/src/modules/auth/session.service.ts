import { HttpStatus, Inject, Injectable, Logger } from "@nestjs/common";
import { SignJWT, jwtVerify } from "jose";
import type { AccessTokenClaims, UserRole } from "@myvisa/shared";
import { ENV, type Env } from "../../config/env";
import { keyedHash, randomToken } from "../../common/crypto";
import { Problem } from "../../common/problem";
import type { RequestMeta } from "../../common/request-meta";
import { PrismaService } from "../../infra/prisma.service";
import { RedisService } from "../../infra/redis.service";
import { createId } from "./ids";

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  refreshExpiresAt: Date;
  userId: string;
}

/** A concurrent refresh from a second tab within this window is not treated as token theft. */
const ROTATION_GRACE_MS = 10_000;

/**
 * Refresh tokens rotate on every use. Sessions that share a `familyId` descend from one login;
 * presenting an already-rotated token (outside the grace window) means it leaked, so the whole family is revoked.
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly secret: Uint8Array;

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    this.secret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
  }

  private hash = (token: string) => keyedHash(this.env.HASH_PEPPER, `rt:${token}`);
  private revokedKey = (familyId: string) => `auth:revoked:${familyId}`;

  async signAccess(claims: AccessTokenClaims): Promise<string> {
    return new SignJWT({ role: claims.role, sid: claims.sid })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(claims.sub)
      .setIssuedAt()
      .setIssuer("myvisa-api")
      .setAudience("myvisa")
      .setExpirationTime(`${this.env.JWT_ACCESS_TTL_SECONDS}s`)
      .sign(this.secret);
  }

  async verifyAccess(token: string): Promise<AccessTokenClaims | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret, { issuer: "myvisa-api", audience: "myvisa", algorithms: ["HS256"] });
      if (typeof payload.sub !== "string" || typeof payload.sid !== "string" || typeof payload.role !== "string") return null;
      if (await this.redis.exists(this.revokedKey(payload.sid))) return null;
      return { sub: payload.sub, sid: payload.sid, role: payload.role as UserRole };
    } catch {
      return null;
    }
  }

  async create(user: { id: string; role: UserRole }, meta: RequestMeta, familyId = createId()): Promise<IssuedTokens> {
    const refreshToken = randomToken();
    const refreshExpiresAt = new Date(Date.now() + this.env.REFRESH_TTL_DAYS * 86_400_000);
    const session = await this.prisma.session.create({
      data: { userId: user.id, familyId, refreshTokenHash: this.hash(refreshToken), expiresAt: refreshExpiresAt, ip: meta.ip, userAgent: meta.userAgent },
    });
    return {
      accessToken: await this.signAccess({ sub: user.id, role: user.role, sid: session.familyId }),
      refreshToken,
      csrfToken: randomToken(24),
      refreshExpiresAt,
      userId: user.id,
    };
  }

  async rotate(refreshToken: string, meta: RequestMeta): Promise<IssuedTokens> {
    const session = await this.prisma.session.findUnique({ where: { refreshTokenHash: this.hash(refreshToken) }, include: { user: true } });
    if (!session) throw unauthorized("unauthorized");

    const { user } = session;
    if (!user.isActive || user.deletedAt) {
      await this.revokeFamily(session.familyId);
      throw unauthorized("session_revoked");
    }
    if (session.revokedAt) {
      const benign = session.replacedById && Date.now() - session.revokedAt.getTime() < ROTATION_GRACE_MS;
      if (!benign) {
        this.logger.warn(`refresh token reuse for user ${session.userId}; revoking family ${session.familyId}`);
        await this.revokeFamily(session.familyId);
        throw unauthorized("session_revoked");
      }
      return this.create(user, meta, session.familyId);
    }
    if (session.expiresAt < new Date()) throw unauthorized("unauthorized");

    const next = await this.create(user, meta, session.familyId);
    // Only one rotation can win; a loser falls into the grace path above on its next attempt.
    const nextSession = await this.prisma.session.findUniqueOrThrow({ where: { refreshTokenHash: this.hash(next.refreshToken) }, select: { id: true } });
    const { count } = await this.prisma.session.updateMany({ where: { id: session.id, revokedAt: null }, data: { revokedAt: new Date(), replacedById: nextSession.id } });
    if (count === 0) {
      await this.prisma.session.update({ where: { id: nextSession.id }, data: { revokedAt: new Date() } });
      return this.rotate(refreshToken, meta);
    }
    return next;
  }

  /** Logout: revoke the whole chain so stolen copies of older tokens die too. */
  async revokeByToken(refreshToken: string): Promise<void> {
    const session = await this.prisma.session.findUnique({ where: { refreshTokenHash: this.hash(refreshToken) }, select: { familyId: true } });
    if (session) await this.revokeFamily(session.familyId);
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.session.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: new Date() } });
    // Access tokens are stateless; block the family until the longest-lived one has expired.
    await this.redis.set(this.revokedKey(familyId), "1", "EX", this.env.JWT_ACCESS_TTL_SECONDS + 60);
  }
}

function unauthorized(code: "unauthorized" | "session_revoked") {
  return new Problem(HttpStatus.UNAUTHORIZED, code, code === "session_revoked" ? "Your session was ended. Please sign in again." : "Please sign in.");
}
