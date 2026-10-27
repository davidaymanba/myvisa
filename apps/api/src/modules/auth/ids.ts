import { randomBytes } from "node:crypto";

/** Opaque id for session families (not a DB primary key, so no cuid dependency). */
export function createId(): string {
  return `fam_${randomBytes(16).toString("base64url")}`;
}
