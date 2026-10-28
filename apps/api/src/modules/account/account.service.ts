import { HttpStatus, Injectable } from "@nestjs/common";
import type { AccountSummary, ProfileView, SavedTravelerView, TravelerData, TravelerInput } from "@myvisa/shared";
import { Prisma } from "@myvisa/db";
import type { RequestUser } from "../../common/auth.types";
import { PiiService } from "../../common/pii.service";
import { Problem } from "../../common/problem";
import type { RequestMeta } from "../../common/request-meta";
import { PrismaService } from "../../infra/prisma.service";
import { SettingsService } from "../settings/settings.service";

const ACTIVE = ["RECEIVED", "DOCUMENTS_REVIEW", "ACTION_REQUIRED", "APPOINTMENT_BOOKED", "SUBMITTED_TO_EMBASSY", "DECISION_ISSUED"] as const;
const date = (d: string) => new Date(`${d}T00:00:00.000Z`);
const day = (d: Date) => d.toISOString().slice(0, 10);
const SIX_MONTHS_MS = 183 * 86_400_000;

/** The customer's own space: profile, counters for the dashboard, and the saved family. */
@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pii: PiiService,
    private readonly settings: SettingsService,
  ) {}

  private async marketing(userId: string) {
    const latest = await this.prisma.consent.findFirst({ where: { userId, type: "MARKETING" }, orderBy: { createdAt: "desc" }, select: { granted: true } });
    return latest?.granted ?? false;
  }

  async profile(user: RequestUser): Promise<ProfileView> {
    const row = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    return { id: row.id, phone: row.phone, fullNameAr: row.fullNameAr, fullNameEn: row.fullNameEn, email: row.email, locale: row.locale, marketing: await this.marketing(row.id), memberSince: row.createdAt.toISOString() };
  }

  async updateProfile(user: RequestUser, input: { fullNameAr: string | null; fullNameEn: string | null; email: string | null; locale: "ar" | "en"; marketing: boolean }, meta: RequestMeta): Promise<ProfileView> {
    try {
      await this.prisma.user.update({ where: { id: user.id }, data: { fullNameAr: input.fullNameAr, fullNameEn: input.fullNameEn, email: input.email, locale: input.locale } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new Problem(HttpStatus.CONFLICT, "email_taken", "This email is used by another account.", { errors: [{ path: "email", code: "custom", message: "email_taken" }] });
      }
      throw err;
    }
    // Marketing consent is a ledger: a new row only when the choice changes (PDPL).
    if ((await this.marketing(user.id)) !== input.marketing) {
      const { privacyVersion } = await this.settings.get("legal");
      await this.prisma.consent.create({ data: { userId: user.id, type: "MARKETING", granted: input.marketing, policyVersion: privacyVersion, ip: meta.ip, userAgent: meta.userAgent } });
    }
    return this.profile(user);
  }

  async summary(user: RequestUser): Promise<AccountSummary> {
    const id = user.id;
    const [activeOrders, actionRequired, drafts, travelers, documents, expiringSoon, unreadNotifications, unreadMessages] = await Promise.all([
      this.prisma.order.count({ where: { customerId: id, status: { in: [...ACTIVE] } } }),
      this.prisma.order.count({ where: { customerId: id, status: "ACTION_REQUIRED" } }),
      this.prisma.order.count({ where: { customerId: id, status: { in: ["DRAFT", "PENDING_PAYMENT"] } } }),
      this.prisma.traveler.count({ where: { userId: id, deletedAt: null } }),
      this.prisma.document.count({ where: { ownerId: id, deletedAt: null, uploadedAt: { not: null } } }),
      this.prisma.traveler.count({ where: { userId: id, deletedAt: null, passportExpiry: { lt: new Date(Date.now() + SIX_MONTHS_MS) } } }),
      this.prisma.notification.count({ where: { userId: id, channel: "IN_APP", readAt: null } }),
      this.prisma.message.count({ where: { order: { customerId: id }, senderKind: { not: "CUSTOMER" }, readAt: null } }),
    ]);
    return { activeOrders, actionRequired, drafts, travelers, documents, expiringSoon, unreadNotifications, unreadMessages };
  }

  // ── Saved travellers ─────────────────────────────────────────────────────

  async travelers(user: RequestUser): Promise<SavedTravelerView[]> {
    const rows = await this.prisma.traveler.findMany({
      where: { userId: user.id, deletedAt: null },
      include: { nationality: { select: { iso2: true } }, _count: { select: { documents: { where: { deletedAt: null } }, orderEntries: true } } },
      orderBy: [{ relationship: "asc" }, { createdAt: "asc" }],
    });
    return rows.map((t) => ({
      id: t.id,
      relationship: t.relationship,
      givenNameEn: t.givenNameEn,
      surnameEn: t.surnameEn,
      fullNameAr: t.fullNameAr,
      gender: t.gender,
      dateOfBirth: day(t.dateOfBirth),
      nationalityIso2: t.nationality.iso2,
      applicantType: t.applicantType as SavedTravelerView["applicantType"],
      passportNumberMasked: PiiService.mask(this.pii.decrypt(t.passportNumberEnc)),
      passportExpiry: day(t.passportExpiry),
      documents: t._count.documents,
      orders: t._count.orderEntries,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  private async own(user: RequestUser, id: string) {
    const row = await this.prisma.traveler.findFirst({ where: { id, userId: user.id, deletedAt: null }, include: { nationality: { select: { iso2: true } } } });
    if (!row) throw Problem.notFound("Traveler");
    return row;
  }

  /** Full details for the edit form — the only place the passport number is shown in full. */
  async traveler(user: RequestUser, id: string): Promise<TravelerInput> {
    const t = await this.own(user, id);
    return {
      relationship: t.relationship,
      givenNameEn: t.givenNameEn,
      surnameEn: t.surnameEn,
      fullNameAr: t.fullNameAr,
      gender: t.gender,
      dateOfBirth: day(t.dateOfBirth),
      nationalityIso2: t.nationality.iso2,
      applicantType: t.applicantType as TravelerInput["applicantType"],
      passportNumber: this.pii.decrypt(t.passportNumberEnc),
      passportExpiry: day(t.passportExpiry),
    };
  }

  private async data(input: TravelerData) {
    const nationality = await this.prisma.country.findUnique({ where: { iso2: input.nationalityIso2 }, select: { id: true } });
    if (!nationality) throw new Problem(HttpStatus.UNPROCESSABLE_ENTITY, "validation_failed", "Unknown nationality.", { errors: [{ path: "nationalityIso2", code: "custom", message: "iso2" }] });
    return {
      relationship: input.relationship,
      givenNameEn: input.givenNameEn,
      surnameEn: input.surnameEn,
      fullNameAr: input.fullNameAr,
      gender: input.gender,
      dateOfBirth: date(input.dateOfBirth),
      nationalityId: nationality.id,
      applicantType: input.applicantType,
      passportNumberEnc: this.pii.encrypt(input.passportNumber),
      passportNumberHash: this.pii.blindIndex(input.passportNumber),
      passportExpiry: date(input.passportExpiry),
    };
  }

  private async assertUniquePassport(userId: string, hash: string, exceptId?: string) {
    const clash = await this.prisma.traveler.findFirst({ where: { userId, passportNumberHash: hash, deletedAt: null, ...(exceptId ? { id: { not: exceptId } } : {}) }, select: { id: true } });
    if (clash) throw new Problem(HttpStatus.CONFLICT, "traveler_exists", "A traveller with this passport is already saved.", { errors: [{ path: "passportNumber", code: "custom", message: "traveler_exists" }] });
  }

  async createTraveler(user: RequestUser, input: TravelerData) {
    const data = await this.data(input);
    await this.assertUniquePassport(user.id, data.passportNumberHash);
    const row = await this.prisma.traveler.create({ data: { ...data, userId: user.id }, select: { id: true } });
    return (await this.travelers(user)).find((t) => t.id === row.id)!;
  }

  async updateTraveler(user: RequestUser, id: string, input: TravelerData) {
    await this.own(user, id);
    const data = await this.data(input);
    await this.assertUniquePassport(user.id, data.passportNumberHash, id);
    await this.prisma.traveler.update({ where: { id }, data });
    return (await this.travelers(user)).find((t) => t.id === id)!;
  }

  /** Soft delete: past orders keep their own snapshot of the traveller. */
  async removeTraveler(user: RequestUser, id: string) {
    await this.own(user, id);
    await this.prisma.traveler.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
