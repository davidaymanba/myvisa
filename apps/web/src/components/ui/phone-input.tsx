"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { useFieldControl } from "./field";

/** Saudi mobile input. Always LTR (numbers read left-to-right even in Arabic UI). Normalise with `saudiMobileSchema`. */
export function PhoneInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const control = useFieldControl(props);
  return (
    <div
      dir="ltr"
      className={cn(
        "flex h-12 w-full items-center overflow-hidden rounded-xl border border-border-strong/70 bg-surface shadow-xs transition-[border-color,box-shadow] duration-200",
        "hover:border-border-strong has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-4 has-[input:focus-visible]:ring-ring/15",
        "has-[input[aria-invalid=true]]:border-danger has-[input:disabled]:bg-muted has-[input:disabled]:opacity-70",
        className,
      )}
    >
      <span className="flex h-full items-center gap-2 border-e border-border bg-surface-sunken/60 px-3.5 text-body-sm font-medium text-foreground/80">
        {/* eslint-disable-next-line @next/next/no-img-element -- static flag svg */}
        <img src="/flags/sa.svg" alt="" width={20} height={14} className="h-3.5 w-5 rounded-[2px]" />
        <span className="tabular">+966</span>
      </span>
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="5X XXX XXXX"
        className="tabular h-full min-w-0 flex-1 bg-transparent px-3.5 text-body tracking-wide outline-none placeholder:text-muted-foreground/60"
        {...props}
        {...control}
      />
    </div>
  );
}
