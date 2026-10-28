"use client";

import type { AdminOrderDetail, AdminOrderPage, AdminOrderViewKey, OrderStatus, StaffRef } from "@myvisa/shared";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFormatter, useNow } from "next-intl";
import { useCallback } from "react";
import { api } from "@/lib/api/client";
import { useMutationToasts } from "../use-admin";

export const orderKeys = {
  all: ["admin", "orders"] as const,
  page: (q: object) => ["admin", "orders", "page", q] as const,
  desk: (id: string) => ["admin", "orders", "desk", id] as const,
  agents: ["admin", "agents"] as const,
};

export interface QueueQuery {
  view: AdminOrderViewKey;
  q?: string;
  status?: OrderStatus;
  page?: number;
  pageSize?: number;
}

export function useOrderPage(query: QueueQuery) {
  const params = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]));
  return useQuery({ queryKey: orderKeys.page(query), queryFn: () => api<AdminOrderPage>(`/admin/orders?${params}`), placeholderData: keepPreviousData, refetchInterval: 30_000 });
}

export function useDesk(id: string) {
  return useQuery({ queryKey: orderKeys.desk(id), queryFn: () => api<AdminOrderDetail>(`/admin/orders/${id}`), refetchInterval: 30_000 });
}

export function useAgents() {
  return useQuery({ queryKey: orderKeys.agents, queryFn: () => api<StaffRef[]>("/admin/agents"), staleTime: 5 * 60_000 });
}

/** Every desk mutation returns the fresh desk; keep it and refresh the queue. */
export function useDeskMutation<V>(id: string, fn: (vars: V) => Promise<AdminOrderDetail>, success?: string) {
  const queryClient = useQueryClient();
  const toasts = useMutationToasts();
  return useMutation({
    mutationFn: fn,
    onSuccess: (desk) => {
      queryClient.setQueryData(orderKeys.desk(id), desk);
      void queryClient.invalidateQueries({ queryKey: ["admin", "orders", "page"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      if (success) toasts.success(success);
    },
    onError: toasts.error,
  });
}

export const moveOrder = (id: string, body: { to: OrderStatus; customerNote: string | null; decision: string | null }) => api<AdminOrderDetail>(`/admin/orders/${id}/status`, { method: "POST", body });

/** "in 3 hours" / "2 hours ago", refreshed every minute. */
export function useDue() {
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  return useCallback((iso: string) => format.relativeTime(new Date(iso), now), [format, now]);
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("");
