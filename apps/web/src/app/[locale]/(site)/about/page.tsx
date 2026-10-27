import { DESTINATIONS } from "@myvisa/shared";
import { Eye, Gauge, HeartHandshake, LockKeyhole } from "lucide-react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";
import { PassportStamp } from "@/components/brand/passport-stamp";
import { FinalCta } from "@/components/home/final-cta";
import { SectionHeading } from "@/components/home/section-heading";
import { PageHero } from "@/components/layout/page-hero";
import { Counter } from "@/components/motion/counter";
import { Parallax } from "@/components/motion/parallax";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { ScrollText } from "@/components/motion/scroll-text";
import { Spotlight } from "@/components/motion/spotlight";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";

const VALUE_ICONS = [Eye, Gauge, HeartHandshake, LockKeyhole];

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return pageMetadata({ locale, path: "/about", title: t("metaTitle"), description: t("metaDesc") });
}

export default function AboutPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("about");
  const story = t.raw("story") as string[];
  const values = t.raw("values") as { title: string; body: string }[];
  // PLACEHOLDER team/coverage numbers — confirm with operations before launch.
  const numbers = [
    { v: DESTINATIONS.length, s: "+", k: "countries" },
    { v: 18, k: "specialists" },
    { v: 30, s: "+", k: "cities" },
    { v: 2, k: "hours" },
  ] as const;

  return (
    <>
      <PageHero
        eyebrow={t("eyebrow")}
        title={t("title")}
        accent={t("titleAccent")}
        lead={t("lead")}
        crumbs={[{ label: t("eyebrow") }]}
        aside={
          <div className="relative mx-auto h-72 w-full max-w-sm">
            <PassportStamp animated shape="circle" tone="gold" top="EST. RIYADH" bottom="MYVISA" code="2026" rotate={-12} className="absolute end-4 top-0 w-44 [&_svg]:mix-blend-normal [&_svg]:[color:var(--color-gold-300)]" />
            <PassportStamp animated shape="rect" tone="teal" top="TRUST · ثقة" bottom="TRANSPARENCY" code="100%" rotate={8} seed={9} className="absolute bottom-0 start-0 w-52 [&_svg]:mix-blend-normal [&_svg]:[color:var(--color-teal-300)]" />
          </div>
        }
      />

      <section className="container-page py-20 sm:py-32">
        <p className="eyebrow mb-10 text-accent-text">{t("storyTitle")}</p>
        <div className="flex flex-col gap-10">
          {story.map((p) => (
            <ScrollText key={p} text={p} className="max-w-5xl font-display text-[clamp(1.75rem,1.2rem+2.4vw,3.5rem)] leading-[1.35] tracking-[-0.015em]" />
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface-sunken/50 py-20 sm:py-28">
        <div className="container-page">
          <SectionHeading eyebrow={t("valuesTitle")} title={t("valuesTitle")} className="mb-12" />
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={0.1}>
            {values.map((v, i) => {
              const Icon = VALUE_ICONS[i] ?? Eye;
              return (
                <StaggerItem key={v.title} className="h-full">
                  <Parallax offset={i % 2 ? 24 : -24} className="h-full">
                    <Spotlight className="h-full rounded-[1.75rem] border border-border bg-surface p-7">
                      <span className="grid size-14 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
                        <Icon className="size-6" aria-hidden />
                      </span>
                      <h3 className="mt-10 font-display text-heading">{v.title}</h3>
                      <p className="mt-2 text-body-sm text-muted-foreground">{v.body}</p>
                    </Spotlight>
                  </Parallax>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>

      <section className="container-page py-20 sm:py-28">
        <SectionHeading eyebrow={t("numbersTitle")} title={t("numbersTitle")} className="mb-12" />
        <dl className="grid grid-cols-2 gap-y-12 lg:grid-cols-4">
          {numbers.map((n) => (
            <div key={n.k} className="flex flex-col gap-2 lg:border-s lg:border-border lg:ps-8 lg:first:border-s-0 lg:first:ps-0">
              <dd className="font-display text-[clamp(3rem,2rem+4vw,6rem)] leading-none tracking-[-0.04em]">
                <Counter value={n.v} suffix={"s" in n ? n.s : ""} />
              </dd>
              <dt className="text-body text-muted-foreground">{t(`numbers.${n.k}`)}</dt>
            </div>
          ))}
        </dl>
      </section>
      <FinalCta />
    </>
  );
}
