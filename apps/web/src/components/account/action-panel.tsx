"use client";

import type { AppLocale, OrderRequirementView, OrderView } from "@myvisa/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArchiveRestore, CheckCircle2, FileX2, Send } from "lucide-react";
import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { UploadSlot } from "@/components/apply/upload-slot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { accountKeys, useErrorToast, useRefreshAccount, useVault } from "./use-account";
import { ScanBadge, fileSize } from "./vault";

interface Slot {
  requirement: OrderRequirementView;
  travelerId: string | null;
  travelerName: string | null;
}

/** Required slots that currently have no usable (uploaded, clean, not rejected) file. */
function openSlots(order: OrderView): Slot[] {
  const usable = (r: string, tid: string | null) => order.documents.some((d) => d.requirementId === r && d.orderTravelerId === tid && d.document.uploaded && d.document.scanStatus !== "INFECTED" && d.reviewStatus !== "REJECTED");
  const rejected = (r: string, tid: string | null) => order.documents.some((d) => d.requirementId === r && d.orderTravelerId === tid && d.reviewStatus === "REJECTED");
  const slots: Slot[] = [];
  for (const r of order.requirements) {
    const targets = r.perTraveler ? order.travelers.filter((t) => !r.applicantType || r.applicantType === t.applicantType).map((t) => ({ id: t.id as string | null, name: `${t.givenNameEn} ${t.surnameEn}` as string | null })) : [{ id: null, name: null }];
    for (const tg of targets) {
      if ((r.isRequired || rejected(r.id, tg.id)) && (!usable(r.id, tg.id) || rejected(r.id, tg.id))) slots.push({ requirement: r, travelerId: tg.id, travelerName: tg.name });
    }
  }
  return slots;
}

/** ACTION_REQUIRED: what we asked for, what was rejected and why, replacements inline, then resubmit. */
export function ActionPanel({ order }: { order: OrderView }) {
  const t = useTranslations("account.order");
  const td = useTranslations("account.documents");
  const queryClient = useQueryClient();
  const refresh = useRefreshAccount();
  const onError = useErrorToast();
  const locale = useLocale() as AppLocale;
  const [picking, setPicking] = useState<Slot | null>(null);
  const slots = openSlots(order);
  const reload = () => void queryClient.invalidateQueries({ queryKey: accountKeys.order(order.id) });

  const resubmit = useMutation({
    mutationFn: () => api<OrderView>(`/orders/${order.id}/resubmit`, { method: "POST" }),
    onSuccess: (o) => {
      queryClient.setQueryData(accountKeys.order(order.id), o);
      void refresh();
      toast.success(t("resubmitted"));
    },
    onError,
  });

  return (
    <motion.section
      id="action"
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="relative scroll-mt-28 overflow-hidden rounded-[1.75rem] border-2 border-warning/50 bg-warning-soft/60 p-5 sm:p-7"
    >
      <div aria-hidden className="absolute -end-10 -top-10 size-40 rounded-full bg-warning/20 blur-3xl" />
      <header className="relative flex items-start gap-4">
        <motion.span animate={{ rotate: [0, -8, 8, -4, 0] }} transition={{ duration: 1.2, delay: 0.6, repeat: Infinity, repeatDelay: 4 }} className="grid size-12 shrink-0 place-items-center rounded-2xl bg-warning text-white">
          <AlertTriangle className="size-5" aria-hidden />
        </motion.span>
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-heading">{t("actionTitle")}</h2>
          <p className="text-body-sm text-muted-foreground">{t("actionLead")}</p>
        </div>
      </header>

      {order.statusNote && (
        <blockquote className="relative mt-5 rounded-2xl rounded-ss-sm bg-surface px-5 py-4 text-body shadow-xs">
          <span className="mb-1 block text-caption font-medium text-accent-text">{t("noteFromTeam")}</span>
          {order.statusNote}
        </blockquote>
      )}

      <ul className="relative mt-5 flex flex-col gap-4">
        {slots.map((slot, i) => {
          const rejected = order.documents.filter((d) => d.requirementId === slot.requirement.id && d.orderTravelerId === slot.travelerId && d.reviewStatus === "REJECTED");
          const others = order.documents.filter((d) => d.requirementId === slot.requirement.id && d.orderTravelerId === slot.travelerId && d.reviewStatus !== "REJECTED");
          return (
            <li key={`${slot.requirement.id}-${slot.travelerId}`} className="flex flex-col gap-2">
              {slot.travelerName && (
                <span lang="en" className="eyebrow text-muted-foreground">
                  {slot.travelerName}
                </span>
              )}
              {rejected.map((d) => (
                <div key={d.id} className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-surface px-4 py-3 text-body-sm">
                  <FileX2 className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate line-through decoration-danger/60" dir="auto">
                      {d.document.originalName}
                    </span>
                    {d.rejectionReason && <span className="font-medium text-danger">{t("reason", { reason: d.rejectionReason })}</span>}
                  </div>
                  <Badge tone="danger">{t("rejected")}</Badge>
                </div>
              ))}
              <ul>
                <UploadSlot orderId={order.id} requirement={slot.requirement} travelerId={slot.travelerId} documents={others} onChanged={reload} index={i} />
              </ul>
              <Button variant="link" size="sm" className="self-start" onClick={() => setPicking(slot)}>
                <ArchiveRestore aria-hidden />
                {td("fromVault")}
              </Button>
            </li>
          );
        })}
      </ul>

      <div className="relative mt-6 flex flex-col items-start gap-2 border-t border-warning/30 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className={cn("flex items-center gap-2 text-body-sm", order.documentsComplete ? "text-success" : "text-muted-foreground")}>
          {order.documentsComplete ? <CheckCircle2 className="size-5" aria-label="✓" /> : t("resubmitBlocked")}
        </p>
        <Button size="lg" disabled={!order.documentsComplete} loading={resubmit.isPending} onClick={() => resubmit.mutate()}>
          <Send className="flip-rtl" aria-hidden />
          {t("resubmit")}
        </Button>
      </div>

      <VaultPicker order={order} slot={picking} onClose={() => setPicking(null)} onAttached={reload} locale={locale} />
    </motion.section>
  );
}

