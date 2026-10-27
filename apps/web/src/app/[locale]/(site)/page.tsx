import type { AppLocale } from "@myvisa/shared";
import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";
import { DestinationPoster } from "@/components/home/destination-poster";
import { DestinationsShowcase } from "@/components/home/destinations-showcase";
import { FaqList } from "@/components/home/faq-list";
import { FinalCta } from "@/components/home/final-cta";
import { Hero } from "@/components/home/hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { PricingExplainer } from "@/components/home/pricing-explainer";
import { SectionHeading } from "@/components/home/section-heading";
import { ServicesBento } from "@/components/home/services-bento";
import { Testimonials } from "@/components/home/testimonials";
import { TrustStrip } from "@/components/home/trust-strip";
import { SplitReveal } from "@/components/motion/split-reveal";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getCatalog, getSettings } from "@/lib/api/server";
import { SITE_URL, jsonLd, pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({ locale, path: "/", title: t("title"), description: t("description") });
}

export default function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("home");
  const { destinations } = use(getCatalog());
  const { company } = use(getSettings());
  const popular = destinations.filter((d) => d.popular);
  // Pricing explainer example: Schengen tourism for France, Saudi citizen.
  const france = destinations.find((d) => d.slug === "france")?.visas.find((v) => v.purpose === "TOURISM")?.pricing.find((p) => p.applicant === "SAUDI_CITIZEN");
  const faq = t.raw("faq.items") as { q: string; a: string }[];

  const organization = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: locale === "ar" ? "ماي فيزا" : "myvisa",
    url: SITE_URL,
    telephone: company.phone,
    email: company.email,
    address: { "@type": "PostalAddress", streetAddress: company.address[locale as AppLocale], addressLocality: "Riyadh", addressCountry: "SA" },
    areaServed: "SA",
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(organization)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqLd)} />

      <Hero />
      <TrustStrip />

      <div className="py-20 sm:py-28 lg:py-0">
        <DestinationsShowcase
          count={popular.length}
          intro={
            <div className="flex flex-col gap-6">
              <p className="eyebrow flex items-center gap-3 text-accent-text">
                <span lang="en">01</span>
                <span className="h-px w-8 bg-current" aria-hidden />
                {t("destinations.eyebrow")}
              </p>
              <SplitReveal
                className="text-[clamp(2.4rem,1.5rem+3.4vw,4.75rem)] font-medium leading-[1.02] tracking-[-0.025em] [:lang(ar)_&]:leading-[1.25]"
                lines={[{ text: t("destinations.title") }, { text: t("destinations.titleAccent"), className: "text-accent-text ltr:italic" }]}
              />
              <p className="max-w-sm text-body-lg text-muted-foreground">{t("destinations.lead")}</p>
              <Button asChild variant="ink" size="lg" className="w-fit">
                <Link href="/destinations">
                  {t("destinations.all")}
                  <ArrowUpRight className="flip-rtl" aria-hidden />
                </Link>
              </Button>
            </div>
          }
        >
          {popular.map((d, i) => (
            <div key={d.slug} className="w-[min(78vw,24rem)] shrink-0 snap-start lg:w-[26rem]">
              <DestinationPoster destination={d} index={i} />
            </div>
          ))}
        </DestinationsShowcase>
      </div>

      <section className="container-page py-20 sm:py-32">
        <SectionHeading index="02" eyebrow={t("services.eyebrow")} title={t("services.title")} accent={t("services.titleAccent")} className="mb-12 sm:mb-16" />
        <ServicesBento />
      </section>

      <section className="border-y border-border bg-surface-sunken/50 py-20 sm:py-32">
        <div className="container-page">
          <SectionHeading index="03" eyebrow={t("how.eyebrow")} title={t("how.title")} accent={t("how.titleAccent")} className="mb-14 sm:mb-20" />
          <HowItWorks />
        </div>
      </section>

      <section className="container-page py-20 sm:py-32">
        <SectionHeading
          index="04"
          eyebrow={t("pricing.eyebrow")}
          title={t("pricing.title")}
          accent={t("pricing.titleAccent")}
          lead={t("pricing.lead")}
          action={
            <Button asChild variant="outline" className="w-fit">
              <Link href="/pricing">
                {t("pricing.cta")}
                <ArrowUpRight className="flip-rtl" aria-hidden />
              </Link>
            </Button>
          }
          className="mb-12 sm:mb-16"
        />
        {france && <PricingExplainer governmentFee={france.governmentFee} serviceFee={france.serviceFee} />}
      </section>

      <section className="overflow-hidden py-20 sm:py-28">
        <div className="container-page">
          <SectionHeading index="05" eyebrow={t("testimonials.eyebrow")} title={t("testimonials.title")} accent={t("testimonials.titleAccent")} className="mb-12 sm:mb-16" />
        </div>
        <Testimonials />
      </section>

      <section className="container-page grid gap-10 py-20 sm:py-28 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-32">
            <SectionHeading index="06" eyebrow={t("faq.eyebrow")} title={t("faq.title")} />
          </div>
        </div>
        <div className="lg:col-span-7">
          <FaqList items={faq} />
        </div>
      </section>

      <FinalCta />
    </>
  );
}
