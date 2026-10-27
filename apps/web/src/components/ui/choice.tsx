"use client";

import { Check } from "lucide-react";
import { Checkbox as CheckboxPrimitive, RadioGroup as RadioPrimitive, Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "peer grid size-5 shrink-0 place-items-center rounded-[6px] border border-border-strong bg-surface shadow-xs transition-colors",
        "data-[state=checked]:border-secondary data-[state=checked]:bg-secondary data-[state=checked]:text-secondary-foreground",
        "aria-invalid:border-danger disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="data-[state=checked]:animate-pop-in">
        <Check className="size-3.5" strokeWidth={3} aria-hidden />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent bg-border-strong transition-colors",
        "data-[state=checked]:bg-secondary disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-white shadow-sm transition-transform duration-300 ease-[var(--ease-spring)]",
          "data-[state=unchecked]:translate-x-0 data-[state=checked]:translate-x-5 rtl:data-[state=checked]:-translate-x-5",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export const RadioGroup = ({ className, ...props }: ComponentProps<typeof RadioPrimitive.Root>) => (
  <RadioPrimitive.Root className={cn("grid gap-3", className)} {...props} />
);

export function Radio({ className, ...props }: ComponentProps<typeof RadioPrimitive.Item>) {
  return (
    <RadioPrimitive.Item
      className={cn(
        "peer grid size-5 shrink-0 place-items-center rounded-full border border-border-strong bg-surface shadow-xs",
        "data-[state=checked]:border-secondary disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator className="size-2.5 rounded-full bg-secondary data-[state=checked]:animate-pop-in" />
    </RadioPrimitive.Item>
  );
}

/** Large selectable tile — used for travel purpose, insurance plan, appointment slot. */
export function RadioCard({
  className,
  icon,
  title,
  description,
  ...props
}: ComponentProps<typeof RadioPrimitive.Item> & { icon?: ReactNode; title: ReactNode; description?: ReactNode }) {
  return (
    <RadioPrimitive.Item
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-start shadow-xs transition-all duration-200",
        "hover:border-border-strong hover:shadow-sm",
        "data-[state=checked]:border-secondary data-[state=checked]:shadow-[0_0_0_1px_var(--secondary)] data-[state=checked]:bg-secondary/[0.04]",
        className,
      )}
      {...props}
    >
      {icon && (
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-foreground transition-colors group-data-[state=checked]:bg-secondary group-data-[state=checked]:text-secondary-foreground [&_svg]:size-5">
          {icon}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-body font-medium">{title}</span>
        {description && <span className="text-body-sm text-muted-foreground">{description}</span>}
      </span>
      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-border-strong group-data-[state=checked]:border-secondary group-data-[state=checked]:bg-secondary">
        <Check className="size-3 text-secondary-foreground opacity-0 group-data-[state=checked]:opacity-100" strokeWidth={3} aria-hidden />
      </span>
    </RadioPrimitive.Item>
  );
}
