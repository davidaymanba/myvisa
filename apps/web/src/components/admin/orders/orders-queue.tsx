"use client";

import { ADMIN_ORDER_VIEWS, formatMoney, staffTransitions, type AdminOrderRow, type AdminOrderViewKey, type AppLocale, type OrderStatus } from "@myvisa/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlarmClock, FileSearch, KanbanSquare, MessageSquareText, Search, Table2, Ticket, UserRound } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState, type DragEvent } from "react";
import { statusTone } from "@/components/account/order-ticket";
import { Flag } from "@/components/brand/flag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "../page-header";
import { useCan, useMutationToasts } from "../use-admin";
import { MoveDialog } from "./move-dialog";
import { type QueueQuery, initials, moveOrder, useDue, useOrderPage } from "./use-orders";

const BOARD: OrderStatus[] = ["RECEIVED", "DOCUMENTS_REVIEW", "ACTION_REQUIRED", "APPOINTMENT_BOOKED", "SUBMITTED_TO_EMBASSY", "DECISION_ISSUED"];
const COLUMN_ACCENT: Partial<Record<OrderStatus, string>> = {
  RECEIVED: "bg-gold-400",
  DOCUMENTS_REVIEW: "bg-teal-400",
  ACTION_REQUIRED: "bg-warning",
  APPOINTMENT_BOOKED: "bg-info",
  SUBMITTED_TO_EMBASSY: "bg-teal-600",
  DECISION_ISSUED: "bg-success",
};

function useStoredMode(): ["board" | "table", (m: "board" | "table") => void] {
  const [mode, setMode] = useState<"board" | "table">("board");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mv-admin-orders-mode");
      if (saved === "table" || saved === "board") setMode(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);
  return [
    mode,
    (m) => {
      setMode(m);
      try {
        localStorage.setItem("mv-admin-orders-mode", m);
      } catch {
        /* storage unavailable */
      }
    },
  ];
}

