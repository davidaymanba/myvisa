import { describe, expect, it, vi } from "vitest";
import { envSchema } from "../../config/env";
import type { PrismaService } from "../../infra/prisma.service";
import type { RedisService } from "../../infra/redis.service";
import { OtpService, smsBody } from "./otp.service";
import type { SmsProvider } from "./sms/sms.provider";

/** Just enough of ioredis for OtpService, with a controllable clock. */
class FakeRedis {
  now = 0;
  private store = new Map<string, { value: string | Record<string, string>; expires: number | null }>();

  private live(key: string) {
    const e = this.store.get(key);
    if (e && e.expires !== null && e.expires <= this.now) this.store.delete(key);
    return this.store.get(key);
  }
  async set(key: string, value: string, _ex: "EX", seconds: number, nx?: "NX") {
    if (nx && this.live(key)) return null;
    this.store.set(key, { value, expires: this.now + seconds * 1000 });
    return "OK";
  }
  async ttl(key: string) {
    const e = this.live(key);
    return !e ? -2 : e.expires === null ? -1 : Math.ceil((e.expires - this.now) / 1000);
  }
  async hit(key: string, windowSeconds: number) {
    const e = this.live(key);
    const count = (e ? Number(e.value) : 0) + 1;
    this.store.set(key, { value: String(count), expires: e?.expires ?? this.now + windowSeconds * 1000 });
    return { count, ttl: await this.ttl(key) };
  }
  async hgetall(key: string) {
    const e = this.live(key);
    return e && typeof e.value === "object" ? { ...e.value } : {};
  }
  async hincrby(key: string, field: string, by: number) {
    const e = this.live(key)!;
    const hash = e.value as Record<string, string>;
    hash[field] = String(Number(hash[field] ?? 0) + by);
    return Number(hash[field]);
  }
  async del(...keys: string[]) {
    let n = 0;
    for (const k of keys) if (this.live(k) && this.store.delete(k)) n++;
    return n;
  }
  multi() {
    const ops: (() => void)[] = [];
    const chain = {
      del: (k: string) => (ops.push(() => void this.store.delete(k)), chain),
      hset: (k: string, v: Record<string, string | number>) => (ops.push(() => this.store.set(k, { value: Object.fromEntries(Object.entries(v).map(([a, b]) => [a, String(b)])), expires: null })), chain),
      expire: (k: string, s: number) => (ops.push(() => void (this.store.get(k)!.expires = this.now + s * 1000)), chain),
      exec: async () => ops.forEach((op) => op()),
    };
    return chain;
  }
}

function setup(overrides: Record<string, string> = {}) {
  const env = envSchema.parse({
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://x@localhost/x",
    REDIS_URL: "redis://localhost:6379",
    JWT_ACCESS_SECRET: "x".repeat(40),
    HASH_PEPPER: "p".repeat(20),
    ...overrides,
  });
  const redis = new FakeRedis();
  const sent: { to: string; body: string }[] = [];
  const sms: SmsProvider = { name: "fake", send: vi.fn(async (to, body) => (sent.push({ to, body }), {})) };
  const challenges: Record<string, unknown>[] = [];
  const prisma = {
    otpChallenge: {
      create: vi.fn(async ({ data }) => {
        const row = { id: `c${challenges.length}`, ...data };
        challenges.push(row);
        return row;
      }),
      update: vi.fn(async () => ({})),
    },
  };
  const service = new OtpService(env, sms, redis as unknown as RedisService, prisma as unknown as PrismaService);
  const lastCode = () => /(\d{6})/.exec(sent.at(-1)!.body)![1]!;
  return { service, redis, sent, challenges, lastCode, sms };
}

const phone = "+966501112233";
const meta = { ip: "203.0.113.1", userAgent: "test" };

