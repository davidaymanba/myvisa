"use client";

import type { AccountSummary, InvoiceSummary, InvoiceView, MessageView, NotificationPage, OrderTimelineView, OrderView, ProfileView, SavedTravelerView, VaultDocumentView } from "@myvisa/shared";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useCallback } from "react";
import { toast } from "sonner";
import { ApiError, api } from "@/lib/api/client";

export const accountKeys = {
  all: ["account"] as const,
  summary: ["account", "summary"] as const,
  orders: ["account", "orders"] as const,
  order: (id: string) => ["account", "order", id] as const,
  timeline: (id: string) => ["account", "order", id, "timeline"] as const,
  messages: (id: string) => ["account", "order", id, "messages"] as const,
  travelers: ["account", "travelers"] as const,
  vault: ["account", "vault"] as const,
  notifications: (locale: string) => ["account", "notifications", locale] as const,
  invoices: ["account", "invoices"] as const,
  invoice: (id: string) => ["account", "invoice", id] as const,
  profile: ["account", "profile"] as const,
};

export function useSummary() {
  return useQuery({ queryKey: accountKeys.summary, queryFn: () => api<AccountSummary>("/me/summary"), refetchInterval: 60_000 });
}

export function useOrders() {
  return useQuery({ queryKey: accountKeys.orders, queryFn: () => api<OrderView[]>("/orders") });
}

/** Polls while files are being scanned so the status flips without a reload. */
export function useAccountOrder(id: string) {
  return useQuery({
    queryKey: accountKeys.order(id),
    queryFn: () => api<OrderView>(`/orders/${id}`),
    refetchInterval: (q) => (q.state.data?.documents.some((d) => d.document.scanStatus === "PENDING") ? 2000 : 30_000),
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
  });
}

export function useTimeline(id: string) {
  return useQuery({ queryKey: accountKeys.timeline(id), queryFn: () => api<OrderTimelineView>(`/orders/${id}/timeline`), refetchInterval: 60_000 });
}

export function useMessages(id: string) {
  const locale = useLocale();
  return useQuery({ queryKey: accountKeys.messages(id), queryFn: () => api<MessageView[]>(`/orders/${id}/messages?locale=${locale}`), refetchInterval: 15_000 });
}

export function useTravelers() {
  return useQuery({ queryKey: accountKeys.travelers, queryFn: () => api<SavedTravelerView[]>("/me/travelers") });
}

export function useVault() {
  return useQuery({
    queryKey: accountKeys.vault,
    queryFn: () => api<VaultDocumentView[]>("/me/documents"),
    refetchInterval: (q) => (q.state.data?.some((d) => d.scanStatus === "PENDING") ? 2000 : false),
  });
}

export function useNotifications() {
  const locale = useLocale();
  return useInfiniteQuery({
    queryKey: accountKeys.notifications(locale),
    queryFn: ({ pageParam }) => api<NotificationPage>(`/me/notifications?locale=${locale}${pageParam ? `&cursor=${pageParam}` : ""}`),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    refetchInterval: 60_000,
  });
}

export function useInvoices() {
  return useQuery({ queryKey: accountKeys.invoices, queryFn: () => api<InvoiceSummary[]>("/me/invoices") });
}

export function useInvoice(id: string) {
  return useQuery({ queryKey: accountKeys.invoice(id), queryFn: () => api<InvoiceView>(`/invoices/${id}`) });
}

export function useProfile() {
  return useQuery({ queryKey: accountKeys.profile, queryFn: () => api<ProfileView>("/me/profile"), staleTime: 5 * 60_000 });
}

/** Refetch everything that summarises the account (after any change). */
export function useRefreshAccount() {
  const queryClient = useQueryClient();
  return useCallback(() => queryClient.invalidateQueries({ queryKey: accountKeys.all }), [queryClient]);
}

/** Problem code → sentence: account-specific codes first, then the apply wizard's shared ones. */
export function useAccountError() {
  const ta = useTranslations("account");
  const te = useTranslations("apply.errors");
  return useCallback(
    (error: unknown): string => {
      if (!(error instanceof ApiError)) return te("network");
      const { code, problem } = error;
      if (code === "traveler_exists") return ta("travelers.traveler_exists");
      if (code === "already_attached") return ta("documents.already_attached");
      if (code === "email_taken") return ta("profile.email_taken");
      if (code === "otp_invalid") return te("otp_invalid", { attemptsLeft: Number(problem.attemptsLeft ?? 0) });
      if (code === "otp_rate_limited") return te("otp_rate_limited", { seconds: Number(problem.retryAfter ?? 60) });
      return te.has(code as "generic") ? te(code as "generic") : te("generic");
    },
    [ta, te],
  );
}

export function useErrorToast() {
  const message = useAccountError();
  return useCallback((error: unknown) => void toast.error(message(error)), [message]);
}

/** Field error from react-hook-form → sentence (same vocabulary as the wizard). */
export function useFieldError() {
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

/** Statuses grouped the way the customer thinks about them. */
export const ORDER_GROUPS = {
  active: ["RECEIVED", "DOCUMENTS_REVIEW", "ACTION_REQUIRED", "APPOINTMENT_BOOKED", "SUBMITTED_TO_EMBASSY", "DECISION_ISSUED"],
  drafts: ["DRAFT", "PENDING_PAYMENT"],
  done: ["DELIVERED", "CANCELLED", "REFUNDED"],
} as const satisfies Record<string, readonly OrderView["status"][]>;

export const isIn = (group: keyof typeof ORDER_GROUPS, status: OrderView["status"]) => (ORDER_GROUPS[group] as readonly string[]).includes(status);

/** Days until an ISO date (negative when past). */
export function daysUntil(iso: string): number {
  return Math.round((new Date(`${iso.slice(0, 10)}T00:00:00Z`).getTime() - Date.now()) / 86_400_000);
}
