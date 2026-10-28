import { z } from "../zod";
import { saudiMobileSchema } from "../phone";
import type { Permission, UserRole } from "../rbac";

export const otpRequestSchema = z.object({
  phone: saudiMobileSchema,
});
export type OtpRequestInput = z.input<typeof otpRequestSchema>;

export const otpVerifySchema = z.object({
  phone: saudiMobileSchema,
  code: z.string().trim().regex(/^\d{6}$/, "otp_format"),
});
export type OtpVerifyInput = z.input<typeof otpVerifySchema>;

export interface OtpRequestResult {
  /** Seconds until the code expires. */
  expiresIn: number;
  /** Seconds before another code can be requested. */
  resendIn: number;
}

export interface AuthUser {
  id: string;
  phone: string;
  role: UserRole;
  fullNameAr: string | null;
  fullNameEn: string | null;
  permissions: Permission[];
}

/** Names of the auth cookies, shared so the web middleware reads exactly what the API writes. */
export const AUTH_COOKIES = {
  access: "mv_at",
  refresh: "mv_rt",
  csrf: "mv_csrf",
} as const;
export const CSRF_HEADER = "x-csrf-token";

/** Claims inside the access JWT. */
export interface AccessTokenClaims {
  sub: string;
  role: UserRole;
  sid: string;
}

/** Machine-readable error codes in problem+json bodies (`code`), translated by the web app. */
export const AUTH_ERROR_CODES = [
  "otp_rate_limited",
  "otp_invalid",
  "otp_expired",
  "otp_locked",
  "unauthorized",
  "forbidden",
  "csrf",
  "session_revoked",
] as const;
export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];
