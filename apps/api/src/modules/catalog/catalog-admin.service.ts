import { HttpStatus, Injectable } from "@nestjs/common";
import type { CountryData, FaqData, PriceRuleData, RequirementData, ServiceData } from "@myvisa/shared";
import { Prisma } from "@myvisa/db";
import { Problem } from "../../common/problem";
import { PrismaService } from "../../infra/prisma.service";
import { RevalidateService } from "../revalidate/revalidate.service";

const countryRef = { select: { id: true, slug: true, iso2: true, nameAr: true, nameEn: true } } as const;

const serviceInclude = {
  country: countryRef,
  priceRules: { include: { nationality: countryRef }, orderBy: [{ applicantType: "asc" }, { nationalityId: { sort: "asc", nulls: "first" } }] },
  requirements: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.ServiceInclude;

const json = (v: Record<string, unknown> | null) => (v === null ? Prisma.DbNull : (v as Prisma.InputJsonObject));

/**
 * Catalog CMS. Every write invalidates the public catalog cache and asks the website to revalidate.
 * Business rules enforced here (not only in the UI):
 * - VISA_FREE services carry no service fee.
 * - One live rule per (service, applicant type, nationality).
 * - Records referenced by orders are deactivated, never deleted.
 */
@Injectable()
export class CatalogAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidate: RevalidateService,
  ) {}

  private changed() {
    return this.revalidate.invalidate("catalog");
  }

  // ── Countries ──────────────────────────────────────────────────────────────

  async listCountries(filter: { q?: string; kind?: "destination" | "nationality" | "all" }) {
    const where: Prisma.CountryWhereInput = {
      ...(filter.kind === "destination" ? { isDestination: true } : filter.kind === "nationality" ? { nationalityAr: { not: null } } : {}),
      ...(filter.q
        ? { OR: [{ nameAr: { contains: filter.q, mode: "insensitive" } }, { nameEn: { contains: filter.q, mode: "insensitive" } }, { iso2: { equals: filter.q.toUpperCase() } }] }
        : {}),
    };
    const rows = await this.prisma.country.findMany({
      where,
      orderBy: [{ isDestination: "desc" }, { sortOrder: "asc" }, { nameEn: "asc" }],
      select: {
        id: true,
        slug: true,
        iso2: true,
        nameAr: true,
        nameEn: true,
        region: true,
        isDestination: true,
        isPopular: true,
        isActive: true,
        sortOrder: true,
        imageId: true,
        updatedAt: true,
        _count: { select: { services: { where: { isActive: true } } } },
      },
    });
    return rows.map(({ _count, ...c }) => ({ ...c, serviceCount: _count.services }));
  }

  async getCountry(id: string) {
    const country = await this.prisma.country.findUnique({
      where: { id },
      include: {
        services: { include: serviceInclude, orderBy: [{ category: "asc" }, { sortOrder: "asc" }] },
        faqs: { where: { scope: "COUNTRY" }, orderBy: { sortOrder: "asc" } },
      },
    });
    if (!country) throw Problem.notFound("Country");
    return country;
  }

  async createCountry(data: CountryData) {
    const row = await this.prisma.country.create({ data });
    await this.changed();
    return row;
  }

  async updateCountry(id: string, data: CountryData) {
    const row = await this.prisma.country.update({ where: { id }, data });
    await this.changed();
    return row;
  }

  async deleteCountry(id: string) {
    const refs = await this.prisma.country.findUnique({
      where: { id },
      select: { _count: { select: { services: true, orders: true, travelers: true, orderTravelers: true, priceRules: true } } },
    });
    if (!refs) throw Problem.notFound("Country");
    if (Object.values(refs._count).some((n) => n > 0)) {
      throw Problem.conflict("in_use", "This country has services, orders or travellers. Deactivate it instead.");
    }
    await this.prisma.country.delete({ where: { id } });
    await this.changed();
  }

  async reorderCountries(ids: string[]) {
    await this.prisma.$transaction(ids.map((id, sortOrder) => this.prisma.country.update({ where: { id }, data: { sortOrder } })));
    await this.changed();
  }

  // ── Services ───────────────────────────────────────────────────────────────

  listServices(filter: { countryId?: string; category?: ServiceData["category"] }) {
    return this.prisma.service.findMany({
      where: { ...(filter.countryId ? { countryId: filter.countryId } : {}), ...(filter.category ? { category: filter.category } : {}) },
      include: serviceInclude,
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });
  }

  async getService(id: string) {
    const service = await this.prisma.service.findUnique({ where: { id }, include: serviceInclude });
    if (!service) throw Problem.notFound("Service");
    return service;
  }

  async createService(data: ServiceData) {
    const row = await this.prisma.service.create({ data: { ...data, attributes: json(data.attributes) }, include: serviceInclude });
    await this.changed();
    return row;
  }

  async updateService(id: string, data: ServiceData) {
    if (data.visaKind === "VISA_FREE") {
      const charging = await this.prisma.priceRule.count({ where: { serviceId: id, serviceFeeHalalas: { gt: 0 } } });
      if (charging > 0) throw visaFreeFee();
    }
    const row = await this.prisma.service.update({ where: { id }, data: { ...data, attributes: json(data.attributes) }, include: serviceInclude });
    await this.changed();
    return row;
  }

  async deleteService(id: string) {
    const orders = await this.prisma.order.count({ where: { serviceId: id } });
    if (orders > 0) throw Problem.conflict("in_use", "Orders reference this service. Deactivate it instead.");
    await this.prisma.service.delete({ where: { id } });
    await this.changed();
  }

  // ── Price rules ────────────────────────────────────────────────────────────

  private async assertRuleAllowed(serviceId: string, data: PriceRuleData, ignoreId?: string) {
    const service = await this.prisma.service.findUnique({ where: { id: serviceId }, select: { visaKind: true } });
    if (!service) throw Problem.notFound("Service");
    if (service.visaKind === "VISA_FREE" && data.serviceFeeHalalas > 0) throw visaFreeFee();
    const duplicate = await this.prisma.priceRule.findFirst({
      where: { serviceId, applicantType: data.applicantType, nationalityId: data.nationalityId, validTo: null, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
      select: { id: true },
    });
    if (duplicate) throw Problem.conflict("duplicate_rule", "A rule for this applicant type and nationality already exists.");
  }

  getPriceRule(id: string) {
    return this.prisma.priceRule.findUniqueOrThrow({ where: { id }, include: { nationality: countryRef } });
  }

  async createPriceRule(serviceId: string, data: PriceRuleData) {
    await this.assertRuleAllowed(serviceId, data);
    const row = await this.prisma.priceRule.create({ data: { ...data, serviceId }, include: { nationality: countryRef } });
    await this.changed();
    return row;
  }

  async updatePriceRule(id: string, data: PriceRuleData) {
    const existing = await this.prisma.priceRule.findUnique({ where: { id }, select: { serviceId: true } });
    if (!existing) throw Problem.notFound("Price rule");
    await this.assertRuleAllowed(existing.serviceId, data, id);
    const row = await this.prisma.priceRule.update({ where: { id }, data, include: { nationality: countryRef } });
    await this.changed();
    return row;
  }

  async deletePriceRule(id: string) {
    await this.prisma.priceRule.delete({ where: { id } });
    await this.changed();
  }

  // ── Requirements ───────────────────────────────────────────────────────────

  getRequirement(id: string) {
    return this.prisma.requirement.findUniqueOrThrow({ where: { id } });
  }

  async createRequirement(serviceId: string, data: RequirementData) {
    const last = await this.prisma.requirement.aggregate({ where: { serviceId }, _max: { sortOrder: true } });
    const row = await this.prisma.requirement.create({ data: { ...data, serviceId, sortOrder: data.sortOrder || (last._max.sortOrder ?? -1) + 1 } });
    await this.changed();
    return row;
  }

  async updateRequirement(id: string, data: RequirementData) {
    const row = await this.prisma.requirement.update({ where: { id }, data });
    await this.changed();
    return row;
  }

  async deleteRequirement(id: string) {
    await this.prisma.requirement.delete({ where: { id } });
    await this.changed();
  }

  async reorderRequirements(serviceId: string, ids: string[]) {
    const owned = await this.prisma.requirement.count({ where: { serviceId, id: { in: ids } } });
    if (owned !== ids.length) throw new Problem(HttpStatus.UNPROCESSABLE_ENTITY, "invalid_ids", "Every id must belong to this service.");
    await this.prisma.$transaction(ids.map((id, sortOrder) => this.prisma.requirement.update({ where: { id }, data: { sortOrder } })));
    await this.changed();
    return this.prisma.requirement.findMany({ where: { serviceId }, orderBy: { sortOrder: "asc" } });
  }

  // ── FAQs ───────────────────────────────────────────────────────────────────

  listFaqs(filter: { scope?: FaqData["scope"]; countryId?: string; serviceId?: string }) {
    return this.prisma.faq.findMany({
      where: { ...(filter.scope ? { scope: filter.scope } : {}), ...(filter.countryId ? { countryId: filter.countryId } : {}), ...(filter.serviceId ? { serviceId: filter.serviceId } : {}) },
      orderBy: [{ scope: "asc" }, { sortOrder: "asc" }],
    });
  }

  getFaq(id: string) {
    return this.prisma.faq.findUniqueOrThrow({ where: { id } });
  }

  async createFaq(data: FaqData) {
    const row = await this.prisma.faq.create({ data });
    await this.changed();
    return row;
  }

  async updateFaq(id: string, data: FaqData) {
    const row = await this.prisma.faq.update({ where: { id }, data });
    await this.changed();
    return row;
  }

  async deleteFaq(id: string) {
    await this.prisma.faq.delete({ where: { id } });
    await this.changed();
  }
}

function visaFreeFee() {
  return new Problem(HttpStatus.UNPROCESSABLE_ENTITY, "visa_free_fee", "Visa-free options carry no service fee.");
}
