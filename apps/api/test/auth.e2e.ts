import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AUTH_COOKIES } from "@myvisa/shared";
import { type Harness, as, cookieHeader, cookieValue, freshPhone, signIn, startHarness } from "./harness";

describe("phone OTP", () => {
  let h: Harness;
  beforeAll(async () => {
    h = await startHarness();
  });
  afterAll(() => h.close());

  it("normalises Arabic-digit input and stores only a hash of the code", async () => {
    await h.http.post("/api/v1/auth/otp/request").send({ phone: "٠٥٠٠١٢٣٤٥٦" }).expect(202);
    const challenge = await h.prisma.otpChallenge.findFirstOrThrow({ where: { phone: "+966500123456" } });
    expect(challenge.codeHash).not.toContain("000000");
  });

  it("enforces the resend cooldown", async () => {
    const phone = freshPhone();
    await h.http.post("/api/v1/auth/otp/request").send({ phone }).expect(202);
    const res = await h.http.post("/api/v1/auth/otp/request").send({ phone }).expect(429);
    expect(res.body.code).toBe("otp_rate_limited");
    expect(res.body.retryAfter).toBeGreaterThan(0);
  });

  it("counts wrong attempts, then locks the challenge", async () => {
    const phone = freshPhone();
    await h.http.post("/api/v1/auth/otp/request").send({ phone }).expect(202);
    for (let left = 4; left >= 1; left--) {
      const res = await h.http.post("/api/v1/auth/otp/verify").send({ phone, code: "123456" }).expect(400);
      expect(res.body).toMatchObject({ code: "otp_invalid", attemptsLeft: left });
    }
    await h.http.post("/api/v1/auth/otp/verify").send({ phone, code: "123456" }).expect(429);
    // Even the right code is useless once locked.
    const res = await h.http.post("/api/v1/auth/otp/verify").send({ phone, code: "000000" }).expect(400);
    expect(res.body.code).toBe("otp_expired");
  });

  it("is single use", async () => {
    const phone = freshPhone();
    await h.http.post("/api/v1/auth/otp/request").send({ phone }).expect(202);
    await h.http.post("/api/v1/auth/otp/verify").send({ phone, code: "000000" }).expect(200);
    await h.http.post("/api/v1/auth/otp/verify").send({ phone, code: "000000" }).expect(400);
  });

  it("rejects a non-Saudi number", async () => {
    const res = await h.http.post("/api/v1/auth/otp/request").send({ phone: "+201001234567" }).expect(422);
    expect(res.body.errors[0].message).toBe("invalid_saudi_mobile");
  });
});

describe("sessions", () => {
  let h: Harness;
  beforeAll(async () => {
    h = await startHarness();
  });
  afterAll(() => h.close());

  it("sets httpOnly session cookies and a readable CSRF cookie", async () => {
    const s = await signIn(h);
    const access = s.cookies.find((c) => c.startsWith(`${AUTH_COOKIES.access}=`))!;
    const refresh = s.cookies.find((c) => c.startsWith(`${AUTH_COOKIES.refresh}=`))!;
    const csrf = s.cookies.find((c) => c.startsWith(`${AUTH_COOKIES.csrf}=`))!;
    expect(access).toMatch(/HttpOnly/i);
    expect(refresh).toMatch(/HttpOnly/i);
    expect(refresh).toMatch(/Path=\/api\/v1\/auth/);
    expect(refresh).toMatch(/SameSite=Strict/i);
    expect(csrf).not.toMatch(/HttpOnly/i);
    const me = await h.http.get("/api/v1/auth/me").set(as(s)).expect(200);
    expect(me.body.role).toBe("CUSTOMER");
    expect(me.body.permissions).toEqual([]);
  });

  it("rotates the refresh token, and revokes the whole family when an old one is replayed", async () => {
    const s = await signIn(h);
    const first = cookieValue(s.cookies, AUTH_COOKIES.refresh)!;
    const rotated = await h.http.post("/api/v1/auth/refresh").set(as(s)).expect(200);
    const next = ([] as string[]).concat(rotated.headers["set-cookie"] ?? []);
    expect(cookieValue(next, AUTH_COOKIES.refresh)).not.toBe(first);

    // Replay the first token after the grace window.
    await h.prisma.session.updateMany({ where: { userId: s.userId, revokedAt: { not: null } }, data: { revokedAt: new Date(Date.now() - 60_000) } });
    const replay = await h.http.post("/api/v1/auth/refresh").set(as(s)).expect(401);
    expect(replay.body.code).toBe("session_revoked");

    // The legitimately rotated session is dead too, and so is its access token.
    const live = await h.prisma.session.count({ where: { userId: s.userId, revokedAt: null } });
    expect(live).toBe(0);
    await h.http.get("/api/v1/auth/me").set({ Cookie: cookieHeader(next) }).expect(401);
  });

  it("tolerates a near-simultaneous refresh from a second tab", async () => {
    const s = await signIn(h);
    await h.http.post("/api/v1/auth/refresh").set(as(s)).expect(200);
    await h.http.post("/api/v1/auth/refresh").set(as(s)).expect(200);
  });

  it("logs out: clears cookies and kills the access token", async () => {
    const s = await signIn(h);
    const res = await h.http.post("/api/v1/auth/logout").set(as(s)).expect(204);
    expect(([] as string[]).concat(res.headers["set-cookie"] ?? []).some((c) => c.startsWith(`${AUTH_COOKIES.access}=;`))).toBe(true);
    await h.http.get("/api/v1/auth/me").set(as(s)).expect(401);
  });

  it("blocks a deactivated user immediately", async () => {
    const s = await signIn(h, "MANAGER");
    await h.prisma.user.update({ where: { id: s.userId }, data: { isActive: false } });
    await h.http.get("/api/v1/admin/countries").set(as(s)).expect(401);
  });
});

