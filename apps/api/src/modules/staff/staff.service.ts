import { HttpStatus, Injectable } from "@nestjs/common";
import { STAFF_ROLES, type StaffMember, type UserRole } from "@myvisa/shared";
import { Prisma } from "@myvisa/db";
import type { RequestUser } from "../../common/auth.types";
import { Problem } from "../../common/problem";
import { PrismaService } from "../../infra/prisma.service";
import { SessionService } from "../auth/session.service";

const OPEN: Prisma.OrderWhereInput = { status: { notIn: ["DRAFT", "PENDING_PAYMENT", "DELIVERED", "CANCELLED", "REFUNDED"] } };

/**
 * Staff and roles. Staff sign in with the same phone OTP as customers; their role decides what they see.
 * Guard rails: nobody changes their own role or switches themselves off, and there is always an active super admin.
 */
@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
  ) {}

  async list(): Promise<StaffMember[]> {
    const users = await this.prisma.user.findMany({
      where: { role: { in: [...STAFF_ROLES] }, deletedAt: null },
      include: { _count: { select: { assignedOrders: { where: OPEN } } } },
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    });
    return users.map((u) => ({
      id: u.id,
      phone: u.phone,
      fullNameAr: u.fullNameAr,
      fullNameEn: u.fullNameEn,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      openOrders: u._count.assignedOrders,
      createdAt: u.createdAt.toISOString(),
    }));
  }

  private async one(id: string) {
    return (await this.list()).find((m) => m.id === id) ?? null;
  }

  /** Adds a staff member by phone (promoting an existing customer account if there is one). */
  async invite(input: { phone: string; role: (typeof STAFF_ROLES)[number]; fullNameAr: string | null; fullNameEn: string | null; email: string | null }) {
    try {
      const user = await this.prisma.user.upsert({
        where: { phone: input.phone },
        create: { phone: input.phone, role: input.role, fullNameAr: input.fullNameAr, fullNameEn: input.fullNameEn, email: input.email },
        update: { role: input.role, isActive: true, deletedAt: null, ...(input.fullNameAr ? { fullNameAr: input.fullNameAr } : {}), ...(input.fullNameEn ? { fullNameEn: input.fullNameEn } : {}), ...(input.email ? { email: input.email } : {}) },
      });
      return (await this.one(user.id))!;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") throw new Problem(HttpStatus.CONFLICT, "email_taken", "This email is used by another account.", { errors: [{ path: "email", code: "custom", message: "email_taken" }] });
      throw err;
    }
  }

  async update(actor: RequestUser, id: string, input: { role: UserRole; isActive: boolean }) {
    const target = await this.prisma.user.findUnique({ where: { id }, select: { id: true, role: true, isActive: true } });
    if (!target || target.role === "CUSTOMER") throw Problem.notFound("Staff member");
    if (id === actor.id && (input.role !== target.role || !input.isActive)) throw Problem.conflict("self_change", "You can't change your own role or switch yourself off.");
    const losesSuperAdmin = target.role === "SUPER_ADMIN" && target.isActive && (input.role !== "SUPER_ADMIN" || !input.isActive);
    if (losesSuperAdmin && (await this.prisma.user.count({ where: { role: "SUPER_ADMIN", isActive: true, deletedAt: null } })) <= 1) {
      throw Problem.conflict("last_super_admin", "Keep at least one active super admin.");
    }
    await this.prisma.user.update({ where: { id }, data: { role: input.role, isActive: input.isActive } });
    // Off the team, or off the platform: their open orders go back to the queue and their sessions end.
    if (input.role === "CUSTOMER" || !input.isActive) {
      await this.prisma.order.updateMany({ where: { assigneeId: id, ...OPEN }, data: { assigneeId: null } });
      await this.sessions.revokeAllForUser(id);
    }
    return input.role === "CUSTOMER" ? { id, role: "CUSTOMER" as const } : (await this.one(id))!;
  }
}
