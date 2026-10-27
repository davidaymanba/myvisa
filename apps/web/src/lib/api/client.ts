"use client";

import { AUTH_COOKIES, CSRF_HEADER } from "@myvisa/shared";

/** RFC 9457 body returned by the API for every error. */
export interface Problem {
  status: number;
  code: string;
  detail?: string;
  errors?: { path: string; code: string; message: string }[];
  [extra: string]: unknown;
}

export class ApiError extends Error {
  constructor(readonly problem: Problem) {
    super(problem.detail ?? problem.code);
  }
  get status() {
    return this.problem.status;
  }
  get code() {
    return this.problem.code;
  }
}

function readCookie(name: string): string | undefined {
  return document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

let refreshing: Promise<boolean> | null = null;

/** One refresh at a time, however many requests hit 401 together. */
export function refreshSession(): Promise<boolean> {
  refreshing ??= fetch("/api/v1/auth/refresh", { method: "POST", headers: csrfHeaders(), credentials: "same-origin" })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

function csrfHeaders(): Record<string, string> {
  const token = readCookie(AUTH_COOKIES.csrf);
  return token ? { [CSRF_HEADER]: token } : {};
}

/** Called when the session is gone for good (refresh failed). The admin shell redirects to login. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

/**
 * Same-origin JSON client for /api/v1 (proxied to the API by next.config rewrites).
 * Sends the CSRF header on writes and transparently refreshes an expired access token once.
 */
export async function api<T>(path: string, init: { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown; signal?: AbortSignal } = {}, retried = false): Promise<T> {
  const method = init.method ?? "GET";
  const res = await fetch(`/api/v1${path}`, {
    method,
    credentials: "same-origin",
    headers: { accept: "application/json", ...(init.body !== undefined ? { "content-type": "application/json" } : {}), ...(method !== "GET" ? csrfHeaders() : {}) },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    signal: init.signal,
  });

  if (res.status === 401 && !retried && !path.startsWith("/auth/")) {
    if (await refreshSession()) return api<T>(path, init, true);
    onUnauthorized?.();
  }
  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const problem = (body && typeof body === "object" ? body : {}) as Partial<Problem>;
    throw new ApiError({ ...problem, status: res.status, code: problem.code ?? "network" });
  }
  return body as T;
}
