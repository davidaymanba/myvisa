import { HttpStatus, Inject, Injectable, Logger } from "@nestjs/common";
import type { OtpRequestResult } from "@myvisa/shared";
import { ENV, type Env } from "../../config/env";
import { keyedHash, otpCode, safeEqual } from "../../common/crypto";
import { Problem } from "../../common/problem";
import type { RequestMeta } from "../../common/request-meta";
import { PrismaService } from "../../infra/prisma.service";
import { RedisService } from "../../infra/redis.service";
import { SMS_PROVIDER, type SmsProvider } from "./sms/sms.provider";

export type OtpPurpose = "LOGIN" | "TRACK_ORDER" | "CHANGE_PHONE";

const IP_LIMIT_PER_HOUR = 30;

/**
 * Phone OTP. The live challenge lives in Redis (hashed code + attempt counter, expires on its own);
 * every challenge is also written to `OtpChallenge` as the audit trail. Codes are never stored in clear.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  private key = (purpose: OtpPurpose, phone: string) => `otp:${purpose}:${phone}`;
  private hash = (phone: string, code: string) => keyedHash(this.env.HASH_PEPPER, `otp:${phone}:${code}`);

  async request(phone: string, purpose: OtpPurpose, meta: RequestMeta): Promise<OtpRequestResult> {
    const { env } = this;

    if (meta.ip) {
      const ip = await this.redis.hit(`otp:ip:${meta.ip}`, 3600);
      if (ip.count > IP_LIMIT_PER_HOUR) throw rateLimited(ip.ttl);
    }
    // Cooldown between sends to the same phone (SET NX doubles as the lock).
    const cooldownKey = `otp:cooldown:${purpose}:${phone}`;
    const acquired = await this.redis.set(cooldownKey, "1", "EX", env.OTP_RESEND_SECONDS, "NX");
    if (!acquired) throw rateLimited(Math.max(1, await this.redis.ttl(cooldownKey)));
    const hourly = await this.redis.hit(`otp:hour:${purpose}:${phone}`, 3600);
    if (hourly.count > env.OTP_MAX_PER_HOUR) throw rateLimited(hourly.ttl);

    const code = env.NODE_ENV !== "production" && env.OTP_DEV_CODE ? env.OTP_DEV_CODE : otpCode();
    const challenge = await this.prisma.otpChallenge.create({
      data: { phone, purpose, codeHash: this.hash(phone, code), expiresAt: new Date(Date.now() + env.OTP_TTL_SECONDS * 1000), ip: meta.ip },
    });
    const key = this.key(purpose, phone);
    await this.redis.multi().del(key).hset(key, { id: challenge.id, hash: challenge.codeHash, attempts: 0 }).expire(key, env.OTP_TTL_SECONDS).exec();

    try {
      await this.sms.send(phone, smsBody(code));
    } catch (err) {
      await this.redis.del(key, cooldownKey);
      this.logger.error(`SMS via ${this.sms.name} failed: ${(err as Error).message}`);
      throw new Problem(HttpStatus.SERVICE_UNAVAILABLE, "sms_failed", "We couldn't send the code. Try again shortly.");
    }
    return { expiresIn: env.OTP_TTL_SECONDS, resendIn: env.OTP_RESEND_SECONDS };
  }

  /** Consumes the challenge on success; throws otp_* problems otherwise. */
  async verify(phone: string, code: string, purpose: OtpPurpose): Promise<void> {
    const key = this.key(purpose, phone);
    const stored = (await this.redis.hgetall(key)) as { id?: string; hash?: string; attempts?: string };
    if (!stored.id || !stored.hash) throw new Problem(HttpStatus.BAD_REQUEST, "otp_expired", "The code expired. Request a new one.");

    const attempts = Number(stored.attempts ?? 0);
    if (attempts >= this.env.OTP_MAX_ATTEMPTS) {
      await this.redis.del(key);
      throw new Problem(HttpStatus.TOO_MANY_REQUESTS, "otp_locked", "Too many wrong attempts. Request a new code.");
    }

    if (!safeEqual(this.hash(phone, code), stored.hash)) {
      const used = await this.redis.hincrby(key, "attempts", 1);
      await this.prisma.otpChallenge.update({ where: { id: stored.id }, data: { attempts: used } });
      const attemptsLeft = Math.max(0, this.env.OTP_MAX_ATTEMPTS - used);
      if (attemptsLeft === 0) {
        await this.redis.del(key);
        throw new Problem(HttpStatus.TOO_MANY_REQUESTS, "otp_locked", "Too many wrong attempts. Request a new code.");
      }
      throw new Problem(HttpStatus.BAD_REQUEST, "otp_invalid", "That code is not right.", { attemptsLeft });
    }

    // DEL is atomic: only one concurrent verify can consume the code.
    if ((await this.redis.del(key)) === 0) throw new Problem(HttpStatus.BAD_REQUEST, "otp_expired", "The code expired. Request a new one.");
    await this.prisma.otpChallenge.update({ where: { id: stored.id }, data: { consumedAt: new Date(), attempts: attempts + 1 } });
  }
}

function rateLimited(retryAfter: number) {
  return new Problem(HttpStatus.TOO_MANY_REQUESTS, "otp_rate_limited", "Please wait before requesting another code.", { retryAfter });
}

/** Arabic first; the last line lets Android/Chrome autofill it (WebOTP origin-bound format). */
export function smsBody(code: string): string {
  return `رمز الدخول إلى ماي فيزا: ${code}\nلا تشاركه مع أحد.\nmyvisa code: ${code}\n\n@myvisa.sa #${code}`;
}
