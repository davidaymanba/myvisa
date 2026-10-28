import { randomInt } from "node:crypto";

// Crockford base32 without I, L, O, U: unambiguous when read out over the phone.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Human-friendly reference shown on the boarding pass, e.g. "MV-26-4F7K2Q". */
export function orderNumber(now = new Date()): string {
  const year = String(now.getUTCFullYear() % 100).padStart(2, "0");
  let code = "";
  for (let i = 0; i < 6; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return `MV-${year}-${code}`;
}
