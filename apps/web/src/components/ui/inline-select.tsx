"use client";

import { ChevronDown } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SelectContent, SelectItem } from "./select";

export interface InlineOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

/** A select that reads as part of a sentence: "I am [a Saudi citizen ▾] travelling to [Turkey ▾]". */
export function InlineSelect({
  value,
  onValueChange,
  options,
  label,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: InlineOption[];
  label: string;
  className?: string;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        aria-label={label}
        className={cn(
          "group inline-flex max-w-full items-center gap-1.5 rounded-lg px-1 align-baseline text-gold-300 outline-none transition-colors",
          "bg-[linear-gradient(currentColor,currentColor)] bg-[length:100%_1.5px] bg-bottom bg-no-repeat hover:text-gold-200",
          "focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        {current?.icon}
        <span className="truncate">{current?.label}</span>
        <ChevronDown className="size-[0.6em] shrink-0 opacity-70 transition-transform duration-300 group-data-[state=open]:rotate-180" aria-hidden />
      </SelectPrimitive.Trigger>
      <SelectContent className="max-h-80">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            <span className="flex items-center gap-2.5">
              {o.icon}
              {o.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </SelectPrimitive.Root>
  );
}
