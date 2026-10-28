"use client";

import { RefreshCw, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { FadeIn } from "@/components/motion/fade-in";
import { SplitReveal } from "@/components/motion/split-reveal";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";
import { cn } from "@/lib/utils";

/** Account page opener: a numbered "passport page" eyebrow, a word-reveal title, lead and actions. */
export function AccountHeader({ page, eyebrow, title, lead, actions, className }: { page: number; eyebrow: string; title: string; lead?: ReactNode; actions?: ReactNode; className?: string }) {
  const t = useTranslations("account.nav");
  return (
    <header className={cn("flex flex-col gap-5 pb-8 sm:pb-10 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="flex max-w-3xl flex-col gap-3.5">
        <FadeIn>
          <p className="eyebrow flex items-center gap-3 text-accent-text">
            <span lang="en" className="grid size-7 place-items-center rounded-full border border-dashed border-current font-display text-[0.7rem]" aria-label={t("page", { n: page })}>
              {String(page).padStart(2, "0")}
            </span>
            {eyebrow}
          </p>
        </FadeIn>
        <SplitReveal as="h1" trigger="mount" delay={0.05} className="text-[clamp(2.1rem,1.3rem+3vw,4rem)] font-medium leading-[1.02] tracking-[-0.03em] [:lang(ar)_&]:leading-[1.3]" lines={[{ text: title }]} />
        {lead && (
          <FadeIn delay={0.2}>
            <p className="max-w-2xl text-body-lg text-muted-foreground">{lead}</p>
          </FadeIn>
        )}
      </div>
      {actions && (
        <FadeIn delay={0.25} className="flex flex-wrap items-center gap-3">
          {actions}
        </FadeIn>
      )}
    </header>
  );
}

export function LoadError({ onRetry, className }: { onRetry: () => void; className?: string }) {
  const t = useTranslations("account.common");
  return (
    <ErrorState
      icon={<WifiOff />}
      title={t("loadError")}
      description={t("loadErrorLead")}
      className={className}
      onRetry={onRetry}
      retryLabel={t("retry")}
    />
  );
}

/** Small "retry" link for secondary panels. */
export function RetryLink({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("account.common");
  return (
    <Button variant="link" size="sm" onClick={onRetry}>
      <RefreshCw aria-hidden />
      {t("retry")}
    </Button>
  );
}
