import type { AppLocale } from "@myvisa/shared";
import { SiWhatsapp } from "@icons-pack/react-simple-icons";
import { ArrowUpRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use, type ReactNode } from "react";
import { ContactForm } from "@/components/contact/contact-form";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { Spotlight } from "@/components/motion/spotlight";
import type { Locale } from "@/i18n/routing";
import { COMPANY } from "@/lib/company";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return pageMetadata({ locale, path: "/contact", title: t("metaTitle"), description: t("metaDesc") });
}

export default function ContactPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const l = locale as AppLocale;
  const t = useTranslations("contact");
  const { lat, lon } = COMPANY.geo;
  const bbox = [lon - 0.012, lat - 0.007, lon + 0.012, lat + 0.007].join(",");
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;

  const channels: { key: "whatsapp" | "phone" | "email" | "visit"; icon: ReactNode; value: string; href: string; accent?: boolean; ltr?: boolean }[] = [
    { key: "whatsapp", icon: <SiWhatsapp />, value: COMPANY.whatsappDisplay, href: `https://wa.me/${COMPANY.whatsapp.replace(/\D/g, "")}`, accent: true, ltr: true },
    { key: "phone", icon: <Phone />, value: COMPANY.phoneDisplay, href: `tel:${COMPANY.phone}`, ltr: true },
    { key: "email", icon: <Mail />, value: COMPANY.email, href: `mailto:${COMPANY.email}`, ltr: true },
    { key: "visit", icon: <MapPin />, value: COMPANY.address[l], href: directions },
  ];

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} accent={t("titleAccent")} lead={t("lead")} crumbs={[{ label: t("eyebrow") }]} />

      <section className="container-page py-14 sm:py-20">
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={0.08}>
          {channels.map((c) => (
            <StaggerItem key={c.key} className="h-full">
              <Spotlight className={c.accent ? "dark h-full rounded-[1.75rem] border border-white/10 bg-ink-900 text-foreground" : "h-full rounded-[1.75rem] border border-border bg-surface"}>
                <a href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="group flex h-full flex-col justify-between gap-10 p-6">
                  <div className="flex items-center justify-between">
                    <span className={c.accent ? "grid size-12 place-items-center rounded-2xl bg-[#25D366] text-white [&_svg]:size-6" : "grid size-12 place-items-center rounded-2xl bg-muted text-secondary-text [&_svg]:size-5"}>{c.icon}</span>
                    <ArrowUpRight className="size-5 text-muted-foreground transition-transform duration-500 group-hover:rotate-45 flip-rtl" aria-hidden />
                  </div>
                  <div>
                    <p className="text-caption text-muted-foreground">{t(`channels.${c.key}`)}</p>
                    <p dir={c.ltr ? "ltr" : undefined} className="mt-1 text-title font-medium [unicode-bidi:plaintext] rtl:text-end">
                      {c.value}
                    </p>
                  </div>
                </a>
              </Spotlight>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="container-page grid gap-6 pb-20 sm:pb-28 lg:grid-cols-12">
        <Reveal className="lg:col-span-7">
          <ContactForm />
        </Reveal>
        <Reveal delay={0.15} className="lg:col-span-5">
          <div className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-border bg-surface shadow-md">
            <div className="relative min-h-80 flex-1 bg-muted">
              <iframe
                title={t("channels.visit")}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="absolute inset-0 size-full grayscale-[0.85] contrast-[1.05] dark:invert dark:hue-rotate-180"
              />
            </div>
            <div className="flex flex-col gap-4 p-6">
              <p className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-secondary-text" aria-hidden />
                {COMPANY.address[l]}
              </p>
              <p className="flex items-start gap-3 text-muted-foreground">
                <Clock className="mt-0.5 size-5 shrink-0" aria-hidden />
                <span>
                  {t("hours")}: {COMPANY.hours[l]}
                </span>
              </p>
              <a href={directions} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-2 font-medium text-secondary-text underline underline-offset-4">
                {t("directions")}
                <ArrowUpRight className="size-4 flip-rtl" aria-hidden />
              </a>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
