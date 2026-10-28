"use client";

import type { NotificationPage, NotificationView } from "@myvisa/shared";
import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { BellOff, CalendarCheck, CheckCheck, CreditCard, FileWarning, Inbox, MessageSquareText, Stamp } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useFormatter, useLocale, useNow, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { AccountHeader, LoadError } from "./page-header";
import { accountKeys, useErrorToast, useNotifications } from "./use-account";

function iconFor(n: NotificationView) {
  if (n.template === "message.received") return MessageSquareText;
  if (n.template === "payment.failed") return CreditCard;
  if (n.template === "order.received") return Inbox;
  if (/مطلوب|Action/i.test(n.title)) return FileWarning;
  if (/موعد|appointment/i.test(n.title)) return CalendarCheck;
  return Stamp;
}

function bucket(iso: string): "today" | "yesterday" | "earlier" {
  const d = new Date(iso);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (d >= start) return "today";
  start.setDate(start.getDate() - 1);
  return d >= start ? "yesterday" : "earlier";
}

export function NotificationsPage() {
  const t = useTranslations("account.notifications");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const locale = useLocale();
  const queryClient = useQueryClient();
  const onError = useErrorToast();
  const notifications = useNotifications();
  const items = notifications.data?.pages.flatMap((p) => p.items) ?? [];
  const unread = notifications.data?.pages[0]?.unread ?? 0;

  const markLocal = (id: string | null) =>
    queryClient.setQueryData<InfiniteData<NotificationPage>>(accountKeys.notifications(locale), (data) =>
      data && {
        ...data,
        pages: data.pages.map((p, i) => ({
          ...p,
          unread: id ? Math.max(0, p.unread - (i === 0 ? 1 : 0)) : 0,
          items: p.items.map((n) => (!n.readAt && (id === null || n.id === id) ? { ...n, readAt: new Date().toISOString() } : n)),
        })),
      },
    );

  const readAll = useMutation({
    mutationFn: () => api("/me/notifications/read-all", { method: "POST" }),
    onSuccess: () => {
      markLocal(null);
      void queryClient.invalidateQueries({ queryKey: accountKeys.summary });
    },
    onError,
  });
  const readOne = (n: NotificationView) => {
    if (n.readAt) return;
    markLocal(n.id);
    void api(`/me/notifications/${n.id}/read`, { method: "POST" }).then(() => queryClient.invalidateQueries({ queryKey: accountKeys.summary }));
  };

  const groups = (["today", "yesterday", "earlier"] as const).map((key) => ({ key, items: items.filter((n) => bucket(n.createdAt) === key) })).filter((g) => g.items.length);

  return (
    <>
      <AccountHeader
        page={5}
        eyebrow={t("eyebrow")}
        title={t("title")}
        lead={t("lead")}
        actions={
          unread > 0 && (
            <Button variant="outline" onClick={() => readAll.mutate()} loading={readAll.isPending}>
              <CheckCheck aria-hidden />
              {t("markAll")}
            </Button>
          )
        }
      />
      {notifications.isError ? (
        <LoadError onRetry={() => notifications.refetch()} />
      ) : notifications.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : !items.length ? (
        <EmptyState icon={<BellOff />} title={t("empty")} description={t("emptyLead")} />
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((g) => (
            <section key={g.key} className="flex flex-col gap-3">
              <h2 className="eyebrow text-muted-foreground">{t(g.key)}</h2>
              <ul className="flex flex-col gap-2">
                <AnimatePresence initial={false}>
                  {g.items.map((n, i) => {
                    const Icon = iconFor(n);
                    const content = (
                      <>
                        <span className={cn("relative grid size-11 shrink-0 place-items-center rounded-2xl transition-colors", n.readAt ? "bg-muted text-muted-foreground" : "bg-foreground text-background")}>
                          <Icon className="size-[18px]" aria-hidden />
                          {!n.readAt && <span className="absolute -end-0.5 -top-0.5 size-3 rounded-full bg-primary ring-2 ring-surface" />}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className={cn("text-body", !n.readAt && "font-semibold")}>{n.title}</span>
                          {n.body && <span className="line-clamp-2 text-body-sm text-muted-foreground">{n.body}</span>}
                          <span className="text-caption text-muted-foreground">
                            {format.relativeTime(new Date(n.createdAt), now)}
                            {n.orderNumber && (
                              <>
                                {" · "}
                                <span lang="en" dir="ltr" className="font-mono">
                                  {n.orderNumber}
                                </span>
                              </>
                            )}
                          </span>
                        </span>
                      </>
                    );
                    const cls = cn("flex items-start gap-4 rounded-2xl border p-4 transition-colors", n.readAt ? "border-border bg-surface hover:bg-muted/50" : "border-gold-400/40 bg-gold-50/70 hover:bg-gold-50 dark:bg-gold-400/[0.07]");
                    return (
                      <motion.li key={n.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.45 }}>
                        {n.href ? (
                          <Link href={n.href} onClick={() => readOne(n)} className={cls}>
                            {content}
                          </Link>
                        ) : (
                          <button type="button" onClick={() => readOne(n)} className={cn(cls, "w-full text-start")}>
                            {content}
                          </button>
                        )}
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </section>
          ))}
          {notifications.hasNextPage && (
            <Button variant="outline" className="self-center" loading={notifications.isFetchingNextPage} onClick={() => notifications.fetchNextPage()}>
              {t("loadMore")}
            </Button>
          )}
        </div>
      )}
    </>
  );
}
