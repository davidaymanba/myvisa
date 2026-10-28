import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Wizard progress. Phones get a compact "step x of n" + segmented bar; wider screens get the full rail. */
export function Stepper({ steps, current, className }: { steps: readonly string[]; current: number; className?: string }) {
  const t = useTranslations("ui.stepper");
  const active = steps[current];

  return (
    <nav aria-label={t("label")} className={className}>
      <div className="sm:hidden">
        <div className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 truncate font-medium">{active}</span>
          <span className="tabular whitespace-nowrap text-caption text-muted-foreground">{t("stepOf", { current: current + 1, total: steps.length })}</span>
        </div>
        <div className="mt-3 flex gap-1.5" aria-hidden>
          {steps.map((s, i) => (
            <span key={s} className={cn("h-1 flex-1 rounded-full bg-muted transition-colors duration-500", i <= current && "bg-secondary")} />
          ))}
        </div>
      </div>

      <ol className="hidden items-center gap-3 sm:flex">
        {steps.map((step, i) => {
          const done = i < current;
          const isCurrent = i === current;
          return (
            <li key={step} className="flex flex-1 items-center gap-3 last:flex-none" aria-current={isCurrent ? "step" : undefined}>
              <span className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "tabular grid size-8 shrink-0 place-items-center rounded-full border text-caption font-semibold transition-all duration-300",
                    done && "border-secondary bg-secondary text-secondary-foreground",
                    isCurrent && "border-foreground bg-foreground text-background shadow-md",
                    !done && !isCurrent && "border-border-strong text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-4" strokeWidth={3} aria-hidden /> : i + 1}
                </span>
                <span className={cn("whitespace-nowrap text-body-sm", isCurrent ? "font-medium" : "text-muted-foreground", "max-lg:hidden", isCurrent && "max-lg:inline")}>
                  {step}
                </span>
              </span>
              {i < steps.length - 1 && (
                <span className="h-px flex-1 bg-border" aria-hidden>
                  <span className={cn("block h-full bg-secondary transition-[width] duration-500", done ? "w-full" : "w-0")} />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
