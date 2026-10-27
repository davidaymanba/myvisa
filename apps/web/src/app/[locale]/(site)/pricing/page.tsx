import { DESTINATIONS, LEGAL_DOCUMENTS, type AppLocale } from "@myvisa/shared";
import { ArrowUpRight, Check, Info } from "lucide-react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";
import { FaqList } from "@/components/home/faq-list";
import { SectionHeading } from "@/components/home/section-heading";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { PriceTable, type PriceRow } from "@/components/pricing/price-table";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricingPage" });
  return pageMetadata({ locale, path: "/pricing", title: t("metaTitle"), description: t("metaDesc") });
}

export default function PricingPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const l = locale as AppLocale;
  const t = useTranslations("pricingPage");
  const th = useTranslations("home");
  const principles = t.raw("principles") as string[];
  const refund = LEGAL_DOCUMENTS["refund-policy"];

  const rows: PriceRow[] = DESTINATIONS.map((d) => ({
    slug: d.slug,
    iso2: d.iso2,
    country: d.name[l],
    haystack: `${d.name.ar} ${d.name.en}`.toLowerCase(),
    visas: d.visas.map((v) => ({
      id: v.id,
      name: v.name[l],
      prices: Object.fromEntries(
        v.pricing.map((p) => [p.applicant, p.eligible ? { gov: p.governmentFee, service: p.serviceFee } : null]),
      ),
    })),
  }));

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} accent={t("titleAccent")} lead={t("lead")} crumbs={[{ label: t("eyebrow") }]}>
        <Stagger className="mt-2 grid gap-3 sm:grid-cols-2">
          {principles.map((p) => (
            <StaggerItem key={p} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-body-sm backdrop-blur">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-gold-400 text-ink-950">
                <Check className="size-3.5" strokeWidth={3} aria-hidden />
              </span>
              {p}
            </StaggerItem>
          ))}
        </Stagger>
      </PageHero>

      <section className="container-page py-14 sm:py-20">
        <PriceTable rows={rows} />
        <p className="mt-4 flex items-start gap-2 text-caption text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {t("exchangeNote")}
        </p>
      </section>

      <section className="container-page grid gap-10 pb-20 sm:pb-28 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionHeading eyebrow={t("refundTitle")} title={refund.title[l]} />
          <Reveal delay={0.2} className="mt-8">
            <Button asChild variant="outline">
              <Link href="/refund-policy">
                {t("refundLink")}
                <ArrowUpRight className="flip-rtl" aria-hidden />
              </Link>
            </Button>
          </Reveal>
        </div>
        <Stagger className="flex flex-col gap-3 lg:col-span-7">
          {refund.summary.map((s, i) => (
            <StaggerItem key={i} className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5">
              <span lang="en" className="tabular grid size-9 shrink-0 place-items-center rounded-full bg-secondary font-semibold text-secondary-foreground">
                {i + 1}
              </span>
              <p className="pt-1.5 text-body">{s[l]}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="container-page pb-20 sm:pb-28">
        <FaqList items={(th.raw("faq.items") as { q: string; a: string }[]).slice(1, 3)} />
      </section>
    </>
  );
}
