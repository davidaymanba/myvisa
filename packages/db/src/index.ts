import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaPGlite } from "pglite-prisma-adapter";
import { PrismaClient } from "./generated/prisma/client";

export * from "./generated/prisma/client";

/** `pglite:///abs/dir` — an embedded, in-process Postgres (PGlite) for demo hosts with no database server. */
export const PGLITE_SCHEME = "pglite://";

// One PGlite per data directory per process: it is single-connection and must never be opened twice.
const pglites = new Map<string, PGlite>();
export function pgliteFor(connectionString: string): PGlite {
  const dir = connectionString.slice(PGLITE_SCHEME.length);
  let db = pglites.get(dir);
  if (!db) {
    db = new PGlite(dir);
    pglites.set(dir, db);
  }
  return db;
}

/** Closes a PGlite database cleanly (flushes it to disk). No-op for other URLs or one never opened. */
export async function closePglite(connectionString: string) {
  const dir = connectionString.slice(PGLITE_SCHEME.length);
  const db = connectionString.startsWith(PGLITE_SCHEME) ? pglites.get(dir) : undefined;
  if (!db) return;
  pglites.delete(dir);
  await db.close();
}

/** Driver adapter for a connection string: node-postgres for `postgres://`, PGlite for `pglite://` (demo only). */
export function driverAdapter(connectionString: string) {
  return connectionString.startsWith(PGLITE_SCHEME) ? new PrismaPGlite(pgliteFor(connectionString)) : new PrismaPg({ connectionString });
}

/** Prisma 7 talks to Postgres through a driver adapter (node-postgres, or PGlite on demo hosts). */
export function createPrismaClient(connectionString: string, options: { log?: ("query" | "info" | "warn" | "error")[] } = {}): PrismaClient {
  return new PrismaClient({ adapter: driverAdapter(connectionString), log: options.log ?? ["warn", "error"] });
}

/**
 * Applies the Prisma migrations to a PGlite database that doesn't have them yet (PGlite can't run
 * `prisma migrate deploy`). Records each one in `_prisma_migrations` like Prisma does, so it's idempotent.
 */
export async function migratePglite(connectionString: string, migrationsDir = fileURLToPath(new URL("../prisma/migrations", import.meta.url))): Promise<string[]> {
  const db = pgliteFor(connectionString);
  await db.exec(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" ("id" VARCHAR(36) PRIMARY KEY, "checksum" VARCHAR(64) NOT NULL, "finished_at" TIMESTAMPTZ, "migration_name" VARCHAR(255) NOT NULL, "logs" TEXT, "rolled_back_at" TIMESTAMPTZ, "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "applied_steps_count" INTEGER NOT NULL DEFAULT 0)`);
  const done = new Set((await db.query<{ migration_name: string }>(`SELECT migration_name FROM "_prisma_migrations"`)).rows.map((r) => r.migration_name));
  const applied: string[] = [];
  for (const name of readdirSync(migrationsDir).filter((n) => /^\d+_/.test(n)).sort()) {
    if (done.has(name)) continue;
    const sql = readFileSync(join(migrationsDir, name, "migration.sql"), "utf8");
    await db.transaction(async (tx) => {
      await tx.exec(sql);
      await tx.query(`INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count") VALUES (gen_random_uuid()::text, '', now(), $1, 1)`, [name]);
    });
    applied.push(name);
  }
  return applied;
}
