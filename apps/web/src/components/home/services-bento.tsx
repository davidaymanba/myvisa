import { SERVICE_CATEGORIES, VISA_TYPES, formatMoney, type AppLocale, type ServiceCategoryInfo } from "@myvisa/shared";
import { ArrowUpRight, Car, Languages, ShieldPlus, Stamp, Truck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { PassportStamp } from "@/components/brand/passport-stamp";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { Spotlight } from "@/components/motion/spotlight";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export const SERVICE_ICONS = { Stamp, ShieldPlus, Car, Languages, Truck } as const;

const LAYOUT: Record<ServiceCategoryInfo["slug"], string> = {
  visas: "lg:col-span-4 lg:row-span-2",
  "travel-insurance": "lg:col-span-2",
  "driving-license": "lg:col-span-2",
  translation: "lg:col-span-3",
  "document-shipping": "lg:col-span-3",
};

export function ServicesBento() {
  const t = useTranslations("home.services");
  const tc = useTranslations("common");
  const locale = useLocale() as AppLocale;

  return (
    <Stagger className="grid auto-rows-[minmax(17rem,auto)] gap-4 sm:grid-cols-2 lg:grid-cols-6" stagger={0.1}>
      {SERVICE_CATEGORIES.map((s) => {
        const Icon = SERVICE_ICONS[s.icon];
        const hero = s.slug === "visas";
        return (
          <StaggerItem key={s.slug} className={cn("sm:col-span-1", hero && "sm:col-span-2", LAYOUT[s.slug])}>
            <Spotlight
              className={cn(
                "group h-full rounded-[1.75rem] border transition-[border-color,transform] duration-500 hover:-translate-y-1",
                hero ? "dark border-white/10 bg-ink-900 text-foreground" : "border-border bg-surface",
              )}
            >
              <Link href={`/services/${s.slug}`} className="relative flex h-full flex-col justify-between gap-8 p-6 sm:p-8">
                {hero && (
                  <>
                    <div aria-hidden className="pointer-events-none absolute -end-24 -top-24 size-80 rounded-full bg-teal-500/30 blur-3xl" />
                    <div aria-hidden className="pointer-events-none absolute end-6 top-6 hidden w-64 sm:block">
                      <div className="relative h-56">
                        <PassportStamp shape="circle" tone="gold" top="SCHENGEN · ITALIA" bottom="MYVISA" code="FCO" caption="90 DAYS" rotate={-12} className="absolute end-0 top-0 w-36 transition-transform duration-700 group-hover:-rotate-[20deg] group-hover:scale-105 [&_svg]:mix-blend-normal" />
                        <PassportStamp shape="rect" tone="teal" top="APPROVED" bottom="UNITED KINGDOM" code="LHR" rotate={8} seed={4} className="absolute bottom-0 start-0 w-40 transition-transform duration-700 group-hover:translate-y-2 group-hover:rotate-[14deg] [&_svg]:mix-blend-normal" />
                      </div>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between gap-4">
                  <span
                    className={cn(
                      "grid size-14 place-items-center rounded-2xl transition-all duration-500 group-hover:rotate-[-8deg] group-hover:scale-110",
                      hero ? "bg-gold-400 text-ink-950" : "bg-muted text-secondary-text group-hover:bg-secondary group-hover:text-secondary-foreground",
                    )}
                  >
                    <Icon className="size-6" aria-hidden />
                  </span>
                  {!hero && (
                    <ArrowUpRight className="size-5 text-muted-foreground transition-all duration-500 group-hover:-translate-y-1 group-hover:text-foreground ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1 flip-rtl" aria-hidden />
                  )}
                </div>

                <div className="relative flex flex-col gap-3">
                  <h3 className={cn("font-display leading-tight", hero ? "text-[clamp(2.25rem,1.6rem+2.4vw,3.75rem)]" : "text-display-md")}>{s.name[locale]}</h3>
                  <p className={cn("max-w-md text-muted-foreground", hero ? "text-body-lg" : "text-body-sm")}>{s.tagline[locale]}</p>
                  {hero && (
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {VISA_TYPES.map((v) => (
                        <li key={v.id} className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-body-sm text-foreground/85 transition-colors group-hover:border-white/25">
                          {v.name[locale]}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-2 flex items-center justify-between gap-3 border-t border-border pt-4 text-caption">
                    <span className="text-muted-foreground">{s.turnaround[locale]}</span>
                    <span className="tabular">
                      <span className="text-muted-foreground">{tc("from")} </span>
                      <span className={cn("font-semibold", hero ? "text-gold-300" : "text-accent-text")}>{formatMoney(s.fromPrice, locale)}</span>
                    </span>
                  </div>
                  {hero && (
                    <span className="mt-3 inline-flex w-fit items-center gap-2 rounded-full bg-gold-400 px-5 py-2.5 text-body-sm font-medium text-ink-950 transition-shadow group-hover:shadow-gold">
                      {t("more")}
                      <ArrowUpRight className="size-4 flip-rtl" aria-hidden />
                    </span>
                  )}
                </div>
              </Link>
            </Spotlight>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}
