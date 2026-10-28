import type { AppLocale } from "@myvisa/shared";
import { useLocale, useTranslations } from "next-intl";
import { use } from "react";
import { Flag } from "@/components/brand/flag";
import { Counter } from "@/components/motion/counter";
import { Marquee } from "@/components/motion/marquee";
import { getCatalog } from "@/lib/api/server";

// PLACEHOLDER figures — replace with real metrics (admin reports) before launch.
const STATS = [
  { value: 12480, key: "orders" },
  { value: 97.8, suffix: "%", digits: 1, key: "approval" },
  { value: 4.9, suffix: "/5", digits: 1, key: "rating" },
  { value: 5, key: "reply" },
] as const;

export function TrustStrip() {
  const t = useTranslations("home.trust");
  const locale = useLocale() as AppLocale;
  const { destinations } = use(getCatalog());

  return (
    <section className="relative border-b border-border bg-background py-14 sm:py-20">
      <div className="container-page">
        <dl className="grid grid-cols-2 gap-y-10 max-lg:gap-x-6 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <div key={s.key} className="flex min-w-0 flex-col gap-2 border-border ps-0 lg:border-s lg:ps-8 lg:first:border-s-0 lg:first:ps-0" style={{ transitionDelay: `${i * 80}ms` }}>
              <dd className="whitespace-nowrap font-display text-[clamp(2rem,0.6rem+7vw,2.5rem)] leading-none tracking-[-0.03em] sm:text-[clamp(2.5rem,1.8rem+2.8vw,4.5rem)]">
                <Counter value={s.value} suffix={"suffix" in s ? s.suffix : ""} fractionDigits={"digits" in s ? s.digits : 0} />
              </dd>
              <dt className="text-body-sm text-muted-foreground">{t(s.key)}</dt>
            </div>
          ))}
        </dl>
      </div>

      <Marquee className="mt-14 sm:mt-20" duration={55} gap="2.5rem">
        {destinations.map((d) => (
          <span key={d.slug} className="flex shrink-0 items-center gap-3 font-display text-[clamp(1.5rem,1.2rem+1.2vw,2.5rem)] text-foreground/80">
            <Flag code={d.iso2} className="h-[0.7em] w-[1.05em] rounded-[4px]" />
            {d.name[locale]}
            <span className="ms-7 text-gold-400" aria-hidden>
              ✦
            </span>
          </span>
        ))}
      </Marquee>
    </section>
  );
}
