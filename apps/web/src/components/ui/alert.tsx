import { cva, type VariantProps } from "class-variance-authority";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const alertVariants = cva("relative flex gap-3 rounded-2xl border p-4 text-body-sm [&>svg]:mt-0.5 [&>svg]:size-5 [&>svg]:shrink-0", {
  variants: {
    tone: {
      info: "border-info/20 bg-info-soft [&>svg]:text-info",
      success: "border-success/20 bg-success-soft [&>svg]:text-success",
      warning: "border-warning/25 bg-warning-soft [&>svg]:text-warning",
      danger: "border-danger/20 bg-danger-soft [&>svg]:text-danger",
    },
  },
  defaultVariants: { tone: "info" },
});

const icons = { info: Info, success: CircleCheck, warning: TriangleAlert, danger: CircleAlert } as const;

export function Alert({
  tone = "info",
  title,
  children,
  action,
  className,
  ...props
}: Omit<ComponentProps<"div">, "title"> & VariantProps<typeof alertVariants> & { title?: ReactNode; action?: ReactNode }) {
  const Icon = icons[tone ?? "info"];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn(alertVariants({ tone }), className)} {...props}>
      <Icon aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title && <p className="font-semibold text-foreground">{title}</p>}
        {children && <div className="text-foreground/80">{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
