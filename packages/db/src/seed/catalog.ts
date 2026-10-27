import {
  DEFAULT_SETTINGS,
  DESTINATIONS,
  INSURANCE_PLANS,
  NATIONALITIES,
  PLACEHOLDER_TESTIMONIALS,
  SERVICE_CATEGORIES,
  SETTING_KEYS,
  type Destination,
  type InsurancePlanId,
  type ServiceCategory as ShowcaseCategory,
} from "@myvisa/shared";
import type { Prisma, PrismaClient, ServiceCategory } from "../generated/prisma/client";

/** Slug of the travel-insurance service that represents a shared `InsurancePlan`. */
export const insuranceSlug = (id: InsurancePlanId) => `insurance-${id.toLowerCase().replace(/_/g, "-")}`;

/** Orderable non-visa services, seeded from the services showcase. Insurance plans are seeded separately. */
const PRODUCT_CATEGORIES: Partial<Record<ShowcaseCategory, { category: ServiceCategory; processing: [number, number] }>> = {
  "driving-license": { category: "DRIVING_LICENSE", processing: [1, 1] },
  translation: { category: "TRANSLATION", processing: [1, 3] },
  "document-shipping": { category: "DOCUMENT_SHIPPING", processing: [1, 1] },
};

const regionNames = { ar: new Intl.DisplayNames(["ar"], { type: "region" }), en: new Intl.DisplayNames(["en"], { type: "region" }) };
const kebab = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

type Tx = Prisma.TransactionClient;

async function seedInsurance(tx: Tx): Promise<Map<InsurancePlanId, string>> {
  const ids = new Map<InsurancePlanId, string>();
  for (const [i, plan] of INSURANCE_PLANS.entries()) {
    const data = {
      category: "TRAVEL_INSURANCE" as const,
      nameAr: plan.name.ar,
      nameEn: plan.name.en,
      summaryAr: plan.coverage.ar,
      summaryEn: plan.coverage.en,
      processingDaysMin: 0,
      processingDaysMax: 0,
      attributes: { planId: plan.id, medicalCover: plan.medicalCover, embassyAccepted: plan.embassyAccepted, highlights: plan.highlights.map((h) => ({ ...h })), pricing: "per_week" },
      sortOrder: i,
      isActive: true,
    };
    const service = await tx.service.upsert({ where: { slug: insuranceSlug(plan.id) }, create: { slug: insuranceSlug(plan.id), ...data }, update: data });
    await tx.priceRule.deleteMany({ where: { serviceId: service.id } });
    await tx.priceRule.createMany({
      data: (["SAUDI_CITIZEN", "RESIDENT"] as const).map((applicantType) => ({ serviceId: service.id, applicantType, governmentFeeHalalas: 0, serviceFeeHalalas: plan.pricePerWeek })),
    });
    ids.set(plan.id, service.id);
  }
  return ids;
}

async function seedProducts(tx: Tx) {
  for (const [i, info] of SERVICE_CATEGORIES.entries()) {
    const product = PRODUCT_CATEGORIES[info.slug];
    if (!product) continue;
    const data = {
      category: product.category,
      nameAr: info.name.ar,
      nameEn: info.name.en,
      summaryAr: info.tagline.ar,
      summaryEn: info.tagline.en,
      descriptionAr: info.description.ar,
      descriptionEn: info.description.en,
      processingDaysMin: product.processing[0],
      processingDaysMax: product.processing[1],
      attributes: { icon: info.icon, turnaround: { ...info.turnaround } },
      sortOrder: i,
      isActive: true,
    };
    const service = await tx.service.upsert({ where: { slug: info.slug }, create: { slug: info.slug, ...data }, update: data });
    await tx.priceRule.deleteMany({ where: { serviceId: service.id } });
    await tx.priceRule.createMany({
      data: (["SAUDI_CITIZEN", "RESIDENT"] as const).map((applicantType) => ({ serviceId: service.id, applicantType, governmentFeeHalalas: 0, serviceFeeHalalas: info.fromPrice })),
    });
  }
}

function countryData(d: Destination, sortOrder: number, insurance: Map<InsurancePlanId, string>) {
  return {
    slug: d.slug,
    nameAr: d.name.ar,
    nameEn: d.name.en,
    region: d.region,
    isDestination: true,
    isPopular: d.popular,
    isSchengen: d.schengen,
    sortOrder,
    imageId: d.imageId,
    imageAltAr: d.imageAlt.ar,
    imageAltEn: d.imageAlt.en,
    mainAirportIata: d.iata,
    latitude: d.lat,
    longitude: d.lon,
    capitalAr: d.capital.ar,
    capitalEn: d.capital.en,
    taglineAr: d.tagline.ar,
    taglineEn: d.tagline.en,
    overviewAr: d.overview.ar,
    overviewEn: d.overview.en,
    bestTimeAr: d.bestTime.ar,
    bestTimeEn: d.bestTime.en,
    flightHours: d.flightHours,
    currency: d.currency,
    insuranceServiceId: d.insurance ? (insurance.get(d.insurance) ?? null) : null,
    isActive: true,
  };
}

