import type { CookieOptions, Response } from "express";
import { AUTH_COOKIES } from "@myvisa/shared";
import type { Env } from "../../config/env";

export const REFRESH_COOKIE_PATH = "/api/v1/auth";

function base(env: Env): CookieOptions {
  return {
    secure: env.COOKIE_SECURE ?? env.NODE_ENV === "production",
    sameSite: "lax",
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

export function setAuthCookies(res: Response, env: Env, tokens: { accessToken: string; refreshToken: string; csrfToken: string; refreshExpiresAt: Date }) {
  const b = base(env);
  res.cookie(AUTH_COOKIES.access, tokens.accessToken, { ...b, httpOnly: true, path: "/", maxAge: env.JWT_ACCESS_TTL_SECONDS * 1000 });
  // The refresh token is only ever sent to the auth endpoints.
  res.cookie(AUTH_COOKIES.refresh, tokens.refreshToken, { ...b, httpOnly: true, sameSite: "strict", path: REFRESH_COOKIE_PATH, expires: tokens.refreshExpiresAt });
  // Double-submit CSRF token: readable by our JS, echoed back in the x-csrf-token header.
  res.cookie(AUTH_COOKIES.csrf, tokens.csrfToken, { ...b, httpOnly: false, path: "/", expires: tokens.refreshExpiresAt });
}

export function clearAuthCookies(res: Response, env: Env) {
  const b = base(env);
  res.clearCookie(AUTH_COOKIES.access, { ...b, path: "/" });
  res.clearCookie(AUTH_COOKIES.refresh, { ...b, sameSite: "strict", path: REFRESH_COOKIE_PATH });
  res.clearCookie(AUTH_COOKIES.csrf, { ...b, path: "/" });
}