describe("CSRF and RBAC", () => {
  let h: Harness;
  beforeAll(async () => {
    h = await startHarness();
  });
  afterAll(() => h.close());

  const setting = { whatsapp: "+966500000000", whatsappDisplay: "+966 50 000 0000", whatsappEtaMinutes: 9 };

  it("requires the CSRF header on cookie-authenticated writes", async () => {
    const s = await signIn(h, "SUPER_ADMIN");
    const res = await h.http.put("/api/v1/admin/settings/support").set({ Cookie: cookieHeader(s.cookies) }).send(setting).expect(403);
    expect(res.body.code).toBe("csrf");
    await h.http.put("/api/v1/admin/settings/support").set({ Cookie: cookieHeader(s.cookies), "x-csrf-token": "forged" }).send(setting).expect(403);
    await h.http.put("/api/v1/admin/settings/support").set(as(s)).send(setting).expect(200);
  });

  it("blocks writes from a foreign Origin", async () => {
    const res = await h.http.post("/api/v1/contact").set("Origin", "https://evil.example").send({ name: "Eve", phone: "0501234567", topic: "visa", message: "hello there friend" }).expect(403);
    expect(res.body.code).toBe("csrf");
  });

  it("applies the permission matrix", async () => {
    const customer = await signIn(h, "CUSTOMER");
    const agent = await signIn(h, "AGENT");
    const manager = await signIn(h, "MANAGER");
    const admin = await signIn(h, "SUPER_ADMIN");

    await h.http.get("/api/v1/admin/countries").expect(401);
    await h.http.get("/api/v1/admin/countries").set(as(customer)).expect(403);
    await h.http.get("/api/v1/admin/countries").set(as(agent)).expect(200);

    const rule = await h.prisma.priceRule.findFirstOrThrow();
    const body = { applicantType: rule.applicantType, governmentFeeHalalas: rule.governmentFeeHalalas, serviceFeeHalalas: rule.serviceFeeHalalas };
    await h.http.put(`/api/v1/admin/price-rules/${rule.id}`).set(as(agent)).send(body).expect(403);
    await h.http.put(`/api/v1/admin/price-rules/${rule.id}`).set(as(manager)).send(body).expect(200);

    await h.http.put("/api/v1/admin/settings/support").set(as(manager)).send(setting).expect(403);
    await h.http.put("/api/v1/admin/settings/support").set(as(admin)).send(setting).expect(200);
    await h.http.get("/api/v1/admin/audit-logs").set(as(agent)).expect(403);
    await h.http.get("/api/v1/admin/audit-logs").set(as(manager)).expect(200);
  });
});