export function OrdersQueue() {
  const t = useTranslations("admin.orders");
  const tc = useTranslations("admin.common");
  const [mode, setMode] = useStoredMode();
  const [view, setView] = useState<AdminOrderViewKey>("open");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Debounced search.
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [q]);

  const board = mode === "board" && view !== "closed";
  const query: QueueQuery = board ? { view, q: search || undefined, pageSize: 300 } : { view, q: search || undefined, page, pageSize: 50 };
  const orders = useOrderPage(query);

  return (
    <>
      <AdminPageHeader index="02" eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />

      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <LayoutGroup id="order-views">
          <div data-lenis-prevent className="flex flex-wrap gap-1.5 max-sm:-mx-4 max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:px-4 max-sm:pb-1 max-sm:[scrollbar-width:none]" role="tablist">
            {ADMIN_ORDER_VIEWS.map((v) => (
              <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => (setView(v), setPage(1))} className={cn("relative shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-body-sm font-medium transition-colors", view === v ? "text-background" : "text-muted-foreground hover:text-foreground")}>
                {view === v && <motion.span layoutId="order-view-pill" className={cn("absolute inset-0 -z-10 rounded-full", v === "overdue" ? "bg-danger" : "bg-foreground")} transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                {t(`views.${v}`)}
              </button>
            ))}
          </div>
        </LayoutGroup>
        <div className="flex items-center gap-2">
          <label className="relative min-w-0 flex-1 xl:w-80">
            <Search className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} className="ps-11" />
          </label>
          <div className="flex shrink-0 rounded-full bg-muted p-1" role="radiogroup">
            {(["board", "table"] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} aria-label={t(m)} title={t(m)} onClick={() => setMode(m)} className={cn("grid size-10 place-items-center rounded-full transition-colors", mode === m ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground")}>
                {m === "board" ? <KanbanSquare className="size-[18px]" aria-hidden /> : <Table2 className="size-[18px]" aria-hidden />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {orders.isError ? (
        <ErrorState icon={<Ticket />} title={t("empty")} onRetry={() => orders.refetch()} retryLabel={tc("retry")} />
      ) : !orders.data ? (
        <div className="flex gap-4 overflow-hidden">
          {BOARD.slice(0, 4).map((s) => (
            <Skeleton key={s} className="h-[28rem] w-[min(18rem,calc(100vw-4rem))] shrink-0 rounded-3xl" />
          ))}
        </div>
      ) : board ? (
        <Board rows={orders.data.items} counts={orders.data.counts} />
      ) : (
        <OrdersTable rows={orders.data.items} total={orders.data.total} page={page} pageSize={50} onPage={setPage} />
      )}
    </>
  );
}

function Board({ rows, counts }: { rows: AdminOrderRow[]; counts: Partial<Record<OrderStatus, number>> }) {
  const t = useTranslations("admin.orders");
  const tb = useTranslations("ui.boardingPass");
  const td = useTranslations("admin.desk");
  const can = useCan();
  const queryClient = useQueryClient();
  const toasts = useMutationToasts();
  const [dragging, setDragging] = useState<AdminOrderRow | null>(null);
  const [over, setOver] = useState<OrderStatus | null>(null);
  const [pending, setPending] = useState<{ row: AdminOrderRow; to: OrderStatus } | null>(null);
  const writable = can("orders:write");

  const move = useMutation({
    mutationFn: (v: { customerNote: string | null; decision: string | null }) => moveOrder(pending!.row.id, { to: pending!.to, ...v }),
    onSuccess: () => {
      toasts.success(td("moved"));
      setPending(null);
      void queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: toasts.error,
  });

  const allowed = useMemo(() => (dragging ? staffTransitions(dragging.status) : []), [dragging]);
  const grouped = BOARD.map((s) => ({ status: s, items: rows.filter((r) => r.status === s) }));

  const drop = (e: DragEvent, status: OrderStatus) => {
    e.preventDefault();
    setOver(null);
    if (dragging && allowed.includes(status)) setPending({ row: dragging, to: status });
    setDragging(null);
  };

  return (
    <>
      <div data-lenis-prevent className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-6 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
        {grouped.map((col, ci) => {
          const target = dragging && allowed.includes(col.status);
          return (
            <motion.section
              key={col.status}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: dragging && !target && dragging.status !== col.status ? 0.45 : 1, y: 0 }}
              transition={{ delay: ci * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              onDragOver={(e) => {
                if (target) {
                  e.preventDefault();
                  setOver(col.status);
                }
              }}
              onDragLeave={() => setOver((o) => (o === col.status ? null : o))}
              onDrop={(e) => drop(e, col.status)}
              className={cn(
                "flex w-[min(19rem,calc(100vw-4rem))] shrink-0 snap-start flex-col rounded-[1.75rem] border bg-surface-sunken/60 transition-[border-color,background-color,box-shadow]",
                target ? "border-dashed border-gold-400 bg-gold-50/60 dark:bg-gold-400/[0.06]" : "border-border",
                over === col.status && "shadow-gold ring-4 ring-gold-400/25",
              )}
              aria-label={tb(`statuses.${col.status}`)}
            >
              <header className="relative flex items-center justify-between gap-2 overflow-hidden rounded-t-[1.75rem] px-4 pb-3 pt-4">
                <span className={cn("absolute inset-x-0 top-0 h-1", COLUMN_ACCENT[col.status])} aria-hidden />
                <h2 className="font-medium">{tb(`statuses.${col.status}`)}</h2>
                <span className="tabular grid h-6 min-w-6 place-items-center rounded-full bg-foreground px-2 text-caption font-semibold text-background">{counts[col.status] ?? 0}</span>
              </header>
              <ul className="flex min-h-40 flex-1 flex-col gap-2.5 px-3 pb-3">
                <AnimatePresence initial={false}>
                  {col.items.map((row) => (
                    <OrderCard key={row.id} row={row} draggable={writable} onDragStart={() => setDragging(row)} onDragEnd={() => (setDragging(null), setOver(null))} lifted={dragging?.id === row.id} />
                  ))}
                </AnimatePresence>
                {target && (
                  <li className="grid place-items-center rounded-2xl border-2 border-dashed border-gold-400/60 py-6 text-caption font-medium text-accent-text" aria-hidden>
                    {t("dropHere")}
                  </li>
                )}
              </ul>
            </motion.section>
          );
        })}
      </div>
      <MoveDialog to={pending?.to ?? null} onClose={() => setPending(null)} onConfirm={(v) => move.mutate(v)} pending={move.isPending} />
    </>
  );
}

function OrderCard({ row, draggable, onDragStart, onDragEnd, lifted }: { row: AdminOrderRow; draggable: boolean; onDragStart: () => void; onDragEnd: () => void; lifted: boolean }) {
  const t = useTranslations("admin.orders");
  const locale = useLocale() as AppLocale;
  const due = useDue();
  const router = useRouter();
  return (
    <motion.li layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: lifted ? 0.4 : 1, scale: 1, rotate: lifted ? -2 : 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: "spring", stiffness: 380, damping: 30 }}>
      <div
        draggable={draggable}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", row.id);
          onDragStart();
        }}
        onDragEnd={onDragEnd}
        onClick={() => router.push(`/admin/orders/${row.id}`)}
        onKeyDown={(e) => e.key === "Enter" && router.push(`/admin/orders/${row.id}`)}
        role="link"
        tabIndex={0}
        className={cn(
          "group relative flex cursor-pointer flex-col gap-3 overflow-hidden rounded-2xl border bg-surface p-3.5 shadow-xs transition-[box-shadow,transform,border-color] hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring",
          draggable && "active:cursor-grabbing",
          row.overdue ? "border-danger/50" : "border-border",
        )}
      >
        {row.overdue && <span className="absolute inset-y-0 start-0 w-1 animate-pulse bg-danger" aria-hidden />}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col">
            <span lang="en" dir="ltr" className="font-mono text-caption font-semibold tracking-wider text-muted-foreground rtl:text-end">
              {row.number}
            </span>
            <span className="truncate font-medium">
              {row.customer.name ?? (
                <span dir="ltr" className="tabular">
                  {row.customer.phone}
                </span>
              )}
            </span>
          </div>
          {row.destination && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-2 py-1 text-caption font-medium">
              <Flag code={row.destination.iso2} className="h-3 w-4 rounded-[2px]" />
              <span lang="en">{row.destination.iata}</span>
            </span>
          )}
        </div>
        <p className="truncate text-caption text-muted-foreground">
          {row.service[locale]} · {t("travelers", { count: row.travelers })}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {row.slaDueAt && (
            <Badge tone={row.overdue ? "danger" : "neutral"}>
              <AlarmClock aria-hidden />
              {due(row.slaDueAt)}
            </Badge>
          )}
          {row.pendingDocuments > 0 && (
            <Badge tone="info">
              <FileSearch aria-hidden />
              {row.pendingDocuments}
            </Badge>
          )}
          {row.unreadMessages > 0 && (
            <Badge tone="gold">
              <MessageSquareText aria-hidden />
              {row.unreadMessages}
            </Badge>
          )}
          <span className="ms-auto" title={row.assignee?.name ?? t("unassigned")}>
            {row.assignee ? (
              <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-teal-300 to-teal-700 text-[0.65rem] font-semibold text-white">{initials(row.assignee.name)}</span>
            ) : (
              <span className="grid size-7 place-items-center rounded-full border border-dashed border-border-strong text-muted-foreground">
                <UserRound className="size-3.5" aria-hidden />
              </span>
            )}
          </span>
        </div>
      </div>
    </motion.li>
  );
}

