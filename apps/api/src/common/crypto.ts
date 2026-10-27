import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/** HMAC-SHA256 with the server pepper. Used for OTP codes and refresh tokens (never stored in clear). */
export function keyedHash(pepper: string, value: string): string {
  return createHmac("sha256", pepper).update(value).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Uniform 6-digit code (crypto RNG, no modulo bias). */
export function otpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}
