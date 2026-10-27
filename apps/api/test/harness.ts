import type { NestExpressApplication } from "@nestjs/platform-express";
import { Redis } from "ioredis";
import request from "supertest";
import { AUTH_COOKIES, CSRF_HEADER, type UserRole } from "@myvisa/shared";
import { createPrismaClient, type PrismaClient } from "@myvisa/db";
import { seedDatabase } from "@myvisa/db/seed";
import { createApp } from "../src/app.factory";
import { TEST_DATABASE_URL, TEST_REDIS_URL, testEnv } from "./env";

export interface Harness {
  app: NestExpressApplication;
  http: ReturnType<typeof request>;
  prisma: PrismaClient;
  redis: Redis;
  close(): Promise<void>;
}

/** Fresh database (truncate + seed), empty Redis, and a real app instance. */
export async function startHarness(): Promise<Harness> {
  const prisma = createPrismaClient(TEST_DATABASE_URL);
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
  await seedDatabase(prisma);
  const redis = new Redis(TEST_REDIS_URL);
  await redis.flushdb();

  const app = await createApp(testEnv(), { logger: false });
  await app.init();
  return {
    app,
    http: request(app.getHttpServer()),
    prisma,
    redis,
    async close() {
      await app.close();
      await prisma.$disconnect();
      await redis.quit();
    },
  };
}

let phoneSeq = 10_000_000;
/** Unique Saudi mobile per call, so OTP cooldowns never collide between tests. */
export function freshPhone(): string {
  phoneSeq += 1;
  return `+9665${phoneSeq.toString().padStart(8, "0")}`;
}

export interface Session {
  cookies: string[];
  csrf: string;
  userId: string;
}

export function cookieValue(cookies: string[], name: string): string | undefined {
  for (const c of cookies) {
    const [pair] = c.split(";");
    const [k, v] = (pair ?? "").split("=");
    if (k === name) return v;
  }
  return undefined;
}

/** Cookie header from Set-Cookie lines (the refresh cookie's Path is ignored, like a browser hitting /api/v1/auth). */
export const cookieHeader = (cookies: string[]) => cookies.map((c) => c.split(";")[0]).filter((c) => !c?.endsWith("=")).join("; ");

/** Signs in through the real OTP flow (dev code) and returns the session cookies. */
export async function signIn(h: Harness, role: UserRole = "CUSTOMER", phone = freshPhone()): Promise<Session> {
  if (role !== "CUSTOMER") await h.prisma.user.upsert({ where: { phone }, create: { phone, role }, update: { role } });
  await h.http.post("/api/v1/auth/otp/request").send({ phone }).expect(202);
  const res = await h.http.post("/api/v1/auth/otp/verify").send({ phone, code: "000000" }).expect(200);
  const cookies = ([] as string[]).concat(res.headers["set-cookie"] ?? []);
  return { cookies, csrf: cookieValue(cookies, AUTH_COOKIES.csrf)!, userId: res.body.user.id };
}

/** Headers for an authenticated, CSRF-protected browser call. */
export const as = (s: Session) => ({ Cookie: cookieHeader(s.cookies), [CSRF_HEADER]: s.csrf });
