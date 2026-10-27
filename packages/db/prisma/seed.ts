import { normalizeSaudiMobile } from "@myvisa/shared";
import { createPrismaClient } from "../src/index";
import { seedDatabase } from "../src/seed/catalog";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set (copy .env.example to .env at the repo root)");

const adminPhone = process.env.SEED_ADMIN_PHONE ? normalizeSaudiMobile(process.env.SEED_ADMIN_PHONE) : null;
if (process.env.SEED_ADMIN_PHONE && !adminPhone) throw new Error("SEED_ADMIN_PHONE must be a Saudi mobile, e.g. +966500000001");

const prisma = createPrismaClient(url);
const started = Date.now();
try {
  if (process.env.NODE_ENV === "production" && (await prisma.country.count()) > 0 && process.env.SEED_FORCE !== "1") {
    console.log("Production database already has a catalog; set SEED_FORCE=1 to overwrite it from packages/shared.");
  } else {
    await seedDatabase(prisma, adminPhone ? { adminPhone } : {});
    const [countries, services, rules] = await Promise.all([prisma.country.count(), prisma.service.count(), prisma.priceRule.count()]);
    console.log(`Seeded ${countries} countries, ${services} services, ${rules} price rules in ${Date.now() - started} ms.`);
    if (adminPhone) console.log(`SUPER_ADMIN: ${adminPhone} (sign in at /admin/login with an OTP)`);
  }
} finally {
  await prisma.$disconnect();
}
