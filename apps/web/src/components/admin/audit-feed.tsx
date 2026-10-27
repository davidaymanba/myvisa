"use client";

import type { AuditLogRecord } from "@myvisa/shared";
import { ChevronDown, FilePen, FilePlus2, FileX2, Settings2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ICONS = { create: FilePlus2, update: FilePen, delete: FileX2, reorder: FilePen, handle: FilePen } as const;

export function timeAgo(iso: string, locale: string): string {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en", { numeric: "auto" });
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [["second", 60], ["minute", 60], ["hour", 24], ["day", 30], ["month", 12], ["year", Infinity]];
  let value = seconds;
  for (const [unit, size] of steps) {
    if (Math.abs(value) < size) return rtf.format(Math.round(value), unit);
    value /= size;
  }
  return "";
}

/** Keys whose values differ between two JSON snapshots (top level; timestamps ignored). */
function changedKeys(before: unknown, after: unknown): string[] {
  if (!before || !after || typeof before !== "object" || typeof after !== "object") return [];
  const a = before as Record<string, unknown>;
  const b = ((after as { value?: unknown }).value && "key" in (after as object) ? (after as { value: Record<string, unknown> }).value : after) as Record<string, unknown>;
  return Object.keys(b).filter((k) => !["updatedAt", "createdAt"].includes(k) && k in a && JSON.stringify(a[k]) !== JSON.stringify(b[k]));
}

const show = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));

export function AuditFeed({ items, compact }: { items: AuditLogRecord[]; compact?: boolean }) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <ol className="relative flex flex-col">
      <span aria-hidden className="absolute bottom-4 start-[1.15rem] top-4 w-px bg-gradient-to-b from-gold-400/60 via-border to-transparent" />
      {items.map((item, i) => {
        const verb = (item.action.split(".").at(-1) ?? "update") as keyof typeof ICONS;
        const Icon = item.entityType === "Setting" ? Settings2 : (ICONS[verb] ?? FilePen);
        const changed = changedKeys(item.before, item.after);
        const name = (locale === "ar" ? item.actor?.fullNameAr : item.actor?.fullNameEn) ?? item.actor?.phone ?? t("audit.system");
        const expanded = open === item.id;
        return (
          <motion.li key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.04, duration: 0.4 }} className="relative flex gap-4 py-3">
            <span className={cn("relative z-10 grid size-9 shrink-0 place-items-center rounded-full border border-border bg-surface shadow-xs", verb === "delete" ? "text-danger" : verb === "create" ? "text-success" : "text-secondary-text")}>
              <Icon className="size-4" aria-hidden />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <button type="button" disabled={compact || changed.length === 0} onClick={() => setOpen(expanded ? null : item.id)} className="flex w-full flex-wrap items-center gap-x-2 gap-y-1 text-start">
                <span className="font-medium">{name}</span>
                <code lang="en" dir="ltr" className="rounded-md bg-muted px-1.5 py-0.5 text-caption">
                  {item.action}
                </code>
                {changed.length > 0 && <Badge tone="teal">{t("audit.changes", { count: changed.length })}</Badge>}
                <span className="ms-auto text-caption text-muted-foreground">{timeAgo(item.createdAt, locale)}</span>
                {!compact && changed.length > 0 && <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", expanded && "rotate-180")} aria-hidden />}
              </button>
              {item.entityId && (
                <span lang="en" dir="ltr" className="truncate text-start text-caption text-muted-foreground [direction:ltr] rtl:text-end">
                  {item.entityType} · {item.entityId}
                </span>
              )}
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <dl className="mt-2 grid gap-2 rounded-2xl border border-border bg-surface-sunken/60 p-3 text-caption">
                      {changed.map((key) => {
                        const before = (item.before as Record<string, unknown>)[key];
                        const afterRoot = item.after as Record<string, unknown>;
                        const after = ("value" in afterRoot && "key" in afterRoot ? (afterRoot.value as Record<string, unknown>) : afterRoot)[key];
                        return (
                          <div key={key} className="grid gap-1 sm:grid-cols-[10rem_1fr]">
                            <dt lang="en" className="font-medium">
                              {key}
                            </dt>
                            <dd className="flex flex-col gap-0.5 break-words">
                              <span className="text-danger line-through decoration-danger/50">{show(before)}</span>
                              <span className="text-success">{show(after)}</span>
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
