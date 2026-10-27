import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

export * from "./generated/prisma/client";

/** Prisma 7 talks to Postgres through a driver adapter (node-postgres here). */
export function createPrismaClient(connectionString: string, options: { log?: ("query" | "info" | "warn" | "error")[] } = {}): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }), log: options.log ?? ["warn", "error"] });
}
