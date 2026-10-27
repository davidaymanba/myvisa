import { formatMoney, startingPrice, type AppLocale, type Destination } from "@myvisa/shared";
import { ArrowUpRight, Clock, Plane } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Flag } from "@/components/brand/flag";
import { PassportStamp } from "@/components/brand/passport-stamp";
import { TiltCard } from "@/components/motion/tilt-card";
import { Link } from "@/i18n/navigation";
import { unsplash } from "@/lib/images";
import { cn } from "@/lib/utils";

/** Large editorial destination card used in the home gallery and the destinations index. */
export function DestinationPoster({ destination: d, index, className, priority }: { destination: Destination; index: number; className?: string; priority?: boolean }) {
  const t = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const from = startingPrice(d);
  const fastest = d.visas.reduce((min, v) => Math.min(min, v.processingDays[0]), Infinity);
  const slowest = d.visas.find((v) => v.processingDays[0] === fastest)?.processingDays[1] ?? fastest;
  const kind = d.visas[0]?.kind;

  return (
    <TiltCard max={6} className={cn("rounded-[2rem]", className)}>
      <Link
        href={`/destinations/${d.slug}`}
        className="group relative isolate flex aspect-[3/4] w-full flex-col justify-between overflow-hidden rounded-[2rem] bg-ink-900 p-6 text-sand-50 shadow-lg sm:p-7"
      >
        <Image
          src={unsplash(d.imageId, 900)}
          alt={d.imageAlt[locale]}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 420px, 80vw"
          className="-z-20 object-cover transition-transform duration-[1.6s] ease-[var(--ease-out-expo)] group-hover:scale-110"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-ink-950/30 to-ink-950/40" aria-hidden />

        <div className="flex items-start justify-between">
          <span lang="en" className="tabular font-[family-name:var(--font-instrument)] text-[2.5rem] leading-none text-white/90">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="grid size-12 place-items-center rounded-full border border-white/25 bg-white/10 backdrop-blur-md transition-all duration-500 group-hover:rotate-45 group-hover:border-gold-300 group-hover:bg-gold-400 group-hover:text-ink-950">
            <ArrowUpRight className="size-5 flip-rtl" aria-hidden />
          </span>
        </div>

        <PassportStamp
          shape="circle"
          tone="gold"
          top={d.name.en.toUpperCase()}
          bottom="MYVISA"
          code={d.iata}
          rotate={-12}
          className="pointer-events-none absolute end-6 top-24 w-28 scale-125 opacity-0 transition-all duration-700 ease-[var(--ease-spring)] group-hover:scale-100 group-hover:opacity-100 [&_svg]:mix-blend-normal [&_svg]:[color:var(--color-gold-300)]"
        />

        <div className="flex flex-col gap-4">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-ink-950/40 px-3 py-1.5 text-caption backdrop-blur-md">
            <Flag code={d.iso2} className="h-3 w-[18px]" />
            {kind && t(`visaKinds.${kind}`)}
          </span>
          <div>
            <h3 className="font-display text-[clamp(2.25rem,1.8rem+1.6vw,3.25rem)] leading-[1.05] text-white">{d.name[locale]}</h3>
            <p className="mt-2 line-clamp-2 text-body-sm text-sand-200/90">{d.tagline[locale]}</p>
          </div>
          <div className="flex items-end justify-between gap-3 border-t border-white/15 pt-4 text-caption">
            <span className="flex flex-col gap-1.5 text-sand-200">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5" aria-hidden />
                {t("workingDays", { min: fastest, max: slowest })}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Plane className="size-3.5 flip-rtl" aria-hidden />
                {d.flightHours}h · RUH → {d.iata}
              </span>
            </span>
            {from && (
              <span className="flex flex-col items-end">
                <span className="text-sand-300">{t("from")}</span>
                <span className="tabular whitespace-nowrap text-title font-semibold text-gold-300">{from.total === 0 ? t("free") : formatMoney(from.total, locale)}</span>
              </span>
            )}
          </div>
        </div>
      </Link>
    </TiltCard>
  );
}
