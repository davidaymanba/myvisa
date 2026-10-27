import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium",
    "transition-[background-color,color,box-shadow,transform,border-color] duration-200 ease-[var(--ease-out-expo)]",
    "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover hover:shadow-gold",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary-hover",
        ink: "bg-foreground text-background shadow-sm hover:bg-foreground/90",
        outline: "border border-border-strong bg-transparent text-foreground hover:border-foreground/40 hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        link: "rounded-sm px-0 text-secondary-text underline decoration-1 underline-offset-4 hover:decoration-2",
        danger: "bg-danger text-white shadow-sm hover:bg-danger/90 dark:text-ink-950",
      },
      size: {
        sm: "h-9 px-4 text-body-sm [&_svg]:size-4",
        md: "h-11 px-5 text-body [&_svg]:size-[18px]",
        lg: "h-14 px-7 text-body-lg [&_svg]:size-5",
        icon: "size-11 [&_svg]:size-5",
        "icon-sm": "size-9 [&_svg]:size-4",
      },
      block: { true: "w-full" },
    },
    compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export function Button({ className, variant, size, block, asChild, loading, disabled, children, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <LoaderCircle className="animate-spin" aria-hidden />}
          {children}
        </>
      )}
    </Comp>
  );
}
