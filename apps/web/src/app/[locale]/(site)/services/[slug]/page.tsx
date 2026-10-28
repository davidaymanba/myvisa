import { SERVICE_CATEGORIES, VISA_TYPES, formatMoney, getServiceCategory, type AppLocale } from "@myvisa/shared";
import { ArrowUpRight, Check, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { PassportStamp } from "@/components/brand/passport-stamp";
import { FinalCta } from "@/components/home/final-cta";
import { SectionHeading } from "@/components/home/section-heading";
import { SERVICE_ICONS } from "@/components/home/services-bento";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { Spotlight } from "@/components/motion/spotlight";
import { TiltCard } from "@/components/motion/tilt-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getCatalog } from "@/lib/api/server";
import { SITE_URL, jsonLd, localePath, pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => SERVICE_CATEGORIES.map((s) => ({ locale, slug: s.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const s = getServiceCategory(slug);
  if (!s) return {};
  return pageMetadata({ locale, path: `/services/${slug}`, title: s.name[locale], description: s.description[locale] });
}

export default function ServicePage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = use(params);
  setRequestLocale(locale);
  const s = getServiceCategory(slug);
  if (!s) notFound();
  const l = locale as AppLocale;
  const { insurancePlans } = use(getCatalog());
  const t = useTranslations("servicesPage");
  const tc = useTranslations("common");
  const Icon = SERVICE_ICONS[s.icon];
  const others = SERVICE_CATEGORIES.filter((o) => o.slug !== s.slug);

  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: s.name[l],
    description: s.description[l],
    provider: { "@type": "TravelAgency", name: l === "ar" ? "ماي فيزا" : "myvisa", url: SITE_URL },
    areaServed: "SA",
    url: `${SITE_URL}${localePath(locale, `/services/${s.slug}`)}`,
    offers: { "@type": "Offer", price: (s.fromPrice / 100).toFixed(2), priceCurrency: "SAR" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(serviceLd)} />
      <PageHero
        eyebrow={t("eyebrow")}
        title={s.name[l]}
        lead={s.description[l]}
        crumbs={[{ href: "/services", label: t("eyebrow") }, { label: s.name[l] }]}
        aside={
          <div className="relative mx-auto grid aspect-square w-full max-w-xs place-items-center">
            <div aria-hidden className="absolute inset-0 animate-spin-slow rounded-full border border-dashed border-white/20" />
            <div aria-hidden className="absolute inset-8 rounded-full bg-gradient-to-br from-teal-500/40 to-gold-400/20 blur-2xl" />
            <span className="relative grid size-32 place-items-center rounded-[2rem] bg-gold-400 text-ink-950 shadow-gold animate-float">
              <Icon className="size-14" strokeWidth={1.5} aria-hidden />
            </span>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="gold">
            {tc("from")} {formatMoney(s.fromPrice, l)}
          </Badge>
          <Badge tone="outline" className="border-white/20 text-foreground">
            {t("turnaround")}: {s.turnaround[l]}
          </Badge>
        </div>
      </PageHero>

      <section className="container-page py-16 sm:py-24">
        <SectionHeading eyebrow={t("features")} title={s.tagline[l]} className="mb-12" />
        <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-3" stagger={0.12}>
          {s.features.map((f, i) => (
            <StaggerItem key={f.title.en}>
              <Spotlight className="h-full rounded-[1.75rem] border border-border bg-surface p-7">
                <span lang="en" className="tabular font-[family-name:var(--font-instrument)] text-[3rem] leading-none text-accent-text">
                  0{i + 1}
                </span>
                <h3 className="mt-8 font-display text-heading">{f.title[l]}</h3>
                <p className="mt-2 text-body-sm text-muted-foreground">{f.body[l]}</p>
              </Spotlight>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {s.slug === "visas" && (
        <section className="container-page pb-16 sm:pb-24">
          <SectionHeading eyebrow={t("visaTypes")} title={s.name[l]} className="mb-10" />
          <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {VISA_TYPES.map((v, i) => (
              <StaggerItem key={v.id}>
                <div className="group relative h-full overflow-hidden rounded-[1.75rem] border border-border bg-surface p-7 transition-all hover:-translate-y-1 hover:shadow-md">
                  <PassportStamp shape="circle" tone={i % 2 ? "teal" : "gold"} top={v.name.en.toUpperCase()} bottom="MYVISA" code={String(i + 1).padStart(2, "0")} rotate={-10} className="absolute -end-6 -top-6 w-28 opacity-30 transition-all duration-700 group-hover:rotate-12 group-hover:opacity-80" />
                  <h3 className="font-display text-heading">{v.name[l]}</h3>
                  <p className="mt-2 max-w-[80%] text-body-sm text-muted-foreground">{v.body[l]}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
          <Reveal className="mt-8">
            <Button asChild variant="ink" size="lg">
              <Link href="/destinations">
                {tc("learnMore")}
                <ArrowUpRight className="flip-rtl" aria-hidden />
              </Link>
            </Button>
          </Reveal>
        </section>
      )}

      {s.slug === "travel-insurance" && (
        <section className="container-page pb-16 sm:pb-24">
          <SectionHeading eyebrow={t("plans")} title={s.name[l]} className="mb-10" />
          <Stagger className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5" stagger={0.08}>
            {insurancePlans.map((p, i) => (
              <StaggerItem key={p.id} className="h-full">
                <TiltCard max={5} className="h-full rounded-[1.75rem]">
                  <div className={cn("flex h-full flex-col gap-5 rounded-[1.75rem] border p-6", i === 0 ? "dark border-white/10 bg-ink-900 text-foreground" : "border-border bg-surface")}>
                    <div className="flex items-center justify-between">
                      <ShieldCheck className={cn("size-7", i === 0 ? "text-gold-300" : "text-secondary-text")} aria-hidden />
                      {p.embassyAccepted && <Badge tone={i === 0 ? "gold" : "teal"}>{t("accepted")}</Badge>}
                    </div>
                    <div>
                      <h3 className="font-display text-heading">{p.name[l]}</h3>
                      <p className="text-body-sm text-muted-foreground">{p.coverage[l]}</p>
                    </div>
                    <p>
                      <span className="tabular font-display text-display-md">{formatMoney(p.pricePerWeek, l)}</span>
                      <span className="text-body-sm text-muted-foreground"> {t("perWeek")}</span>
                    </p>
                    <p className="text-caption text-muted-foreground">
                      {t("medical")}: <span lang="en" className="font-semibold text-foreground">{p.medicalCover}</span>
                    </p>
                    <ul className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
                      {p.highlights.map((h) => (
                        <li key={h.en} className="flex items-start gap-2 text-body-sm">
                          <Check className="mt-0.5 size-4 shrink-0 text-secondary-text" aria-hidden />
                          {h[l]}
                        </li>
                      ))}
                    </ul>
                  </div>
                </TiltCard>
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      <section className="border-y border-border bg-surface-sunken/50 py-16 sm:py-24">
        <div className="container-page">
          <SectionHeading eyebrow={t("steps")} title={s.name[l]} className="mb-12" />
          <Stagger className="grid grid-cols-1 gap-5 md:grid-cols-3 lg:grid-cols-4" stagger={0.12}>
            {s.steps.map((step, i) => (
              <StaggerItem key={step.en} className="relative flex flex-col gap-5 rounded-[1.75rem] bg-surface p-6 shadow-sm">
                <span lang="en" className="grid size-12 place-items-center rounded-full bg-foreground font-display text-heading text-background">
                  {i + 1}
                </span>
                <p className="text-title font-medium">{step[l]}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="container-page py-16 sm:py-24">
        <SectionHeading eyebrow={t("other")} title={t("title")} accent={t("titleAccent")} className="mb-10" />
        <Stagger className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {others.map((o) => {
            const OIcon = SERVICE_ICONS[o.icon];
            return (
              <StaggerItem key={o.slug}>
                <Link href={`/services/${o.slug}`} className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md">
                  <span className="grid size-12 place-items-center rounded-xl bg-muted text-secondary-text transition-colors group-hover:bg-secondary group-hover:text-secondary-foreground">
                    <OIcon className="size-5" aria-hidden />
                  </span>
                  <span className="flex-1 font-medium">{o.name[l]}</span>
                  <ArrowUpRight className="size-4 text-muted-foreground flip-rtl" aria-hidden />
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
      </section>
      <FinalCta />
    </>
  );
}
