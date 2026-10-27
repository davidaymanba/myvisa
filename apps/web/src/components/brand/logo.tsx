import { cn } from "@/lib/utils";

/** Mark: a route arc leaving an origin ring — the journey we handle for you. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8 shrink-0", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="currentColor" />
      <circle cx="9" cy="23" r="2.6" fill="none" stroke="var(--color-sand-100)" strokeWidth="1.6" className="dark:stroke-ink-900" />
      <path d="M10.8 21.2 C 13 12, 19 8.5, 24.2 9.4" fill="none" stroke="var(--color-gold-400)" strokeWidth="2" strokeLinecap="round" strokeDasharray="0.1 3.6" />
      <circle cx="24" cy="9.5" r="2.4" fill="var(--color-gold-400)" />
    </svg>
  );
}

export function Logo({ className, withArabic = false }: { className?: string; withArabic?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-foreground", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span lang="en" dir="ltr" className="font-[family-name:var(--font-instrument)] text-[1.65rem] leading-none tracking-[-0.01em]">
          <em className="text-accent-text">my</em>visa
        </span>
        {withArabic && (
          <span lang="ar" className="mt-0.5 font-[family-name:var(--font-alexandria)] text-[0.7rem] font-medium leading-none text-muted-foreground">
            ماي فيزا
          </span>
        )}
      </span>
    </span>
  );
}
