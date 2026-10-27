"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { useFieldControl } from "./field";

export const inputClasses = cn(
  "w-full rounded-xl border border-border-strong/70 bg-surface px-4 text-body text-foreground shadow-xs",
  "placeholder:text-muted-foreground/70 transition-[border-color,box-shadow] duration-200",
  "hover:border-border-strong focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15",
  "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70",
  "aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/15",
);

export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  const control = useFieldControl(props);
  return <input type={type} className={cn(inputClasses, "h-12", className)} {...props} {...control} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  const control = useFieldControl(props);
  return (
    <textarea className={cn(inputClasses, "min-h-28 resize-y py-3 field-sizing-content", className)} {...props} {...control} />
  );
}
