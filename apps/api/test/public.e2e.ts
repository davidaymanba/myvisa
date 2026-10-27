import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, PLACEHOLDER_TESTIMONIALS } from "@myvisa/shared";
import { type Harness, as, signIn, startHarness } from "./harness";

describe("public endpoints", () => {
  let h: Harness;
  beforeAll(async () => {
    h = await startHarness();
  });
  afterAll(() => h.close());

  it("reports health", async () => {
    const res = await h.http.get("/health").expect(200);
    expect(res.body.info.database.status).toBe("up");
    expect(res.body.info.redis.status).toBe("up");
  });

  it("serves the seeded settings", async () => {
    const res = await h.http.get("/api/v1/settings").expect(200);
    expect(res.body).toEqual(DEFAULT_SETTINGS);
  });

  it("validates settings per key", async () => {
    const admin = await signIn(h, "SUPER_ADMIN");
    const res = await h.http.put("/api/v1/admin/settings/support").set(as(admin)).send({ whatsapp: "not a phone", whatsappDisplay: "x", whatsappEtaMinutes: 0 }).expect(422);
    expect((res.body.errors as { path: string }[]).map((e) => e.path).sort()).toEqual(["whatsapp", "whatsappEtaMinutes"]);
    await h.http.put("/api/v1/admin/settings/nope").set(as(admin)).send({}).expect(404);
  });

  it("serves published testimonials and refuses to publish one without consent", async () => {
    const res = await h.http.get("/api/v1/testimonials").expect(200);
    expect(res.body.map((t: { quote: unknown }) => t.quote)).toEqual(PLACEHOLDER_TESTIMONIALS.map((t) => t.quote));
    const manager = await signIn(h, "MANAGER");
    const bad = await h.http.post("/api/v1/admin/testimonials").set(as(manager)).send({ authorNameAr: "سارة", rating: 5, quoteAr: "خدمة ممتازة", status: "PUBLISHED" }).expect(422);
    expect(bad.body.errors[0].path).toBe("consentedAt");
  });

  it("stores contact messages, ignores honeypot hits, and routes them to the inbox", async () => {
    const message = { name: "Sara", phone: "0551234567", topic: "insurance", message: "I need Schengen insurance for two weeks", locale: "en" };
    await h.http.post("/api/v1/contact").set("Origin", "http://localhost:3100").send(message).expect(202);
    await h.http.post("/api/v1/contact").send({ ...message, website: "spam.example" }).expect(422);
    await h.http.post("/api/v1/contact").send({ ...message, message: "short" }).expect(422);
    const agent = await signIn(h, "AGENT");
    const inbox = await h.http.get("/api/v1/admin/contact-messages").set(as(agent)).expect(200);
    expect(inbox.body.items).toHaveLength(1);
    expect(inbox.body.items[0]).toMatchObject({ phone: "+966551234567", topic: "INSURANCE" });
    await h.http.put(`/api/v1/admin/contact-messages/${inbox.body.items[0].id}/handled`).set(as(agent)).send({ handled: true }).expect(200);
    expect((await h.http.get("/api/v1/admin/contact-messages").set(as(agent)).expect(200)).body.items).toHaveLength(0);
  });

  it("rate limits the contact form", async () => {
    const message = { name: "Bot", phone: "0551234567", topic: "other", message: "spam spam spam spam" };
    const ip = { "X-Forwarded-For": "203.0.113.50" }; // fresh client, unaffected by earlier tests
    for (let i = 0; i < 5; i++) await h.http.post("/api/v1/contact").set(ip).send(message).expect(202);
    const res = await h.http.post("/api/v1/contact").set(ip).send(message).expect(429);
    expect(res.body.code).toBe("rate_limited");
  });

  it("keeps an append-only consent ledger", async () => {
    await h.http.post("/api/v1/consents").send({ type: "MARKETING", policyVersion: "1.0", granted: true }).expect(422);
    await h.http.post("/api/v1/consents").send({ type: "MARKETING", policyVersion: "1.0", granted: true, phone: "0551234567" }).expect(201);
    const s = await signIn(h);
    await h.http.post("/api/v1/consents").set(as(s)).send({ type: "MARKETING", policyVersion: "1.0", granted: true }).expect(201);
    await h.http.post("/api/v1/consents").set(as(s)).send({ type: "MARKETING", policyVersion: "1.0", granted: false }).expect(201);
    const mine = await h.http.get("/api/v1/consents/me").set(as(s)).expect(200);
    expect(mine.body).toEqual([expect.objectContaining({ type: "MARKETING", granted: false })]);
    expect(await h.prisma.consent.count({ where: { userId: s.userId } })).toBe(2);
  });
});
