import { jwtVerify } from "jose";
import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { AUTH_COOKIES } from "@myvisa/shared/auth";
import { STAFF_ROLES } from "@myvisa/shared/rbac";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);
const ADMIN = /^(\/en)?\/admin(?:\/(.*))?$/;
const ACCOUNT = /^(\/en)?\/account(?:\/(.*))?$/;
const secret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET ?? "");

async function tokenRole(token: string | undefined): Promise<string | null> {
  if (!token || secret.length === 0) return null;
  try {
    const { payload } = await jwtVerify(token, secret, { issuer: "myvisa-api", audience: "myvisa", algorithms: ["HS256"] });
    return String(payload.role);
  } catch {
    return null;
  }
}

const isStaff = (role: string | null) => role !== null && (STAFF_ROLES as readonly string[]).includes(role);

/**
 * Locale routing for everything, plus gates in front of /admin (a valid staff access token) and
 * /account (any valid access token). Otherwise: a redirect to the matching login, which first tries a
 * silent refresh. The API re-checks every call.
 */
export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const admin = ADMIN.exec(pathname);
  const account = ACCOUNT.exec(pathname);
  const gate = admin ?? account;
  if (gate && gate[2] !== "login") {
    const role = await tokenRole(req.cookies.get(AUTH_COOKIES.access)?.value);
    if (admin ? !isStaff(role) : role === null) {
      const login = new URL(`${gate[1] ?? ""}/${admin ? "admin" : "account"}/login`, req.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
  }
  const res = intl(req);
  if (gate) res.headers.set("x-robots-tag", "noindex, nofollow");
  return res;
}

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
