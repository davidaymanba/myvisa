"use client";

import { DECISIONS, type OrderStatus } from "@myvisa/shared";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Confirms a status change: the note the customer will read, and the embassy's decision when it's a decision. */
export function MoveDialog({ to, onClose, onConfirm, pending }: { to: OrderStatus | null; onClose: () => void; onConfirm: (v: { customerNote: string | null; decision: string | null }) => void; pending: boolean }) {
  const t = useTranslations("admin.desk");
  const to_ = useTranslations("admin.orders");
  const te = useTranslations("admin.errors");
  const td = useTranslations("admin.decisions");
  const tb = useTranslations("ui.boardingPass");
  const tc = useTranslations("admin.common");
  const [note, setNote] = useState("");
  const [decision, setDecision] = useState<string | null>(null);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    setNote("");
    setDecision(null);
    setTried(false);
  }, [to]);

  const needsNote = to === "ACTION_REQUIRED";
  const needsDecision = to === "DECISION_ISSUED";
  const valid = (!needsNote || note.trim().length > 0) && (!needsDecision || decision);

  return (
    <Dialog open={Boolean(to)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={tc("close")}>
        <DialogTitle className="pe-10">{to ? to_("moveTitle", { status: tb(`statuses.${to}`) }) : ""}</DialogTitle>
        <DialogDescription>{t("customerNoteHint")}</DialogDescription>
        <form
          className="mt-5 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTried(true);
            if (valid) onConfirm({ customerNote: note.trim() || null, decision });
          }}
        >
          {needsDecision && (
            <Field label={t("decision")} error={tried && !decision ? te("decision_required") : undefined}>
              <div role="radiogroup" className="grid grid-cols-3 gap-2">
                {DECISIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={decision === d}
                    onClick={() => setDecision(d)}
                    className={cn(
                      "rounded-2xl border px-3 py-3 text-body-sm font-medium transition-colors",
                      decision === d ? (d === "REJECTED" ? "border-danger bg-danger-soft text-danger" : "border-success bg-success-soft text-success") : "border-border hover:bg-muted",
                    )}
                  >
                    {td(d)}
                  </button>
                ))}
              </div>
            </Field>
          )}
          <Field label={t("customerNote")} optional={needsNote ? undefined : tc("optional")} error={tried && needsNote && !note.trim() ? te("note_required") : undefined}>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} dir="auto" />
          </Field>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              {tc("cancel")}
            </Button>
            <Button type="submit" loading={pending}>
              {t("confirmMove")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
