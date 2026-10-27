import { type CanActivate, type ExecutionContext, HttpStatus, Inject, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { AUTH_COOKIES, CSRF_HEADER } from "@myvisa/shared";
import { ENV, type Env } from "../config/env";
import { safeEqual } from "./crypto";
import { Problem } from "./problem";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defence for cookie auth, in two layers:
 * 1. Origin check — a browser-sent Origin must be one of ours (blocks cross-site form posts outright).
 * 2. Double-submit token — when the request carries our auth cookies, the x-csrf-token header must
 *    equal the mv_csrf cookie. A cross-site page can make the browser send cookies but cannot read them.
 * Bearer-token clients (no cookies) are not exposed to CSRF and skip layer 2.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly allowedOrigins: Set<string>;

  constructor(@Inject(ENV) env: Env) {
    this.allowedOrigins = new Set([env.WEB_URL, ...env.CORS_ORIGINS].map((o) => new URL(o).origin));
  }

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(req.method)) return true;

    const origin = req.headers.origin;
    if (origin && origin !== "null" && !this.allowedOrigins.has(origin) && origin !== `${req.protocol}://${req.get("host")}`) {
      throw new Problem(HttpStatus.FORBIDDEN, "csrf", "Cross-site request blocked.");
    }

    const cookies = (req.cookies ?? {}) as Record<string, string | undefined>;
    const usesCookieAuth = Boolean(cookies[AUTH_COOKIES.access] || cookies[AUTH_COOKIES.refresh]);
    if (!usesCookieAuth || req.headers.authorization) return true;

    const header = req.headers[CSRF_HEADER];
    const cookie = cookies[AUTH_COOKIES.csrf];
    if (typeof header !== "string" || !cookie || !safeEqual(header, cookie)) {
      throw new Problem(HttpStatus.FORBIDDEN, "csrf", "Missing or invalid CSRF token.");
    }
    return true;
  }
}
