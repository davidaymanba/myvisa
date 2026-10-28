import { Injectable } from "@nestjs/common";
import type { CustomerDetail, CustomerPage, CustomerRow } from "@myvisa/shared";
import type { Prisma } from "@myvisa/db";
import { Problem } from "../../common/problem";
import { PrismaService } from "../../infra/prisma.service";
import { rowInclude, toRow } from "../admin-orders/admin-orders.service";

const PAID: Prisma.OrderWhereInput = { status: { notIn: ["DRAFT", "PENDING_PAYMENT", "CANCELLED"] }, submittedAt: { not: null } };

/** A light CRM: who our customers are, what they bought, what they agreed to. */
@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  private async rows(users: { id: string; fullNameAr: string | null; fullNameEn: string | null; phone: string; email: string | null; createdAt: Date; isActive: boolean }[]): Promise<CustomerRow[]> {
    const ids = users.map((u) => u.id);
    const [all, paid] = await Promise.all([
      this.prisma.order.groupBy({ by: ["customerId"], where: { customerId: { in: ids } }, _count: { _all: true }, _max: { createdAt: true } }),
      this.prisma.order.groupBy({ by: ["customerId"], where: { customerId: { in: ids }, ...PAID }, _count: { _all: true }, _sum: { totalHalalas: true } }),
    ]);
    return users.map((u) => {
      const a = all.find((x) => x.customerId === u.id);
      const p = paid.find((x) => x.customerId === u.id);
      return {
        id: u.id,
        name: u.fullNameAr ?? u.fullNameEn,
        phone: u.phone,
        email: u.email,
        orders: a?._count._all ?? 0,
        paidOrders: p?._count._all ?? 0,
        spentHalalas: p?._sum.totalHalalas ?? 0,
        lastOrderAt: a?._max.createdAt?.toISOString() ?? null,
        createdAt: u.createdAt.toISOString(),
        isActive: u.isActive,
      };
    });
  }

  async list(query: { q?: string; page: number; pageSize: number }): Promise<CustomerPage> {
    const q = query.q?.trim();
    const digits = q?.replace(/\D/g, "").replace(/^0/, "") ?? "";
    const where: Prisma.UserWhereInput = {
      role: "CUSTOMER",
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { fullNameAr: { contains: q, mode: "insensitive" } },
              { fullNameEn: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : []),
              { orders: { some: { number: { contains: q.toUpperCase() } } } },
            ],
          }
        : {}),
    };
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize, select: { id: true, fullNameAr: true, fullNameEn: true, phone: true, email: true, createdAt: true, isActive: true } }),
      this.prisma.user.count({ where }),
    ]);
    return { items: await this.rows(users), total, page: query.page, pageSize: query.pageSize };
  }

  async detail(id: string): Promise<CustomerDetail> {
    const user = await this.prisma.user.findFirst({
      where: { id, role: "CUSTOMER" },
      include: {
        travelers: { where: { deletedAt: null }, include: { nationality: { select: { iso2: true } } }, orderBy: { createdAt: "asc" } },
        consents: { orderBy: { createdAt: "desc" }, take: 30 },
      },
    });
    if (!user) throw Problem.notFound("Customer");
    const [row] = await this.rows([user]);
    const orders = await this.prisma.order.findMany({ where: { customerId: id }, include: rowInclude, orderBy: { createdAt: "desc" }, take: 25 });
    return {
      ...row!,
      locale: user.locale,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      travelers: user.travelers.map((t) => ({ id: t.id, name: `${t.givenNameEn} ${t.surnameEn}`, relationship: t.relationship, nationalityIso2: t.nationality.iso2, passportExpiry: t.passportExpiry.toISOString().slice(0, 10) })),
      recentOrders: orders.map(toRow),
      consents: user.consents.map((c) => ({ type: c.type, granted: c.granted, policyVersion: c.policyVersion, createdAt: c.createdAt.toISOString() })),
    };
  }
}
