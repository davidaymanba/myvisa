"use client";

import type { ContactMessageRecord, Paginated } from "@myvisa/shared";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CloudOff, Check, Inbox as InboxIcon, MessageCircle, RotateCcw } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { timeAgo } from "./audit-feed";
import { AdminPageHeader } from "./page-header";
import { adminKeys, useCan, useMutationToasts } from "./use-admin";

const STATUSES = ["open", "handled"] as const;

export function InboxView() {
  const t = useTranslations("admin.inbox");
  const tc = useTranslations("admin.common");
  const locale = useLocale();
  const can = useCan();
  const queryClient = useQueryClient();
  const toasts = useMutationToasts();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("open");

  const query = useInfiniteQuery({
    queryKey: adminKeys.inbox(status),
    queryFn: ({ pageParam }) => api<Paginated<ContactMessageRecord>>(`/admin/contact-messages?status=${status}&take=20${pageParam ? `&cursor=${pageParam}` : ""}`),
    initialPageParam: "",
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const toggle = useMutation({
    mutationFn: ({ id, handled }: { id: string; handled: boolean }) => api(`/admin/contact-messages/${id}/handled`, { method: "PUT", body: { handled } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "inbox"] }),
    onError: toasts.error,
  });
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <AdminPageHeader index="03" eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      <LayoutGroup id="inbox-tabs">
        <div role="tablist" className="mb-6 inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1 shadow-xs">
          {STATUSES.map((s) => (
            <button key={s} role="tab" aria-selected={status === s} onClick={() => setStatus(s)} className={cn("relative rounded-full px-4 py-2 text-body-sm font-medium", status === s ? "text-background" : "text-muted-foreground hover:text-foreground")}>
              {status === s && <motion.span layoutId="inbox-pill" className="absolute inset-0 rounded-full bg-foreground" />}
              <span className="relative">{t(s)}</span>
            </button>
          ))}
        </div>
      </LayoutGroup>

      {query.isError ? (
        <ErrorState title={tc("loadError")} icon={<CloudOff />} retryLabel={tc("retry")} onRetry={() => void query.refetch()} />
      ) : query.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-[1.75rem]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={<InboxIcon />} title={t("empty")} description={t("emptyBody")} />
      ) : (
        <ul className="flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {items.map((m, i) => (
              <motion.li key={m.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 60 }} transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.45, ease: [0.16, 1, 0.3, 1] }} className="grid gap-4 rounded-[1.75rem] border border-border bg-surface p-5 shadow-xs sm:grid-cols-[1fr_auto] sm:p-6">
                <div className="flex min-w-0 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{m.name}</span>
                    <Badge tone="teal">{t(`topics.${m.topic}`)}</Badge>
                    <bdi dir="ltr" className="tabular text-body-sm text-muted-foreground">
                      {m.phone}
                    </bdi>
                    <span className="text-caption text-muted-foreground">· {timeAgo(m.createdAt, locale)}</span>
                  </div>
                  <p lang={m.locale} dir={m.locale === "ar" ? "rtl" : "ltr"} className="whitespace-pre-line text-body text-foreground/85">
                    {m.message}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Button asChild variant="outline" size="sm">
                    <a href={`https://wa.me/${m.phone.replace("+", "")}`} target="_blank" rel="noreferrer">
                      <MessageCircle aria-hidden />
                      {t("whatsapp")}
                    </a>
                  </Button>
                  {can("contact:write") && (
                    <Button size="sm" variant={m.handledAt ? "ghost" : "secondary"} loading={toggle.isPending && toggle.variables?.id === m.id} onClick={() => toggle.mutate({ id: m.id, handled: !m.handledAt })}>
                      {m.handledAt ? <RotateCcw aria-hidden /> : <Check aria-hidden />}
                      {m.handledAt ? t("reopen") : t("markHandled")}
                    </Button>
                  )}
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      {query.hasNextPage && (
        <Button variant="outline" className="mx-auto mt-6 flex" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
          {t("more")}
        </Button>
      )}
    </>
  );
}
