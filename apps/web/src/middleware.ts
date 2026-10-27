import { jwtVerify } from "jose";
import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { AUTH_COOKIES } from "@myvisa/shared/auth";
import { STAFF_ROLES } from "@myvisa/shared/rbac";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);
const ADMIN = /^(\/en)?\/admin(?:\/(.*))?$/;
const secret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET ?? "");

async function isStaffToken(token: string | undefined): Promise<boolean> {
  if (!token || secret.length === 0) return false;
  try {
    const { payload } = await jwtVerify(token, secret, { issuer: "myvisa-api", audience: "myvisa", algorithms: ["HS256"] });
    return (STAFF_ROLES as readonly string[]).includes(String(payload.role));
  } catch {
    return false;
  }
}

/**
 * Locale routing for everything, plus a gate in front of /admin: a valid staff access token or
 * a redirect to the admin login (which first tries a silent refresh). The API re-checks every call.
 */
export default async function middleware(req: NextRequest) {
  const match = ADMIN.exec(req.nextUrl.pathname);
  if (match && match[2] !== "login" && !(await isStaffToken(req.cookies.get(AUTH_COOKIES.access)?.value))) {
    const login = new URL(`${match[1] ?? ""}/admin/login`, req.url);
    login.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  const res = intl(req);
  if (match) res.headers.set("x-robots-tag", "noindex, nofollow");
  return res;
}

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
