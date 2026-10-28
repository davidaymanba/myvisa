"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AUTH_COOKIES, CSRF_HEADER, type AuthUser, type OrderView } from "@myvisa/shared";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { ApiError, api, refreshSession } from "@/lib/api/client";

export const applyKeys = {
  me: ["apply", "me"] as const,
  order: (id: string) => ["apply", "order", id] as const,
};

/** The signed-in customer, or null. Tries one silent refresh before giving up. */
export function useSession() {
  return useQuery({
    queryKey: applyKeys.me,
    queryFn: async () => {
      try {
        return await api<AuthUser>("/auth/me");
      } catch (e) {
        if (e instanceof ApiError && e.status === 401 && (await refreshSession())) return api<AuthUser>("/auth/me").catch(() => null);
        return null;
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useOrder(id: string | null, options: { poll?: boolean } = {}) {
  return useQuery({
    queryKey: applyKeys.order(id ?? "none"),
    queryFn: () => api<OrderView>(`/orders/${id}`),
    enabled: Boolean(id),
    refetchInterval: options.poll ? 1500 : false,
  });
}

export function useSetOrder() {
  const queryClient = useQueryClient();
  return useCallback((order: OrderView) => queryClient.setQueryData(applyKeys.order(order.id), order), [queryClient]);
}

/** Problem code → sentence in the apply namespace (falls back to the generic message). */
export function useApplyError() {
  const t = useTranslations("apply.errors");
  return useCallback(
    (error: unknown): string => {
      if (!(error instanceof ApiError)) return t("network");
      const { code, problem } = error;
      if (code === "otp_invalid") return t("otp_invalid", { attemptsLeft: Number(problem.attemptsLeft ?? 0) });
      if (code === "otp_rate_limited") return t("otp_rate_limited", { seconds: Number(problem.retryAfter ?? 60) });
      return t.has(code as "generic") ? t(code as "generic") : t("generic");
    },
    [t],
  );
}

/** Field error key (Zod message or issue code) → sentence. */
export function useApplyFieldError() {
  const t = useTranslations("apply.errors");
  return useCallback(
    (error: { message?: string; type?: string } | undefined) => {
      if (!error) return undefined;
      if (error.message && t.has(error.message as "generic")) return t(error.message as "generic");
      if (error.type === "too_small" || error.type === "invalid_type" || error.type === "required") return t("required");
      return t("invalid");
    },
    [t],
  );
}

/** Direct-to-storage PUT with progress (fetch can't report upload progress). */
export function putWithProgress(url: string, headers: Record<string, string>, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`upload ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("upload network error"));
    xhr.send(file);
  });
}

/** A stable idempotency key per order, so a double-click or a reload never charges twice. */
export function idempotencyKey(orderId: string): string {
  const storageKey = `mv-pay-key:${orderId}`;
  try {
    const existing = sessionStorage.getItem(storageKey);
    if (existing) return existing;
    const key = crypto.randomUUID();
    sessionStorage.setItem(storageKey, key);
    return key;
  } catch {
    return crypto.randomUUID();
  }
}

export function clearIdempotencyKey(orderId: string) {
  try {
    sessionStorage.removeItem(`mv-pay-key:${orderId}`);
  } catch {
    /* storage unavailable */
  }
}

/** Fetch with the CSRF header but a custom extra header (payments need Idempotency-Key). */
export async function postWithHeaders<T>(path: string, body: unknown, headers: Record<string, string>): Promise<T> {
  const csrf = document.cookie.split("; ").find((c) => c.startsWith(`${AUTH_COOKIES.csrf}=`))?.slice(AUTH_COOKIES.csrf.length + 1);
  const res = await fetch(`/api/v1${path}`, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json", ...(csrf ? { [CSRF_HEADER]: csrf } : {}), ...headers }, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) throw new ApiError({ ...((json as object) ?? {}), status: res.status, code: (json as { code?: string } | null)?.code ?? "network" });
  return json as T;
}