/** Reuse a file from the vault for one requirement slot. */
export function VaultPicker({ order, slot, onClose, onAttached, locale }: { order: OrderView; slot: Slot | null; onClose: () => void; onAttached: () => void; locale: AppLocale }) {
  const t = useTranslations("account.documents");
  const tc = useTranslations("account.common");
  const vault = useVault();
  const onError = useErrorToast();
  const attach = useMutation({
    mutationFn: (documentId: string) => api(`/orders/${order.id}/documents/attach`, { method: "POST", body: { documentId, requirementId: slot!.requirement.id, orderTravelerId: slot!.travelerId } }),
    onSuccess: () => {
      onAttached();
      onClose();
    },
    onError,
  });
  const candidates = slot ? (vault.data ?? []).filter((d) => d.scanStatus === "CLEAN" && slot.requirement.acceptedMime.includes(d.mimeType) && d.sizeBytes <= slot.requirement.maxSizeMb * 1024 * 1024) : [];
  // The matching document type first.
  candidates.sort((a, b) => Number(b.type === slot?.requirement.documentType) - Number(a.type === slot?.requirement.documentType));

  return (
    <Dialog open={Boolean(slot)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={tc("close")} data-lenis-prevent>
        <DialogTitle className="pe-10">{t("pickTitle")}</DialogTitle>
        <DialogDescription>
          {slot?.requirement.title[locale]} — {t("pickLead")}
        </DialogDescription>
        {candidates.length ? (
          <ul className="mt-5 flex flex-col gap-2">
            {candidates.map((d) => (
              <li key={d.id} className="flex items-center gap-3 rounded-2xl border border-border p-3">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-body-sm font-medium">{t(`types.${d.type}`)}</span>
                  <span className="truncate text-caption text-muted-foreground" dir="auto">
                    {d.originalName} · {fileSize(d.sizeBytes)}
                  </span>
                </div>
                <ScanBadge status={d.scanStatus} />
                <Button size="sm" loading={attach.isPending && attach.variables === d.id} onClick={() => attach.mutate(d.id)}>
                  {t("use")}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 rounded-2xl bg-surface-sunken px-4 py-6 text-center text-body-sm text-muted-foreground">{t("pickEmpty")}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