describe("OtpService", () => {
  it("sends a 6-digit code and stores only its hash", async () => {
    const { service, sent, challenges, lastCode } = setup();
    const result = await service.request(phone, "LOGIN", meta);
    expect(result).toEqual({ expiresIn: 300, resendIn: 60 });
    expect(sent[0]!.to).toBe(phone);
    expect(lastCode()).toMatch(/^\d{6}$/);
    expect(JSON.stringify(challenges)).not.toContain(lastCode());
  });

  it("uses the fixed dev code outside production only", async () => {
    const dev = setup({ OTP_DEV_CODE: "424242" });
    await dev.service.request(phone, "LOGIN", meta);
    expect(dev.lastCode()).toBe("424242");
  });

  it("verifies once, then the code is gone", async () => {
    const { service, lastCode } = setup();
    await service.request(phone, "LOGIN", meta);
    const code = lastCode();
    await expect(service.verify(phone, code, "LOGIN")).resolves.toBeUndefined();
    await expect(service.verify(phone, code, "LOGIN")).rejects.toMatchObject({ code: "otp_expired" });
  });

  it("expires after the TTL", async () => {
    const { service, redis, lastCode } = setup();
    await service.request(phone, "LOGIN", meta);
    redis.now += 301_000;
    await expect(service.verify(phone, lastCode(), "LOGIN")).rejects.toMatchObject({ code: "otp_expired" });
  });

  it("locks after the maximum number of wrong attempts", async () => {
    const { service, lastCode } = setup({ OTP_MAX_ATTEMPTS: "3" });
    await service.request(phone, "LOGIN", meta);
    const wrong = lastCode() === "111111" ? "222222" : "111111";
    await expect(service.verify(phone, wrong, "LOGIN")).rejects.toMatchObject({ code: "otp_invalid", extra: { attemptsLeft: 2 } });
    await expect(service.verify(phone, wrong, "LOGIN")).rejects.toMatchObject({ code: "otp_invalid", extra: { attemptsLeft: 1 } });
    await expect(service.verify(phone, wrong, "LOGIN")).rejects.toMatchObject({ code: "otp_locked" });
    await expect(service.verify(phone, lastCode(), "LOGIN")).rejects.toMatchObject({ code: "otp_expired" });
  });

  it("enforces the resend cooldown and the hourly cap", async () => {
    const { service, redis } = setup({ OTP_MAX_PER_HOUR: "2" });
    await service.request(phone, "LOGIN", meta);
    await expect(service.request(phone, "LOGIN", meta)).rejects.toMatchObject({ code: "otp_rate_limited", extra: { retryAfter: 60 } });
    redis.now += 61_000;
    await service.request(phone, "LOGIN", meta);
    redis.now += 61_000;
    await expect(service.request(phone, "LOGIN", meta)).rejects.toMatchObject({ code: "otp_rate_limited" });
  });

  it("a new code replaces the previous one", async () => {
    const { service, redis, lastCode } = setup();
    await service.request(phone, "LOGIN", meta);
    const first = lastCode();
    redis.now += 61_000;
    await service.request(phone, "LOGIN", meta);
    if (first !== lastCode()) await expect(service.verify(phone, first, "LOGIN")).rejects.toMatchObject({ code: "otp_invalid" });
    await expect(service.verify(phone, lastCode(), "LOGIN")).resolves.toBeUndefined();
  });

  it("releases the cooldown when the SMS gateway fails, so the user can retry", async () => {
    const { service, sms } = setup();
    vi.mocked(sms.send).mockRejectedValueOnce(new Error("gateway down"));
    await expect(service.request(phone, "LOGIN", meta)).rejects.toMatchObject({ code: "sms_failed" });
    await expect(service.request(phone, "LOGIN", meta)).resolves.toBeDefined();
  });

  it("writes an Arabic-first message with a WebOTP line", () => {
    const body = smsBody("123456");
    expect(body.startsWith("رمز الدخول")).toBe(true);
    expect(body.trim().endsWith("@myvisa.sa #123456")).toBe(true);
  });
});
