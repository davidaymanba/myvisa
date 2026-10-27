"use client";

import type { AuditLogRecord, Paginated } from "@myvisa/shared";
import { useInfiniteQuery } from "@tanstack/react-query";
import { CloudOff, ScrollText } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import { AuditFeed } from "./audit-feed";
import { AdminPageHeader } from "./page-header";
import { adminKeys } from "./use-admin";

export function AuditView() {
  const t = useTranslations("admin.audit");
  const tc = useTranslations("admin.common");
  const query = useInfiniteQuery({
    queryKey: adminKeys.audit,
    queryFn: ({ pageParam }) => api<Paginated<AuditLogRecord>>(`/admin/audit-logs?take=30${pageParam ? `&cursor=${pageParam}` : ""}`),
    initialPageParam: "",
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <AdminPageHeader index="06" eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      <section className="rounded-[2rem] border border-border bg-surface p-5 shadow-sm sm:p-8">
        {query.isError ? (
          <ErrorState title={tc("loadError")} icon={<CloudOff />} retryLabel={tc("retry")} onRetry={() => void query.refetch()} />
        ) : query.isLoading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12 rounded-2xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={<ScrollText />} title={t("empty")} />
        ) : (
          <AuditFeed items={items} />
        )}
        {query.hasNextPage && (
          <Button variant="outline" className="mx-auto mt-6 flex" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
            {t("more")}
          </Button>
        )}
      </section>
    </>
  );
}
