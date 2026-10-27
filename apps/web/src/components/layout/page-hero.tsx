import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { FadeIn } from "@/components/motion/fade-in";
import { SplitReveal } from "@/components/motion/split-reveal";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export interface Crumb {
  href?: string;
  label: string;
}

/** Dark editorial opener for inner pages: breadcrumb, giant two-tone headline, lead, optional side visual. */
export function PageHero({
  eyebrow,
  title,
  accent,
  lead,
  crumbs = [],
  aside,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  lead?: ReactNode;
  crumbs?: Crumb[];
  aside?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const t = useTranslations("common");
  const trail: Crumb[] = [{ href: "/", label: t("breadcrumbHome") }, ...crumbs];

  return (
    <section data-surface="dark" className={cn("dark relative isolate overflow-hidden bg-ink-950 text-foreground", className)}>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -start-[15%] -top-[40%] size-[60vw] animate-drift rounded-full bg-teal-500/25 blur-[130px]" />
        <div className="absolute -bottom-[50%] end-0 size-[45vw] animate-drift rounded-full bg-gold-400/15 blur-[130px] [animation-delay:-7s]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(247_243_236/0.05)_1px,transparent_1px)] [background-size:calc(100%/12)_100%] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      </div>

      <div className="container-page grid gap-10 pb-16 pt-32 sm:pb-24 sm:pt-40 lg:grid-cols-12 lg:items-end">
        <div className="flex flex-col gap-6 lg:col-span-8">
          <FadeIn>
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-1.5 text-caption text-foreground/55">
                {trail.map((c, i) => (
                  <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
                    {c.href && i < trail.length - 1 ? (
                      <Link href={c.href} className="transition-colors hover:text-foreground">
                        {c.label}
                      </Link>
                    ) : (
                      <span aria-current={i === trail.length - 1 ? "page" : undefined} className="text-foreground/80">
                        {c.label}
                      </span>
                    )}
                    {i < trail.length - 1 && <ChevronLeft className="size-3.5 ltr:rotate-180" aria-hidden />}
                  </li>
                ))}
              </ol>
            </nav>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="eyebrow flex items-center gap-3 text-gold-300">
              <span className="h-px w-8 bg-current" aria-hidden />
              {eyebrow}
            </p>
          </FadeIn>
          <SplitReveal
            as="h1"
            trigger="mount"
            delay={0.15}
            className="text-[clamp(2.75rem,1.5rem+5.4vw,7rem)] font-medium leading-[0.98] tracking-[-0.03em] [:lang(ar)_&]:leading-[1.22]"
            lines={[{ text: title }, ...(accent ? [{ text: accent, className: "ltr:italic", wordClassName: "bg-gradient-to-l from-gold-200 via-gold-400 to-gold-300 bg-clip-text text-transparent pe-[0.06em]" }] : [])]}
          />
          {lead && (
            <FadeIn delay={0.5}>
              <p className="max-w-2xl text-body-lg text-foreground/70">{lead}</p>
            </FadeIn>
          )}
          {children}
        </div>
        {aside && (
          <FadeIn delay={0.4} className="lg:col-span-4">
            {aside}
          </FadeIn>
        )}
      </div>
    </section>
  );
}
