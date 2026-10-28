import type { OrderDocumentView, OrderRequirementView, OrderTravelerView, OrderView, PaymentProviderName } from "@myvisa/shared";
import type { Prisma } from "@myvisa/db";
import { PiiService } from "../../common/pii.service";

export const orderInclude = {
  service: {
    include: {
      country: { select: { slug: true, iso2: true, nameAr: true, nameEn: true, imageId: true, mainAirportIata: true } },
      requirements: { orderBy: { sortOrder: "asc" } },
    },
  },
  travelers: { orderBy: { sortOrder: "asc" }, include: { nationality: { select: { iso2: true } } } },
  documents: { include: { document: true }, orderBy: { createdAt: "asc" } },
  coupon: { select: { code: true } },
  payments: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, status: true, provider: true } },
  events: { orderBy: { createdAt: "desc" }, take: 1, select: { customerNote: true } },
} satisfies Prisma.OrderInclude;

export type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** Requirements that apply to this traveller (null applicant type = everyone). */
export function requirementsFor(requirements: OrderWithRelations["service"]["requirements"], applicantType: string) {
  return requirements.filter((r) => r.perTraveler && (!r.applicantType || r.applicantType === applicantType));
}

/**
 * Every required slot (per traveller or per order) has at least one uploaded, clean file.
 * With `excludeRejected`, files staff rejected don't count (used before resubmitting an ACTION_REQUIRED order).
 */
export function documentsComplete(order: OrderWithRelations, options: { excludeRejected?: boolean } = {}): boolean {
  const ok = (requirementId: string, travelerId: string | null) =>
    order.documents.some(
      (d) =>
        d.requirementId === requirementId &&
        d.orderTravelerId === travelerId &&
        d.document.uploadedAt &&
        d.document.scanStatus === "CLEAN" &&
        !d.document.deletedAt &&
        !(options.excludeRejected && d.reviewStatus === "REJECTED"),
    );
  for (const r of order.service.requirements.filter((x) => x.isRequired)) {
    if (r.perTraveler) {
      for (const t of order.travelers) if ((!r.applicantType || r.applicantType === t.applicantType) && !ok(r.id, t.id)) return false;
    } else if (!ok(r.id, null)) return false;
  }
  return true;
}

export function toOrderView(order: OrderWithRelations, pii: PiiService): OrderView {
  const { service } = order;
  const travelers: OrderTravelerView[] = order.travelers.map((t) => ({
    id: t.id,
    relationship: t.relationship,
    givenNameEn: t.givenNameEn,
    surnameEn: t.surnameEn,
    fullNameAr: t.fullNameAr,
    gender: t.gender,
    dateOfBirth: day(t.dateOfBirth)!,
    nationalityIso2: t.nationality.iso2,
    applicantType: t.applicantType as OrderTravelerView["applicantType"],
    passportNumberMasked: PiiService.mask(pii.decrypt(t.passportNumberEnc)),
    passportExpiry: day(t.passportExpiry)!,
    governmentFee: t.governmentFeeHalalas,
    serviceFee: t.serviceFeeHalalas,
  }));
  const requirements: OrderRequirementView[] = service.requirements.map((r) => ({
    id: r.id,
    documentType: r.documentType as OrderRequirementView["documentType"],
    title: { ar: r.titleAr, en: r.titleEn },
    details: r.detailsAr ? { ar: r.detailsAr, en: r.detailsEn ?? r.detailsAr } : null,
    isRequired: r.isRequired,
    perTraveler: r.perTraveler,
    applicantType: r.applicantType as OrderRequirementView["applicantType"],
    acceptedMime: r.acceptedMime,
    maxSizeMb: r.maxSizeMb,
  }));
  const documents: OrderDocumentView[] = order.documents
    .filter((d) => !d.document.deletedAt)
    .map((d) => ({
      id: d.id,
      requirementId: d.requirementId,
      orderTravelerId: d.orderTravelerId,
      reviewStatus: d.reviewStatus,
      rejectionReason: d.rejectionReason,
      document: {
        id: d.document.id,
        originalName: d.document.originalName,
        mimeType: d.document.mimeType,
        sizeBytes: d.document.sizeBytes,
        scanStatus: d.document.scanStatus,
        uploaded: Boolean(d.document.uploadedAt),
        createdAt: d.document.createdAt.toISOString(),
      },
    }));
  const payment = order.payments[0];
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    locale: order.locale,
    service: {
      slug: service.slug,
      name: { ar: service.nameAr, en: service.nameEn },
      purpose: service.purpose as OrderView["service"]["purpose"],
      visaKind: service.visaKind as OrderView["service"]["visaKind"],
      processingDays: [service.processingDaysMin, service.processingDaysMax],
      requiresAppointment: service.requiresAppointment,
      destination: service.country
        ? { slug: service.country.slug, iso2: service.country.iso2.toLowerCase(), name: { ar: service.country.nameAr, en: service.country.nameEn }, imageId: service.country.imageId, iata: service.country.mainAirportIata }
        : null,
    },
    travelFrom: day(order.travelFrom),
    travelTo: day(order.travelTo),
    preferredCity: order.preferredCity as OrderView["preferredCity"],
    preferredDateFrom: day(order.preferredDateFrom),
    preferredDateTo: day(order.preferredDateTo),
    appointmentNotes: order.appointmentNotes,
    travelers,
    requirements,
    documents,
    documentsComplete: documentsComplete(order, { excludeRejected: order.status === "ACTION_REQUIRED" }),
    statusNote: order.events[0]?.customerNote ?? null,
    price: {
      governmentFees: order.governmentFeesHalalas,
      serviceFees: order.serviceFeesHalalas,
      discount: order.discountHalalas,
      vat: order.vatHalalas,
      total: order.totalHalalas,
      vatRate: order.vatRate,
    },
    coupon: order.coupon ? { code: order.coupon.code } : null,
    payment: payment ? { id: payment.id, status: payment.status, provider: payment.provider.toLowerCase() as PaymentProviderName } : null,
    createdAt: order.createdAt.toISOString(),
    submittedAt: order.submittedAt?.toISOString() ?? null,
  };
}
