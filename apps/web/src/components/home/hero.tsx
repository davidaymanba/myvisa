import type { AppLocale, Destination } from "@myvisa/shared";
import { Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { use } from "react";
import { SplitReveal } from "@/components/motion/split-reveal";
import { FadeIn } from "@/components/motion/fade-in";
import { getCatalog } from "@/lib/api/server";
import { HeroExperience, type SearchDestination } from "./hero-experience";

/** Slim, locale-resolved catalog for the client — keeps requirements/FAQs out of the JS bundle. */
function searchData(destinations: Destination[], locale: AppLocale): SearchDestination[] {
  return destinations.map((d) => ({
    slug: d.slug,
    iso2: d.iso2,
    iata: d.iata,
    lat: d.lat,
    lon: d.lon,
    name: d.name[locale],
    visas: d.visas.map((v) => ({
      purpose: v.purpose,
      kind: v.kind,
      name: v.name[locale],
      processingDays: v.processingDays,
      maxStayDays: v.maxStayDays,
      entry: v.entry,
      pricing: v.pricing.map((p) => ({
        applicant: p.applicant,
        eligible: p.eligible,
        governmentFee: p.governmentFee,
        serviceFee: p.serviceFee,
        reason: p.ineligibleReason?.[locale],
      })),
    })),
  }));
}

export function Hero() {
  const t = useTranslations("home.hero");
  const locale = useLocale() as AppLocale;
  const { destinations, nationalities } = use(getCatalog());

  return (
    <section data-surface="dark" className="dark relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-ink-950 text-foreground">
      {/* Light leaks + star dust */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -start-[20%] -top-[30%] size-[70vw] animate-drift rounded-full bg-teal-500/25 blur-[140px]" />
        <div className="absolute -bottom-[35%] end-[5%] size-[55vw] animate-drift rounded-full bg-gold-400/15 blur-[140px] [animation-delay:-9s]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgb(247_243_236/0.5)_1px,transparent_1px)] [background-size:56px_56px] opacity-[0.06] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-ink-950 to-transparent" />
      </div>

      <HeroExperience
        destinations={searchData(destinations, locale)}
        nationalities={nationalities.map((n) => ({ iso2: n.iso2, name: n.name[locale] }))}
        intro={
          <>
            <FadeIn delay={0.1}>
              <span className="inline-flex w-fit items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-caption text-foreground/80 backdrop-blur-md">
                <span className="relative flex size-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-[#25D366] opacity-70" />
                  <span className="relative size-2 rounded-full bg-[#25D366]" />
                </span>
                {t("live")}
              </span>
            </FadeIn>
            <SplitReveal
              as="h1"
              trigger="mount"
              delay={0.25}
              stagger={0.09}
              className="mt-6 text-[clamp(3rem,1.3rem+5.6vw,6.75rem)] font-medium leading-[0.98] tracking-[-0.03em] [:lang(ar)_&]:leading-[1.2]"
              lines={[
                { text: t("line1") },
                { text: t("line2"), className: "ltr:italic", wordClassName: "bg-gradient-to-l from-gold-200 via-gold-400 to-gold-300 bg-clip-text text-transparent pe-[0.06em]" },
              ]}
            />
            <FadeIn lcp y={14} className="mt-6 max-w-xl">
              <p className="text-body-lg text-foreground/70">{t("lead")}</p>
            </FadeIn>
          </>
        }
        outro={
          <FadeIn delay={1.3} className="mt-8 flex items-center gap-3 text-caption text-foreground/60">
            <span className="flex text-gold-300" aria-hidden>
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} className="size-3.5 fill-current" />
              ))}
            </span>
            {/* PLACEHOLDER: replace with real aggregate rating before launch. */}
            {t("rating")}
          </FadeIn>
        }
      />

      {/* Scroll cue */}
      <div aria-hidden className="absolute inset-x-0 bottom-6 mx-auto hidden w-fit flex-col items-center gap-3 text-caption text-foreground/50 lg:flex">
        <span className="h-12 w-px overflow-hidden bg-white/10">
          <span className="block h-full w-full animate-scroll-cue bg-gold-300" />
        </span>
      </div>
    </section>
  );
}
