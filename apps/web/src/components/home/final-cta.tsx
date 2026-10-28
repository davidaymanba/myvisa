import { SiWhatsapp } from "@icons-pack/react-simple-icons";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { use } from "react";
import { PassportStamp } from "@/components/brand/passport-stamp";
import { Magnetic } from "@/components/motion/magnetic";
import { Reveal } from "@/components/motion/reveal";
import { SplitReveal } from "@/components/motion/split-reveal";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getSettings, whatsappHref } from "@/lib/api/server";

export function FinalCta() {
  const t = useTranslations("home.cta");
  const { support } = use(getSettings());
  return (
    <section className="container-page py-16 sm:py-24">
      <div data-surface="dark" className="dark relative isolate overflow-hidden rounded-[2.5rem] bg-ink-950 px-5 py-20 text-center text-foreground sm:px-12 sm:py-28">
        <div aria-hidden className="absolute inset-0 -z-10">
          <div className="absolute start-1/2 top-1/2 size-[60rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[conic-gradient(from_0deg,transparent,rgb(43_79_161/0.5),transparent,rgb(52_193_195/0.35),transparent)] animate-spin-slow blur-3xl rtl:translate-x-1/2" />
          <div className="absolute inset-0 bg-[radial-gradient(rgb(243_247_249/0.6)_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.06]" />
        </div>
        <RotatingRing />
        <PassportStamp animated shape="oval" tone="gold" top="DEPARTURE · RIYADH" bottom="MYVISA" code="RUH" caption="BON VOYAGE" rotate={-10} className="absolute -start-8 bottom-6 hidden w-56 opacity-80 lg:block [&_svg]:mix-blend-normal" />
        <PassportStamp animated shape="circle" tone="teal" top="WELCOME · BIENVENUE" bottom="MYVISA" code="✓" rotate={12} seed={17} className="absolute -end-6 top-8 hidden w-40 opacity-80 lg:block [&_svg]:mix-blend-normal [&_svg]:[color:var(--color-teal-300)]" />

        <SplitReveal
          className="mx-auto max-w-4xl text-[clamp(2.75rem,1.6rem+5vw,6.5rem)] font-medium leading-[1] tracking-[-0.03em] [:lang(ar)_&]:leading-[1.25]"
          lines={[{ text: t("title") }, { text: t("titleAccent"), className: "ltr:italic", wordClassName: "bg-gradient-to-l from-gold-200 via-gold-400 to-gold-300 bg-clip-text text-transparent pe-[0.06em]" }]}
        />
        <Reveal delay={0.2}>
          <p className="mx-auto mt-6 max-w-md text-body-lg text-foreground/70">{t("lead")}</p>
        </Reveal>
        <Reveal delay={0.35} className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Magnetic>
            <Button asChild size="lg" className="h-16 px-9 text-body-lg max-sm:h-14 max-sm:px-6 max-sm:text-body">
              <Link href="/visa-finder">
                {t("primary")}
                <ArrowUpRight className="flip-rtl" aria-hidden />
              </Link>
            </Button>
          </Magnetic>
          <Button asChild size="lg" variant="outline" className="h-16 border-white/20 px-7 hover:bg-white/10 max-sm:h-14 max-sm:px-6">
            <a href={whatsappHref(support.whatsapp)} target="_blank" rel="noopener noreferrer">
              <SiWhatsapp className="text-[#25D366]" aria-hidden />
              {t("secondary")}
            </a>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}

/** Slowly rotating circular text badge — "myvisa · ماي فيزا" — sits behind the headline. */
function RotatingRing() {
  return (
    <svg viewBox="0 0 200 200" aria-hidden className="pointer-events-none absolute start-1/2 top-1/2 -z-10 w-[min(90vw,44rem)] -translate-x-1/2 -translate-y-1/2 animate-spin-slow opacity-[0.12] rtl:translate-x-1/2">
      <defs>
        <path id="cta-ring" d="M100,100 m-88,0 a88,88 0 1,1 176,0 a88,88 0 1,1 -176,0" />
      </defs>
      <text fontSize="9.5" letterSpacing="5" fill="currentColor" lang="en" style={{ fontFamily: "var(--font-inter)" }}>
        <textPath href="#cta-ring">MYVISA · TRAVEL CONCIERGE · RIYADH · MYVISA · TRAVEL CONCIERGE · RIYADH ·</textPath>
      </text>
    </svg>
  );
}
