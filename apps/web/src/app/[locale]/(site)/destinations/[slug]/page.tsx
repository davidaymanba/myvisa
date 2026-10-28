import { formatMoney, startingPrice, type AppLocale } from "@myvisa/shared";
import { ArrowUpRight, Banknote, CalendarHeart, Landmark, Plane, ShieldPlus } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use, type ReactNode } from "react";
import { Flag } from "@/components/brand/flag";
import { PassportStamp } from "@/components/brand/passport-stamp";
import { DestinationHero } from "@/components/destinations/destination-hero";
import { StickyApplyBar } from "@/components/destinations/sticky-apply-bar";
import { VisaTabs, type VisaTabData } from "@/components/destinations/visa-tabs";
import { DestinationPoster } from "@/components/home/destination-poster";
import { FaqList } from "@/components/home/faq-list";
import { SectionHeading } from "@/components/home/section-heading";
import { FadeIn } from "@/components/motion/fade-in";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { SplitReveal } from "@/components/motion/split-reveal";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getCatalog, getDestinationBySlug } from "@/lib/api/server";
import { unsplash } from "@/lib/images";
import { SITE_URL, jsonLd, localePath, pageMetadata } from "@/lib/seo";

export async function generateStaticParams() {
  const { destinations } = await getCatalog();
  return routing.locales.flatMap((locale) => destinations.map((d) => ({ locale, slug: d.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const d = await getDestinationBySlug(slug);
  if (!d) return {};
  const t = await getTranslations({ locale, namespace: "destination" });
  const from = startingPrice(d);
  const title = locale === "ar" ? `تأشيرة ${d.name.ar}` : `${d.name.en} visa`;
  const description = `${d.tagline[locale]} ${from ? `${t("processing")}: ${d.visas[0]?.processingDays.join("–")} · ${formatMoney(from.total, locale)}` : ""}`.trim();
  return pageMetadata({ locale, path: `/destinations/${slug}`, title, description, image: unsplash(d.imageId, 1200) });
}

export default function DestinationPage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = use(params);
  setRequestLocale(locale);
  const catalog = use(getCatalog());
  const d = catalog.destinations.find((x) => x.slug === slug);
  if (!d) notFound();
  const l = locale as AppLocale;
  const t = useTranslations("destination");
  const tc = useTranslations("common");
  const from = startingPrice(d);
  const plan = catalog.insurancePlans.find((p) => p.id === d.insurance);
  const related = catalog.destinations.filter((x) => x.slug !== d.slug && x.region === d.region).slice(0, 3);
  const steps = t.raw("timelineSteps") as string[];
  const firstVisa = d.visas[0];

  const visas: VisaTabData[] = d.visas.map((v) => ({
    id: v.id,
    kind: v.kind,
    purpose: v.purpose,
    purposeLabel: tc(`purposes.${v.purpose}`),
    kindLabel: tc(`visaKinds.${v.kind}`),
    name: v.name[l],
    entryLabel: tc(`entry.${v.entry}`),
    validityDays: v.validityDays,
    maxStayDays: v.maxStayDays,
    processingDays: v.processingDays,
    appointment: v.appointment,
    appointmentNote: v.appointmentNote?.[l],
    pricing: v.pricing.map((p) => ({ applicant: p.applicant, eligible: p.eligible, governmentFee: p.governmentFee, serviceFee: p.serviceFee, note: p.note?.[l], reason: p.ineligibleReason?.[l] })),
    requirements: v.requirements.map((r) => ({ doc: r.doc, title: r.title[l], details: r.details?.[l], applicant: r.applicant, optional: r.optional })),
  }));

  const url = `${SITE_URL}${localePath(locale, `/destinations/${d.slug}`)}`;
  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: locale === "ar" ? `خدمة تأشيرة ${d.name.ar}` : `${d.name.en} visa service`,
    provider: { "@type": "TravelAgency", name: locale === "ar" ? "ماي فيزا" : "myvisa", url: SITE_URL },
    areaServed: "SA",
    url,
    ...(from ? { offers: { "@type": "Offer", price: (from.total / 100).toFixed(2), priceCurrency: "SAR" } } : {}),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: tc("breadcrumbHome"), item: `${SITE_URL}${localePath(locale, "/")}` },
      { "@type": "ListItem", position: 2, name: locale === "ar" ? "الوجهات" : "Destinations", item: `${SITE_URL}${localePath(locale, "/destinations")}` },
      { "@type": "ListItem", position: 3, name: d.name[l], item: url },
    ],
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: d.faqs.map((f) => ({ "@type": "Question", name: f.q[l], acceptedAnswer: { "@type": "Answer", text: f.a[l] } })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(serviceLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqLd)} />

      <DestinationHero image={unsplash(d.imageId, 2000)} alt={d.imageAlt[l]}>
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="flex flex-col gap-5 lg:col-span-8">
            <FadeIn delay={0.2} className="flex flex-wrap items-center gap-3">
              <Link href="/destinations" className="text-caption text-foreground/60 transition-colors hover:text-foreground">
                {tc("breadcrumbHome")} / {locale === "ar" ? "الوجهات" : "Destinations"}
              </Link>
              {d.schengen && <Badge tone="gold">{t("schengen")}</Badge>}
            </FadeIn>
            <FadeIn delay={0.3} className="flex items-center gap-3">
              <Flag code={d.iso2} className="h-8 w-12 rounded-lg" />
              <span className="eyebrow text-gold-300">{tc(`regions.${d.region}`)}</span>
            </FadeIn>
            <SplitReveal as="h1" trigger="mount" delay={0.4} className="text-[clamp(3.5rem,1.5rem+9vw,10rem)] font-medium leading-[0.92] tracking-[-0.04em] [:lang(ar)_&]:leading-[1.15]" lines={[{ text: d.name[l] }]} />
            <FadeIn lcp y={14}>
              <p className="max-w-xl text-body-lg text-foreground/80">{d.tagline[l]}</p>
            </FadeIn>
          </div>
          <FadeIn delay={0.6} className="hidden justify-end lg:col-span-4 lg:flex">
            <PassportStamp animated shape="circle" tone="gold" top={d.name.en.toUpperCase()} bottom="MYVISA" code={d.iata} caption="FROM RUH" rotate={-12} className="w-44 [&_svg]:mix-blend-normal [&_svg]:[color:var(--color-gold-300)]" />
          </FadeIn>
        </div>
        <FadeIn delay={0.5}>
          <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl sm:grid-cols-4">
            <HeroFact icon={<Banknote />} label={tc("from")} value={from ? (from.total === 0 ? tc("free") : formatMoney(from.total, l)) : "—"} />
            <HeroFact icon={<Plane className="flip-rtl" />} label={t("flight")} value={t("hours", { count: d.flightHours })} />
            <HeroFact icon={<Landmark />} label={t("capital")} value={d.capital[l]} />
            <HeroFact icon={<CalendarHeart />} label={t("bestTime")} value={d.bestTime[l]} />
          </dl>
        </FadeIn>
      </DestinationHero>

      <section className="container-page py-16 sm:py-24">
        <Reveal className="mb-14 max-w-3xl">
          <p className="font-display text-[clamp(1.2rem,1.05rem+0.6vw,1.6rem)] leading-relaxed text-foreground/85">{d.overview[l]}</p>
        </Reveal>
        <SectionHeading eyebrow={t("visaTypes")} title={d.name[l]} className="mb-10" />
        <VisaTabs visas={visas} slug={d.slug} country={d.name[l]} />
      </section>

      {firstVisa && (
        <section className="border-y border-border bg-surface-sunken/50 py-16 sm:py-24">
          <div className="container-page">
            <SectionHeading eyebrow={t("timeline")} title={tc("workingDays", { min: firstVisa.processingDays[0], max: firstVisa.processingDays[1] })} className="mb-12" />
            <Stagger className="relative grid gap-6 md:grid-cols-4" stagger={0.15}>
              <span aria-hidden className="absolute inset-x-[12.5%] top-7 hidden h-px bg-gradient-to-l from-teal-400 via-gold-400 to-teal-400 md:block" />
              {steps.map((s, i) => (
                <StaggerItem key={s} className="relative flex flex-col items-start gap-4 md:items-center md:text-center">
                  <span lang="en" className="relative grid size-14 place-items-center rounded-full border border-border bg-surface font-display text-heading shadow-sm">
                    {i + 1}
                  </span>
                  <span className="font-medium">{s}</span>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      )}

      <section className="container-page grid gap-10 py-16 sm:py-24 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="flex flex-col gap-8 lg:sticky lg:top-28">
            <SectionHeading eyebrow="FAQ" title={t("faq", { country: d.name[l] })} />
            {plan && (
              <Reveal>
                <Link href="/services/travel-insurance" className="group flex items-center gap-4 rounded-[1.75rem] border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-secondary text-secondary-foreground transition-transform group-hover:rotate-[-8deg]">
                    <ShieldPlus className="size-6" aria-hidden />
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span className="font-medium">
                      {t("insurance")} · {plan.name[l]}
                    </span>
                    <span className="text-body-sm text-muted-foreground">{t("insuranceBody")}</span>
                  </span>
                  <ArrowUpRight className="size-5 text-muted-foreground flip-rtl" aria-hidden />
                </Link>
              </Reveal>
            )}
          </div>
        </div>
        <div className="lg:col-span-7">
          <FaqList items={d.faqs.map((f) => ({ q: f.q[l], a: f.a[l] }))} />
        </div>
      </section>

      {related.length > 0 && (
        <section className="container-page pb-20 sm:pb-28">
          <SectionHeading eyebrow={t("related")} title={tc(`regions.${d.region}`)} className="mb-10" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r, i) => (
              <DestinationPoster key={r.slug} destination={r} index={i} />
            ))}
          </div>
        </section>
      )}

      {from && <StickyApplyBar label={tc("applyNow")} priceLabel={tc("from")} price={from.total === 0 ? tc("free") : formatMoney(from.total, l)} href={`/apply?to=${d.slug}`} />}
    </>
  );
}

function HeroFact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 bg-ink-950/40 px-5 py-4">
      <dt className="flex items-center gap-2 text-caption text-foreground/60 [&_svg]:size-3.5">
        {icon}
        {label}
      </dt>
      <dd className="tabular text-body font-semibold">{value}</dd>
    </div>
  );
}
