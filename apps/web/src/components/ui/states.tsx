import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared frame for empty / error / offline states: an inked-ring emblem, a calm headline, one clear action. */
function StateFrame({
  icon,
  title,
  description,
  action,
  tone,
  className,
}: {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  tone: "neutral" | "danger";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border-strong px-6 py-12 text-center", className)}>
      <span
        className={cn(
          "relative grid size-20 place-items-center rounded-full border-2 border-double [&_svg]:size-8",
          tone === "danger" ? "border-danger/50 text-danger" : "border-secondary-text/40 text-secondary-text",
        )}
        style={{ borderWidth: 5 }}
      >
        {icon}
      </span>
      <div className="flex max-w-sm flex-col gap-1.5">
        <h3 className="font-display text-heading">{title}</h3>
        {description && <p className="text-body-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState(props: { icon: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return <StateFrame tone="neutral" {...props} />;
}

export function ErrorState({
  title,
  description,
  retryLabel,
  onRetry,
  icon,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  retryLabel?: string;
  onRetry?: () => void;
  icon: ReactNode;
  className?: string;
}) {
  return (
    <StateFrame
      tone="danger"
      icon={icon}
      title={title}
      description={description}
      className={className}
      action={
        onRetry &&
        retryLabel && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border-strong px-4 text-body-sm font-medium transition-colors hover:bg-muted"
          >
            <RefreshCw className="size-4" aria-hidden />
            {retryLabel}
          </button>
        )
      }
    />
  );
}
