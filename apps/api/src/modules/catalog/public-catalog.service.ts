import { Injectable } from "@nestjs/common";
import { calculatePrice, pickVisa, type ApplicantType, type FinderResult, type PublicCatalog, type TravelPurpose } from "@myvisa/shared";
import { Problem } from "../../common/problem";
import { PrismaService } from "../../infra/prisma.service";
import { RevalidateService } from "../revalidate/revalidate.service";
import { resolvePriceRule, toDestination, toInsurancePlan, toNationality } from "./catalog.mapper";

@Injectable()
export class PublicCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RevalidateService,
  ) {}

  /** Whole public catalog, cached in Redis until the next admin edit. */
  catalog(): Promise<PublicCatalog> {
    return this.cache.cached("catalog", () => this.load(), 600);
  }

  private async load(): Promise<PublicCatalog> {
    const now = new Date();
    const liveRule = { validFrom: { lte: now }, OR: [{ validTo: null }, { validTo: { gt: now } }] };
    const [countries, nationalities, insurance, latest] = await Promise.all([
      this.prisma.country.findMany({
        where: { isDestination: true, isActive: true },
        orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
        include: {
          insurance: { select: { attributes: true, isActive: true } },
          services: {
            where: { category: "VISA", isActive: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            include: {
              priceRules: { where: { nationalityId: null, ...liveRule }, orderBy: [{ applicantType: "asc" }] },
              requirements: { orderBy: { sortOrder: "asc" } },
            },
          },
          faqs: { where: { scope: "COUNTRY", status: "PUBLISHED" }, orderBy: { sortOrder: "asc" } },
        },
      }),
      this.prisma.country.findMany({
        where: { nationalityAr: { not: null }, isActive: true },
        orderBy: [{ nationalitySortOrder: "asc" }, { nameEn: "asc" }],
        select: { iso2: true, nationalityAr: true, nationalityEn: true },
      }),
      this.prisma.service.findMany({
        where: { category: "TRAVEL_INSURANCE", isActive: true },
        orderBy: { sortOrder: "asc" },
        include: { priceRules: { where: { nationalityId: null, ...liveRule }, orderBy: { applicantType: "asc" } } },
      }),
      this.prisma.$queryRaw<{ v: Date | null }[]>`
        SELECT GREATEST((SELECT MAX("updatedAt") FROM "Country"), (SELECT MAX("updatedAt") FROM "Service"), (SELECT MAX("updatedAt") FROM "PriceRule")) AS v`,
    ]);
    return {
      // A destination with no bookable visa would render an empty page.
      destinations: countries.map(toDestination).filter((d) => d.visas.length > 0),
      nationalities: nationalities.map(toNationality),
      insurancePlans: insurance.map(toInsurancePlan).filter((p) => p !== null),
      version: (latest[0]?.v ?? now).toISOString(),
    };
  }

  async destination(slug: string) {
    const found = (await this.catalog()).destinations.find((d) => d.slug === slug);
    if (!found) throw Problem.notFound("Destination");
    return found;
  }

  /** The finder query with `pickVisa` semantics, plus nationality-specific price overrides for residents. */
  async find(query: { to: string; applicant: ApplicantType; purpose: TravelPurpose; nationality?: string | undefined }): Promise<FinderResult> {
    const destination = await this.destination(query.to);
    const picked = pickVisa(destination.visas, query.purpose, query.applicant);
    if (!picked) throw Problem.notFound("Visa option");
    let price = picked.visa.pricing.find((p) => p.applicant === query.applicant);

    if (query.nationality && query.applicant === "RESIDENT") {
      const service = await this.prisma.service.findUnique({
        where: { slug: picked.visa.id },
        select: { priceRules: { where: { applicantType: "RESIDENT" } } },
      });
      const nationality = await this.prisma.country.findUnique({ where: { iso2: query.nationality }, select: { id: true } });
      const rule = service && nationality ? resolvePriceRule(service.priceRules, "RESIDENT", nationality.id) : undefined;
      if (rule?.nationalityId) {
        price = {
          applicant: "RESIDENT",
          eligible: rule.isEligible,
          governmentFee: rule.governmentFeeHalalas,
          serviceFee: rule.serviceFeeHalalas,
          ...(rule.governmentFeeNoteAr ? { note: { ar: rule.governmentFeeNoteAr, en: rule.governmentFeeNoteEn ?? rule.governmentFeeNoteAr } } : {}),
          ...(rule.ineligibleReasonAr ? { ineligibleReason: { ar: rule.ineligibleReasonAr, en: rule.ineligibleReasonEn ?? rule.ineligibleReasonAr } } : {}),
        };
      }
    }
    if (!price) throw Problem.notFound("Price for this applicant");

    return {
      destination: { slug: destination.slug, iso2: destination.iso2, name: destination.name },
      visa: picked.visa,
      price,
      breakdown: calculatePrice([{ governmentFee: price.governmentFee, serviceFee: price.serviceFee }]),
      fallback: picked.fallback,
    };
  }
}
