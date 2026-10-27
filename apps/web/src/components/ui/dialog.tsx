"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/** Centered modal on ≥sm; native-feeling bottom sheet on phones. */
export function DialogContent({
  className,
  children,
  closeLabel,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { closeLabel: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink-950/50 backdrop-blur-[2px] data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-3xl border border-border bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-lg",
          "data-[state=open]:animate-sheet-in data-[state=closed]:animate-sheet-out",
          "sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[85dvh] sm:w-[min(32rem,calc(100vw-2rem))] sm:rounded-3xl sm:p-8",
          "sm:data-[state=open]:animate-dialog-in sm:data-[state=closed]:animate-dialog-out",
          className,
        )}
        {...props}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border-strong sm:hidden" aria-hidden />
        {children}
        <DialogPrimitive.Close
          className="absolute end-4 top-4 grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={closeLabel}
        >
          <X className="size-4" aria-hidden />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("pe-8 font-display text-display-md", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("mt-2 text-body text-muted-foreground", className)} {...props} />;
}
