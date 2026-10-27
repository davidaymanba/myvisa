import { HttpStatus, Injectable } from "@nestjs/common";
import { ROLE_PERMISSIONS, type AuthUser } from "@myvisa/shared";
import type { User } from "@myvisa/db";
import { Problem } from "../../common/problem";
import type { RequestMeta } from "../../common/request-meta";
import { PrismaService } from "../../infra/prisma.service";
import { OtpService } from "./otp.service";
import { type IssuedTokens, SessionService } from "./session.service";

export function toAuthUser(user: Pick<User, "id" | "phone" | "role" | "fullNameAr" | "fullNameEn">): AuthUser {
  return { id: user.id, phone: user.phone, role: user.role, fullNameAr: user.fullNameAr, fullNameEn: user.fullNameEn, permissions: [...ROLE_PERMISSIONS[user.role]] };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly otp: OtpService,
    private readonly sessions: SessionService,
    private readonly prisma: PrismaService,
  ) {}

  requestLoginCode(phone: string, meta: RequestMeta) {
    return this.otp.request(phone, "LOGIN", meta);
  }

  /** Verifies the code, creates the customer account on first sign-in, and opens a session. */
  async verifyLogin(phone: string, code: string, meta: RequestMeta): Promise<{ user: AuthUser; tokens: IssuedTokens }> {
    await this.otp.verify(phone, code, "LOGIN");
    const now = new Date();
    const user = await this.prisma.user.upsert({
      where: { phone },
      create: { phone, phoneVerified: now, lastLoginAt: now },
      update: { phoneVerified: now, lastLoginAt: now },
    });
    if (!user.isActive || user.deletedAt) throw new Problem(HttpStatus.FORBIDDEN, "account_disabled", "This account is disabled.");
    const tokens = await this.sessions.create(user, meta);
    return { user: toAuthUser(user), tokens };
  }

  async refresh(refreshToken: string, meta: RequestMeta): Promise<{ user: AuthUser; tokens: IssuedTokens }> {
    const tokens = await this.sessions.rotate(refreshToken, meta);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: tokens.userId } });
    return { user: toAuthUser(user), tokens };
  }

  logout(refreshToken: string) {
    return this.sessions.revokeByToken(refreshToken);
  }
}
