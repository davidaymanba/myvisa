import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { SignJWT, jwtVerify } from "jose";
import type { OtpRequestResult, TrackSession, TrackView } from "@myvisa/shared";
import { ENV, type Env } from "../../config/env";
import { Problem } from "../../common/problem";
import type { RequestMeta } from "../../common/request-meta";
import { PrismaService } from "../../infra/prisma.service";
import { RedisService } from "../../infra/redis.service";
import { OtpService } from "../auth/otp.service";

const TOKEN_TTL = 30 * 60;
const IP_LIMIT_PER_HOUR = 20;
const AUDIENCE = "myvisa-track";

/**
 * Public tracking by order number + an SMS code to the phone on the order. Responses never reveal
 * whether an order number exists or which phone it belongs to: a mismatch behaves exactly like a
 * wrong code. A successful check returns a short-lived, read-only token scoped to that one order.
 */
@Injectable()
export class TrackingService {
  private readonly secret: Uint8Array;

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly otp: OtpService,
  ) {
    this.secret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
  }

  private findOrder(number: string, phone: string) {
    return this.prisma.order.findFirst({
      where: { number, status: { notIn: ["DRAFT"] }, OR: [{ contactPhone: phone }, { customer: { phone } }] },
      select: { id: true },
    });
  }

  async request(orderNumber: string, phone: string, meta: RequestMeta): Promise<OtpRequestResult> {
    if (meta.ip) {
      const hit = await this.redis.hit(`track:ip:${meta.ip}`, 3600);
      if (hit.count > IP_LIMIT_PER_HOUR) throw new Problem(HttpStatus.TOO_MANY_REQUESTS, "otp_rate_limited", "Please wait before requesting another code.", { retryAfter: hit.ttl });
    }
    const order = await this.findOrder(orderNumber, phone);
    if (order) return this.otp.request(phone, "TRACK_ORDER", meta);
    // No such order for this phone: same cooldown and same answer, but no SMS.
    const cooldownKey = `otp:cooldown:TRACK_ORDER:${phone}`;
    if (!(await this.redis.set(cooldownKey, "1", "EX", this.env.OTP_RESEND_SECONDS, "NX"))) {
      throw new Problem(HttpStatus.TOO_MANY_REQUESTS, "otp_rate_limited", "Please wait before requesting another code.", { retryAfter: Math.max(1, await this.redis.ttl(cooldownKey)) });
    }
    return { expiresIn: this.env.OTP_TTL_SECONDS, resendIn: this.env.OTP_RESEND_SECONDS };
  }

  async verify(orderNumber: string, phone: string, code: string): Promise<TrackSession> {
    const order = await this.findOrder(orderNumber, phone);
    if (!order) throw new Problem(HttpStatus.BAD_REQUEST, "otp_expired", "The code expired. Request a new one.");
    await this.otp.verify(phone, code, "TRACK_ORDER");
    const token = await new SignJWT({ scope: "track" }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setSubject(order.id).setIssuedAt().setIssuer("myvisa-api").setAudience(AUDIENCE).setExpirationTime(`${TOKEN_TTL}s`).sign(this.secret);
    return { token, expiresIn: TOKEN_TTL, view: await this.view(order.id) };
  }

  async viewByToken(token: string | undefined): Promise<TrackView> {
    if (!token) throw new Problem(HttpStatus.UNAUTHORIZED, "track_expired", "Verify again to see this order.");
    try {
      const { payload } = await jwtVerify(token, this.secret, { issuer: "myvisa-api", audience: AUDIENCE, algorithms: ["HS256"] });
      if (payload.scope !== "track" || !payload.sub) throw new Error("scope");
      return await this.view(payload.sub);
    } catch (err) {
      if (err instanceof Problem) throw err;
      throw new Problem(HttpStatus.UNAUTHORIZED, "track_expired", "Verify again to see this order.");
    }
  }

  private async view(orderId: string): Promise<TrackView> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        service: { select: { nameAr: true, nameEn: true, processingDaysMin: true, processingDaysMax: true } },
        destination: { select: { slug: true, iso2: true, mainAirportIata: true, nameAr: true, nameEn: true } },
        events: { orderBy: { createdAt: "asc" }, select: { id: true, toStatus: true, customerNote: true, createdAt: true } },
        appointment: { select: { city: true, scheduledAt: true } },
        _count: { select: { travelers: true } },
      },
    });
    if (!order) throw Problem.notFound("Order");
    return {
      number: order.number,
      status: order.status,
      decision: order.decision,
      service: { ar: order.service.nameAr, en: order.service.nameEn },
      destination: order.destination ? { slug: order.destination.slug, iso2: order.destination.iso2.toLowerCase(), iata: order.destination.mainAirportIata, name: { ar: order.destination.nameAr, en: order.destination.nameEn } } : null,
      travelers: order._count.travelers,
      processingDays: [order.service.processingDaysMin, order.service.processingDaysMax],
      createdAt: order.createdAt.toISOString(),
      // Drafting history is the customer's business, not the tracker's.
      events: order.events.filter((e) => e.toStatus !== "DRAFT" && e.toStatus !== "PENDING_PAYMENT").map((e) => ({ id: e.id, status: e.toStatus, note: e.customerNote, at: e.createdAt.toISOString() })),
      appointment: order.appointment ? { city: order.appointment.city, scheduledAt: order.appointment.scheduledAt.toISOString() } : null,
    };
  }
}
