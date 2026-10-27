import type { ReactNode } from "react";
import { SplitReveal } from "@/components/motion/split-reveal";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

/** Editorial section opener: numbered eyebrow, two-tone split-reveal headline, optional lead + action. */
export function SectionHeading({
  index,
  eyebrow,
  title,
  accent,
  lead,
  action,
  className,
  align = "start",
}: {
  index?: string;
  eyebrow: string;
  title: string;
  accent?: string;
  lead?: ReactNode;
  action?: ReactNode;
  className?: string;
  align?: "start" | "center";
}) {
  return (
    <div className={cn("flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between", align === "center" && "items-center text-center lg:flex-col lg:items-center", className)}>
      <div className={cn("flex max-w-4xl flex-col gap-5", align === "center" && "items-center")}>
        <Reveal>
          <p className="eyebrow flex items-center gap-3 text-accent-text">
            {index && (
              <span lang="en" className="tabular">
                {index}
              </span>
            )}
            <span className="h-px w-8 bg-current" aria-hidden />
            {eyebrow}
          </p>
        </Reveal>
        <SplitReveal
          className="text-[clamp(2.4rem,1.5rem+4vw,5.25rem)] font-medium leading-[1.02] tracking-[-0.025em] [:lang(ar)_&]:leading-[1.25]"
          lines={[{ text: title }, ...(accent ? [{ text: accent, className: "text-accent-text ltr:italic" }] : [])]}
        />
      </div>
      {(lead || action) && (
        <Reveal delay={0.15} className={cn("flex max-w-sm flex-col gap-5", align === "center" && "items-center")}>
          {lead && <p className="text-body-lg text-muted-foreground">{lead}</p>}
          {action}
        </Reveal>
      )}
    </div>
  );
}
