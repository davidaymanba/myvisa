"use client";

import type { ReactNode } from "react";
import { FadeIn } from "@/components/motion/fade-in";
import { SplitReveal } from "@/components/motion/split-reveal";
import { cn } from "@/lib/utils";

/** Admin page opener: numbered eyebrow, oversized word-reveal title, lead and actions. */
export function AdminPageHeader({ index, eyebrow, title, accent, lead, actions, className }: { index?: string; eyebrow: string; title: string; accent?: string; lead?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <header className={cn("flex flex-col gap-6 pb-10 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="flex max-w-3xl flex-col gap-4">
        <FadeIn>
          <p className="eyebrow flex items-center gap-3 text-accent-text">
            {index && <span lang="en">{index}</span>}
            <span className="h-px w-8 bg-current" aria-hidden />
            {eyebrow}
          </p>
        </FadeIn>
        <SplitReveal
          as="h1"
          trigger="mount"
          delay={0.05}
          className="text-[clamp(2.4rem,1.4rem+3.6vw,4.75rem)] font-medium leading-[1] tracking-[-0.03em] [:lang(ar)_&]:leading-[1.25]"
          lines={[{ text: title }, ...(accent ? [{ text: accent, className: "ltr:italic", wordClassName: "bg-gradient-to-l from-gold-500 via-gold-400 to-teal-400 bg-clip-text text-transparent pe-[0.06em]" }] : [])]}
        />
        {lead && (
          <FadeIn delay={0.25}>
            <p className="max-w-xl text-body-lg text-muted-foreground">{lead}</p>
          </FadeIn>
        )}
      </div>
      {actions && (
        <FadeIn delay={0.3} className="flex flex-wrap items-center gap-3">
          {actions}
        </FadeIn>
      )}
    </header>
  );
}