function OrdersTable({ rows, total, page, pageSize, onPage }: { rows: AdminOrderRow[]; total: number; page: number; pageSize: number; onPage: (p: number) => void }) {
  const t = useTranslations("admin.orders");
  const tb = useTranslations("ui.boardingPass");
  const locale = useLocale() as AppLocale;
  const due = useDue();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (!rows.length) return <EmptyState icon={<Ticket />} title={t("empty")} description={t("emptyBody")} />;
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((r, i) => (
          <motion.li key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 15) * 0.02 }}>
            <Link href={`/admin/orders/${r.id}`} className={cn("relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-surface p-4 shadow-xs", r.overdue ? "border-danger/50" : "border-border")}>
              {r.overdue && <span className="absolute inset-y-0 start-0 w-1 bg-danger" aria-hidden />}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span lang="en" dir="ltr" className="font-mono text-body-sm font-semibold tracking-wider text-secondary-text">
                  {r.number}
                </span>
                <Badge tone={statusTone(r.status)} dot>
                  {tb(`statuses.${r.status}`)}
                </Badge>
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{r.customer.name ?? "—"}</span>
                  <span dir="ltr" className="tabular truncate text-caption text-muted-foreground rtl:text-end">
                    {r.customer.phone}
                  </span>
                </div>
                <span className="tabular shrink-0 font-medium">{formatMoney(r.totalHalalas, locale, { fractionDigits: 2 })}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-caption text-muted-foreground">
                <span className="flex min-w-0 items-center gap-1.5">
                  {r.destination && <Flag code={r.destination.iso2} className="h-3 w-4 shrink-0 rounded-[2px]" />}
                  <span className="truncate">{r.destination?.name[locale] ?? r.service[locale]}</span>
                </span>
                {r.slaDueAt && (
                  <span className={cn("flex items-center gap-1", r.overdue && "font-semibold text-danger")}>
                    <AlarmClock className="size-3.5" aria-hidden />
                    {due(r.slaDueAt)}
                  </span>
                )}
                <span className="ms-auto flex items-center gap-1">
                  <UserRound className="size-3.5" aria-hidden />
                  {r.assignee?.name ?? t("unassigned")}
                </span>
              </div>
            </Link>
          </motion.li>
        ))}
      </ul>
      <div data-lenis-prevent className="overflow-x-auto rounded-[1.75rem] border border-border bg-surface max-md:hidden">
        <table className="w-full min-w-[56rem] text-body-sm">
          <thead>
            <tr className="border-b border-border text-caption text-muted-foreground">
              {(["number", "customer", "destination", "status", "sla", "assignee", "total"] as const).map((c) => (
                <th key={c} className="px-4 py-3 text-start font-medium">
                  {t(`columns.${c}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <motion.tr key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 15) * 0.02 }} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${r.id}`} lang="en" dir="ltr" className="font-mono font-semibold tracking-wider text-secondary-text hover:underline">
                    {r.number}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-medium">{r.customer.name ?? "—"}</span>
                    <span dir="ltr" className="tabular text-caption text-muted-foreground rtl:text-end">
                      {r.customer.phone}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2">
                    {r.destination && <Flag code={r.destination.iso2} className="h-3.5 w-5 rounded-[2px]" />}
                    {r.destination?.name[locale] ?? r.service[locale]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(r.status)} dot>
                    {tb(`statuses.${r.status}`)}
                  </Badge>
                </td>
                <td className={cn("px-4 py-3 text-caption", r.overdue ? "font-semibold text-danger" : "text-muted-foreground")}>{r.slaDueAt ? due(r.slaDueAt) : "—"}</td>
                <td className="px-4 py-3 text-caption">{r.assignee?.name ?? <span className="text-muted-foreground">{t("unassigned")}</span>}</td>
                <td className="tabular px-4 py-3 font-medium">{formatMoney(r.totalHalalas, locale, { fractionDigits: 2 })}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3 text-body-sm text-muted-foreground max-sm:flex-wrap">
        <span>{t("results", { count: total })}</span>
        <div className="flex items-center gap-2 max-sm:ms-auto">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            {t("prev")}
          </Button>
          <span className="tabular">{t("page", { page, pages })}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
            {t("next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
