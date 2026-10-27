"use client";

import { useQuery } from "@tanstack/react-query";
import type { AuthUser, Permission } from "@myvisa/shared";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import type { FieldError, FieldValues, Path, UseFormSetError } from "react-hook-form";
import { toast } from "sonner";
import { ApiError, api } from "@/lib/api/client";

export const adminKeys = {
  me: ["admin", "me"] as const,
  countries: ["admin", "countries"] as const,
  country: (id: string) => ["admin", "country", id] as const,
  nationalities: ["admin", "nationalities"] as const,
  insurance: ["admin", "insurance"] as const,
  settings: ["admin", "settings"] as const,
  inbox: (status: string) => ["admin", "inbox", status] as const,
  audit: ["admin", "audit"] as const,
};

export function useMe() {
  return useQuery({ queryKey: adminKeys.me, queryFn: () => api<AuthUser>("/auth/me"), staleTime: 5 * 60_000, retry: false });
}

export function useCan() {
  const { data } = useMe();
  return useCallback((permission: Permission) => Boolean(data?.permissions.includes(permission)), [data]);
}

/** Translates an API problem (or any thrown error) into one human sentence. */
export function useProblemMessage() {
  const t = useTranslations("admin.errors");
  return useCallback(
    (error: unknown): string => {
      if (!(error instanceof ApiError)) return t("network");
      const { code, problem } = error;
      if (code === "otp_invalid") return t("otp_invalid", { attemptsLeft: Number(problem.attemptsLeft ?? 0) });
      if (code === "otp_rate_limited") return t("otp_rate_limited", { seconds: Number(problem.retryAfter ?? 60) });
      return t.has(code as "generic") ? t(code as "generic") : (problem.detail ?? t("generic"));
    },
    [t],
  );
}

/** Field-level message for react-hook-form errors coming from Zod (client) or the API (server). */
export function useFieldError() {
  const t = useTranslations("admin.errors");
  return useCallback(
    (error: FieldError | undefined): string | undefined => {
      if (!error) return undefined;
      const key = error.message ?? "";
      if (key && t.has(key as "generic")) return t(key as "generic");
      if (error.type === "too_small" || error.type === "invalid_type") return t("required");
      return t("invalid");
    },
    [t],
  );
}

/** Copies a 422 problem's field errors into the form. Returns true when it did. */
export function applyServerErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>): boolean {
  if (!(error instanceof ApiError) || !error.problem.errors?.length) return false;
  for (const e of error.problem.errors) setError(e.path as Path<T>, { type: e.code, message: e.message });
  return true;
}

/** Standard toast pair for mutations. */
export function useMutationToasts() {
  const problem = useProblemMessage();
  return {
    success: (message: string) => toast.success(message),
    error: (error: unknown) => toast.error(problem(error)),
  };
}

/** "" → null, otherwise a number (NaN stays NaN so Zod reports it). */
export const numberOrNull = (v: unknown) => (v === "" || v === null || v === undefined ? null : Number(v));
