"use client";

import { Plus, Ticket } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { OrderTicket } from "./order-ticket";
import { AccountHeader, LoadError } from "./page-header";
import { type ORDER_GROUPS, isIn, useOrders } from "./use-account";

type Filter = keyof typeof ORDER_GROUPS | "all";
const FILTERS: Filter[] = ["active", "drafts", "done", "all"];

export function OrdersPage() {
  const t = useTranslations("account.orders");
  const tn = useTranslations("account.nav");
  const orders = useOrders();
  const [filter, setFilter] = useState<Filter>("active");
  const count = (f: Filter) => orders.data?.filter((o) => f === "all" || isIn(f, o.status)).length ?? 0;
  // Land on the first non-empty tab.
  const effective: Filter = orders.data && count(filter) === 0 && filter === "active" ? (FILTERS.find((f) => count(f) > 0) ?? "active") : filter;
  const shown = orders.data?.filter((o) => effective === "all" || isIn(effective, o.status)) ?? [];

  return (
    <>
      <AccountHeader
        page={2}
        eyebrow={t("eyebrow")}
        title={t("title")}
        lead={t("lead")}
        actions={
          <Button asChild size="lg">
            <Link href="/apply">
              <Plus aria-hidden />
              {tn("newApplication")}
            </Link>
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label={t("eyebrow")}>
        {FILTERS.map((f) => {
          const active = effective === f;
          return (
            <button key={f} type="button" role="tab" aria-selected={active} onClick={() => setFilter(f)} className={cn("relative flex items-center gap-2 rounded-full px-4 py-2 text-body-sm font-medium transition-colors", active ? "text-background" : "text-muted-foreground hover:text-foreground")}>
              {active && <motion.span layoutId="orders-filter" className="absolute inset-0 -z-10 rounded-full bg-foreground" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              {t(`filters.${f}`)}
              {orders.data && <span className={cn("tabular grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[0.7rem]", active ? "bg-background/20" : "bg-muted")}>{count(f)}</span>}
            </button>
          );
        })}
      </div>

      {orders.isError ? (
        <LoadError onRetry={() => orders.refetch()} />
      ) : orders.isLoading ? (
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 rounded-[1.75rem]" />
          ))}
        </div>
      ) : shown.length ? (
        <motion.div layout className="flex flex-col gap-4">
          <AnimatePresence mode="popLayout">
            {shown.map((o, i) => (
              <OrderTicket key={o.id} order={o} index={i} />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <EmptyState
          icon={<Ticket />}
          title={t("empty")}
          description={t("emptyLead")}
          action={
            <Button asChild>
              <Link href="/apply">{tn("newApplication")}</Link>
            </Button>
          }
        />
      )}
    </>
  );
}