async function seedDestination(tx: Tx, d: Destination, sortOrder: number, insurance: Map<InsurancePlanId, string>) {
  const data = countryData(d, sortOrder, insurance);
  const country = await tx.country.upsert({ where: { iso2: d.iso2.toUpperCase() }, create: { iso2: d.iso2.toUpperCase(), ...data }, update: data });

  // Visas no longer in the catalog are deactivated, never deleted (orders may reference them).
  await tx.service.updateMany({ where: { countryId: country.id, category: "VISA", slug: { notIn: d.visas.map((v) => v.id) } }, data: { isActive: false } });

  for (const [i, v] of d.visas.entries()) {
    const service = {
      category: "VISA" as const,
      nameAr: v.name.ar,
      nameEn: v.name.en,
      countryId: country.id,
      purpose: v.purpose,
      visaKind: v.kind,
      entryType: v.entry,
      validityDays: v.validityDays,
      maxStayDays: v.maxStayDays,
      processingDaysMin: v.processingDays[0],
      processingDaysMax: v.processingDays[1],
      requiresAppointment: v.appointment,
      appointmentNoteAr: v.appointmentNote?.ar ?? null,
      appointmentNoteEn: v.appointmentNote?.en ?? null,
      isActive: true,
      sortOrder: i,
    };
    const row = await tx.service.upsert({ where: { slug: v.id }, create: { slug: v.id, ...service }, update: service });

    await tx.priceRule.deleteMany({ where: { serviceId: row.id } });
    await tx.priceRule.createMany({
      data: v.pricing.map((p) => ({
        serviceId: row.id,
        applicantType: p.applicant,
        isEligible: p.eligible,
        governmentFeeHalalas: p.governmentFee,
        serviceFeeHalalas: p.serviceFee,
        governmentFeeNoteAr: p.note?.ar ?? null,
        governmentFeeNoteEn: p.note?.en ?? null,
        ineligibleReasonAr: p.ineligibleReason?.ar ?? null,
        ineligibleReasonEn: p.ineligibleReason?.en ?? null,
      })),
    });

    await tx.requirement.deleteMany({ where: { serviceId: row.id } });
    await tx.requirement.createMany({
      data: v.requirements.map((r, sort) => ({
        serviceId: row.id,
        applicantType: r.applicant ?? null,
        documentType: r.doc,
        titleAr: r.title.ar,
        titleEn: r.title.en,
        detailsAr: r.details?.ar ?? null,
        detailsEn: r.details?.en ?? null,
        isRequired: !r.optional,
        perTraveler: !["HOTEL_BOOKING", "FLIGHT_BOOKING", "INVITATION_LETTER", "FAMILY_RECORD"].includes(r.doc),
        sortOrder: sort,
      })),
    });
  }

  await tx.faq.deleteMany({ where: { scope: "COUNTRY", countryId: country.id } });
  await tx.faq.createMany({
    data: d.faqs.map((f, i) => ({ scope: "COUNTRY" as const, countryId: country.id, questionAr: f.q.ar, questionEn: f.q.en, answerAr: f.a.ar, answerEn: f.a.en, sortOrder: i })),
  });
}

async function seedNationalities(tx: Tx) {
  for (const [i, n] of NATIONALITIES.entries()) {
    const existing = await tx.country.findUnique({ where: { iso2: n.iso2 } });
    const nationality = { nationalityAr: n.name.ar, nationalityEn: n.name.en, nationalitySortOrder: i };
    if (existing) {
      await tx.country.update({ where: { id: existing.id }, data: nationality });
      continue;
    }
    const nameEn = regionNames.en.of(n.iso2) ?? n.name.en;
    await tx.country.create({
      data: { iso2: n.iso2, slug: kebab(nameEn), nameAr: regionNames.ar.of(n.iso2) ?? n.name.ar, nameEn, isDestination: false, ...nationality },
    });
  }
}

export interface SeedOptions {
  /** Phone (E.164) of the first SUPER_ADMIN. */
  adminPhone?: string;
}

/**
 * Brings the catalog in line with packages/shared, so the DB and the website start identical.
 * Catalog rows are overwritten (idempotent); settings and testimonials are only created when missing,
 * so re-running never clobbers what the team edited in the admin.
 */
export async function seedDatabase(prisma: PrismaClient, options: SeedOptions = {}) {
  await prisma.$transaction(
    async (tx) => {
      const insurance = await seedInsurance(tx);
      await seedProducts(tx);
      for (const [i, d] of DESTINATIONS.entries()) await seedDestination(tx, d, i, insurance);
      await seedNationalities(tx);

      for (const key of SETTING_KEYS) {
        await tx.setting.upsert({ where: { key }, create: { key, value: DEFAULT_SETTINGS[key] }, update: {} });
      }

      if ((await tx.testimonial.count()) === 0) {
        await tx.testimonial.createMany({
          data: PLACEHOLDER_TESTIMONIALS.map((t, i) => ({
            authorNameAr: t.name.ar,
            authorNameEn: t.name.en,
            cityAr: t.city.ar,
            cityEn: t.city.en,
            serviceLabelAr: t.service.ar,
            serviceLabelEn: t.service.en,
            quoteAr: t.quote.ar,
            quoteEn: t.quote.en,
            rating: t.rating,
            // PLACEHOLDER: shown so the site matches Phase 2; unpublish once real reviews exist.
            isPlaceholder: true,
            status: "PUBLISHED",
            sortOrder: i,
          })),
        });
      }

      if (options.adminPhone) {
        await tx.user.upsert({
          where: { phone: options.adminPhone },
          create: { phone: options.adminPhone, role: "SUPER_ADMIN", fullNameAr: "مدير النظام", fullNameEn: "System admin" },
          update: { role: "SUPER_ADMIN", isActive: true },
        });
      }
    },
    { timeout: 120_000, maxWait: 10_000 },
  );
}
