import { formatMoney, type AppLocale, type Halalas } from "@myvisa/shared";
import { ArrowUpRight, Clock } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Flag } from "./flag";
import { PassportStamp } from "./passport-stamp";

export interface DestinationCardProps {
  href: string;
  name: string;
  countryCode: string;
  airportCode: string;
  imageUrl: string;
  imageAlt: string;
  visaLabel: string;
  processingDays: readonly [min: number, max: number];
  priceFrom: Halalas;
  priority?: boolean;
  className?: string;
}

export function DestinationCard({
  href,
  name,
  countryCode,
  airportCode,
  imageUrl,
  imageAlt,
  visaLabel,
  processingDays,
  priceFrom,
  priority,
  className,
}: DestinationCardProps) {
  const t = useTranslations("ui.destination");
  const locale = useLocale() as AppLocale;

  return (
    <Link
      href={href}
      className={cn(
        "group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-3xl bg-ink-900 text-sand-50 shadow-md",
        "transition-[transform,box-shadow] duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1 hover:shadow-lg",
        className,
      )}
    >
      <Image
        src={imageUrl}
        alt={imageAlt}
        fill
        priority={priority}
        sizes="(min-width: 1280px) 300px, (min-width: 768px) 33vw, 85vw"
        className="-z-20 object-cover transition-transform duration-[1200ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.06]"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950/95 via-ink-950/45 to-ink-950/0" aria-hidden />

      <div className="absolute inset-x-4 top-4 flex items-start justify-between">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-ink-950/35 px-3 py-1.5 text-caption font-medium backdrop-blur-md">
          <Flag code={countryCode} className="h-3.5 w-5" />
          {visaLabel}
        </span>
        <span className="grid size-9 place-items-center rounded-full bg-white/15 backdrop-blur-md transition-all duration-300 group-hover:bg-primary group-hover:text-ink-900">
          <ArrowUpRight className="size-4 flip-rtl" aria-hidden />
        </span>
      </div>

      <PassportStamp
        shape="circle"
        tone="gold"
        top={name.toUpperCase()}
        bottom="MYVISA"
        code={airportCode}
        rotate={-12}
        className="pointer-events-none absolute end-3 top-14 w-24 scale-90 opacity-0 transition-all duration-500 ease-[var(--ease-spring)] group-hover:scale-100 group-hover:opacity-100 [&_svg]:mix-blend-normal [&_svg]:[color:var(--color-gold-300)]"
      />

      <div className="flex flex-col gap-4 p-5">
        <h3 className="font-display text-display-md text-sand-50">{name}</h3>
        <div className="flex items-end justify-between gap-3 border-t border-white/15 pt-4">
          <span className="inline-flex items-center gap-1.5 text-caption text-sand-200">
            <Clock className="size-3.5" aria-hidden />
            {t("processing", { min: processingDays[0], max: processingDays[1] })}
          </span>
          <span className="flex flex-col items-end leading-tight">
            <span className="text-caption text-sand-300">{t("from")}</span>
            <span className="tabular whitespace-nowrap text-title font-semibold text-gold-300">{formatMoney(priceFrom, locale)}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
