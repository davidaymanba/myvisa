import { SERVICE_CATEGORIES, type AppLocale } from "@myvisa/shared";
import { SiWhatsapp } from "@icons-pack/react-simple-icons";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { use } from "react";
import { LocaleSwitcher } from "@/components/brand/locale-switcher";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { TrustBar } from "@/components/brand/trust-bar";
import { FooterWordmark } from "./footer-wordmark";
import { Link } from "@/i18n/navigation";
import { getCatalog, getSettings, whatsappHref } from "@/lib/api/server";

export function SiteFooter() {
  const t = useTranslations("footer");
  const tn = useTranslations("nav");
  const locale = useLocale() as AppLocale;
  const year = 2026;
  const { company, support } = use(getSettings());
  const { destinations } = use(getCatalog());

  const columns = [
    {
      title: t("destinations"),
      links: destinations.filter((d) => d.popular)
        .slice(0, 6)
        .map((d) => ({ href: `/destinations/${d.slug}`, label: d.name[locale] })),
    },
    {
      title: t("services"),
      links: SERVICE_CATEGORIES.map((c) => ({ href: `/services/${c.slug}`, label: c.name[locale] })),
    },
    {
      title: t("company"),
      links: [
        { href: "/about", label: tn("about") },
        { href: "/visa-finder", label: tn("finder") },
        { href: "/pricing", label: tn("pricing") },
        { href: "/contact", label: tn("contact") },
      ],
    },
    {
      title: t("legal"),
      links: [
        { href: "/terms", label: t("terms") },
        { href: "/refund-policy", label: t("refund") },
        { href: "/privacy", label: t("privacy") },
      ],
    },
  ];

  return (
    <footer data-surface="dark" className="dark relative isolate overflow-hidden bg-ink-950 text-foreground">
      <div className="pointer-events-none absolute -top-40 start-1/3 -z-10 size-[42rem] rounded-full bg-teal-500/20 blur-[120px]" aria-hidden />

      <div className="container-page pt-20 sm:pt-28">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-4">
            <Logo withArabic />
            <p className="max-w-sm text-body text-muted-foreground">{t("blurb")}</p>
            <ul className="flex flex-col gap-3 text-body-sm">
              <li>
                <a href={whatsappHref(support.whatsapp)} className="group inline-flex items-center gap-3 hover:text-gold-300">
                  <span className="grid size-9 place-items-center rounded-full bg-[#25D366] text-white">
                    <SiWhatsapp className="size-4" aria-hidden />
                  </span>
                  <span dir="ltr" className="tabular">{support.whatsappDisplay}</span>
                </a>
              </li>
              <li>
                <a href={`tel:${company.phone}`} className="inline-flex items-center gap-3 hover:text-gold-300">
                  <span className="grid size-9 place-items-center rounded-full border border-border">
                    <Phone className="size-4" aria-hidden />
                  </span>
                  <span dir="ltr" className="tabular">{company.phoneDisplay}</span>
                </a>
              </li>
              <li>
                <a href={`mailto:${company.email}`} className="inline-flex items-center gap-3 hover:text-gold-300">
                  <span className="grid size-9 place-items-center rounded-full border border-border">
                    <Mail className="size-4" aria-hidden />
                  </span>
                  {company.email}
                </a>
              </li>
              <li className="inline-flex items-start gap-3 text-muted-foreground">
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-foreground">
                  <MapPin className="size-4" aria-hidden />
                </span>
                <span className="pt-1.5">{company.address[locale]}</span>
              </li>
            </ul>
          </div>

          <nav aria-label={t("label")} className="grid grid-cols-2 gap-10 sm:grid-cols-4 lg:col-span-8">
            {columns.map((col) => (
              <div key={col.title}>
                <h2 className="eyebrow mb-5 text-gold-300">{col.title}</h2>
                <ul className="flex flex-col gap-3">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="group inline-flex items-center gap-1 text-body-sm text-foreground/75 transition-colors hover:text-foreground">
                        <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-500 group-hover:bg-[length:100%_1px] ltr:bg-left rtl:bg-right">
                          {l.label}
                        </span>
                        <ArrowUpRight className="size-3.5 opacity-0 transition-all duration-300 group-hover:opacity-100 flip-rtl" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <TrustBar crNumber={company.crNumber} vatNumber={company.vatNumber} className="mt-16 border-t border-border pt-10" />
      </div>

      <FooterWordmark />

      <div className="container-page flex flex-col items-start justify-between gap-4 border-t border-border py-6 text-caption text-muted-foreground sm:flex-row sm:items-center">
        <p>{t("copyright", { year })}</p>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LocaleSwitcher className="h-10" />
        </div>
      </div>
    </footer>
  );
}
