"use client";

import { formatMoney, toLatinDigits, type AppLocale } from "@myvisa/shared";
import { AlertTriangle, ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ComponentProps, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/choice";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useFieldControl } from "@/components/ui/field";
import { inputClasses } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Numbered editorial section: big index, title and hint on the start side, fields on the end side. */
export function FormSection({ index, title, hint, children, className }: { index: string; title: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("grid gap-6 border-t border-border py-8 first:border-t-0 first:pt-0 lg:grid-cols-12 lg:gap-10", className)}>
      <header className="flex flex-col gap-2 lg:col-span-4">
        <span lang="en" className="font-display text-display-md leading-none text-accent-text/70 tabular">
          {index}
        </span>
        <h2 className="font-display text-heading">{title}</h2>
        {hint && <p className="max-w-xs text-body-sm text-muted-foreground">{hint}</p>}
      </header>
      <div className="grid gap-5 lg:col-span-8">{children}</div>
    </section>
  );
}

/** Arabic and English versions of a field side by side, each typed in its own direction. */
export function Bilingual({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-5 sm:grid-cols-2", className)}>{children}</div>;
}

/** Switch with a label and optional hint, as one clickable row. */
export function ToggleRow({ label, hint, checked, onCheckedChange, disabled }: { label: string; hint?: string; checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={cn("flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-border bg-surface px-4 py-3.5 transition-colors hover:border-border-strong", checked && "border-secondary/40 bg-secondary/[0.04]", disabled && "cursor-not-allowed opacity-60")}>
      <span className="flex flex-col gap-0.5">
        <span className="text-body-sm font-medium">{label}</span>
        {hint && <span className="text-caption text-muted-foreground">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </label>
  );
}

/**
 * SAR amount in the UI, integer halalas in the form. Accepts Arabic digits and "1,234.50".
 * Controlled so the halalas value is never a float.
 */
export function MoneyInput({ value, onChange, disabled, className, ...rest }: { value: number; onChange: (halalas: number) => void; disabled?: boolean; className?: string } & Pick<ComponentProps<"input">, "id" | "aria-describedby" | "aria-invalid" | "name">) {
  const control = useFieldControl(rest);
  const t = useTranslations("admin.common");
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value / 100).toFixed(2).replace(/\.00$/, "");
  return (
    <div dir="ltr" className={cn(inputClasses, "flex h-12 items-center gap-2 px-0 focus-within:border-ring focus-within:ring-4 focus-within:ring-ring/15", disabled && "bg-muted opacity-70", className)}>
      <span className="ps-4 text-body-sm font-medium text-muted-foreground">{t("sar")}</span>
      <input
        {...control}
        inputMode="decimal"
        disabled={disabled}
        value={shown}
        onChange={(e) => {
          const raw = toLatinDigits(e.target.value).replace(/[^\d.]/g, "");
          setDraft(raw);
          const n = Number.parseFloat(raw);
          onChange(Number.isFinite(n) ? Math.round(n * 100) : 0);
        }}
        onBlur={() => setDraft(null)}
        className="tabular h-full w-0 min-w-0 flex-1 bg-transparent pe-4 text-body outline-none"
      />
    </div>
  );
}

export function useMoney() {
  const locale = useLocale() as AppLocale;
  return (halalas: number) => formatMoney(halalas, locale, { fractionDigits: halalas % 100 === 0 ? 0 : 2 });
}

/**
 * Floating save bar: slides up when the form is dirty. Keeps Save reachable on long editors
 * and makes "you have unsaved changes" impossible to miss.
 */
export function SaveBar({ visible, saving, onDiscard, label, saveLabel }: { visible: boolean; saving: boolean; onDiscard: () => void; label?: string; saveLabel?: string }) {
  const t = useTranslations("admin.common");
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:ps-72"
        >
          <div className="dark pointer-events-auto flex w-full max-w-2xl items-center gap-2 rounded-full border border-white/10 bg-ink-900/95 py-2 pe-2 ps-4 sm:gap-3 sm:ps-5 text-foreground shadow-lg backdrop-blur-xl">
            <span className="relative flex size-2.5 shrink-0" aria-hidden>
              <span className="absolute inset-0 animate-ping rounded-full bg-gold-400/70" />
              <span className="relative size-2.5 rounded-full bg-gold-400" />
            </span>
            <span className="min-w-0 flex-1 truncate text-body-sm max-sm:whitespace-normal max-sm:text-caption max-sm:leading-snug">{label ?? t("unsaved")}</span>
            <Button type="button" variant="ghost" size="sm" className="shrink-0 max-[359px]:px-2.5" onClick={onDiscard} disabled={saving}>
              {t("discard")}
            </Button>
            <Button type="submit" size="sm" className="shrink-0" loading={saving}>
              {saving ? t("saving") : (saveLabel ?? t("save"))}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Delete button that asks first. */
export function ConfirmDelete({ onConfirm, label, busy, size = "sm", iconOnly }: { onConfirm: () => unknown; label: string; busy?: boolean; size?: "sm" | "icon-sm"; iconOnly?: boolean }) {
  const t = useTranslations("admin.common");
  const tu = useTranslations("ui.dialog");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="ghost" size={iconOnly ? "icon-sm" : size} className="text-danger hover:bg-danger-soft" onClick={() => setOpen(true)} aria-label={iconOnly ? label : undefined}>
        <Trash2 aria-hidden />
        {!iconOnly && label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={tu("close")}>
          <div className="flex flex-col items-start gap-4">
            <span className="grid size-12 place-items-center rounded-2xl bg-danger-soft text-danger">
              <AlertTriangle className="size-6" aria-hidden />
            </span>
            <DialogTitle>{t("confirmTitle")}</DialogTitle>
            <DialogDescription>{t("confirmBody")}</DialogDescription>
            <div className="mt-2 flex w-full flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {t("cancel")}
              </Button>
              <Button
                variant="danger"
                loading={busy}
                onClick={async () => {
                  await onConfirm();
                  setOpen(false);
                }}
              >
                {busy ? t("deleting") : label}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Up/down reorder controls (keyboard- and screen-reader-friendly; no drag needed). */
export function ReorderButtons({ onUp, onDown, first, last, disabled }: { onUp: () => void; onDown: () => void; first: boolean; last: boolean; disabled?: boolean }) {
  const t = useTranslations("admin.common");
  return (
    <span className="inline-flex flex-col">
      <button type="button" onClick={onUp} disabled={first || disabled} aria-label={t("moveUp")} className="grid size-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-25">
        <ArrowUp className="size-3.5" aria-hidden />
      </button>
      <button type="button" onClick={onDown} disabled={last || disabled} aria-label={t("moveDown")} className="grid size-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-25">
        <ArrowDown className="size-3.5" aria-hidden />
      </button>
    </span>
  );
}
