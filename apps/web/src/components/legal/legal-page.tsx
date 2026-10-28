import { LEGAL_DOCUMENTS, type AppLocale, type LegalDocument } from "@myvisa/shared";
import { Check, FileWarning } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { LegalToc } from "./legal-toc";

export function LegalPage({ slug }: { slug: LegalDocument["slug"] }) {
  const doc = LEGAL_DOCUMENTS[slug];
  const l = useLocale() as AppLocale;
  const t = useTranslations("legal");
  const format = useFormatter();

  return (
    <>
      <PageHero eyebrow={`${t("version")} ${doc.version}`} title={doc.title[l]} crumbs={[{ label: doc.title[l] }]}>
        <p className="text-body-sm text-foreground/60">
          {t("updated")}: {format.dateTime(new Date(doc.updatedAt), { dateStyle: "long" })}
        </p>
      </PageHero>

      <div className="container-page grid grid-cols-1 gap-12 py-14 sm:py-20 lg:grid-cols-12">
        <aside className="lg:col-span-4">
          <div className="flex flex-col gap-8 lg:sticky lg:top-28">
            <LegalToc title={t("contents")} items={doc.sections.map((s) => ({ id: s.id, label: s.title[l] }))} />
          </div>
        </aside>

        <article className="flex flex-col gap-12 lg:col-span-8">
          <p className="flex items-center gap-2 rounded-xl bg-warning-soft px-4 py-3 text-body-sm">
            <FileWarning className="size-4 shrink-0 text-warning" aria-hidden />
            {t("draft")}
          </p>

          <Reveal className="dark rounded-[1.75rem] bg-ink-900 p-7 text-foreground sm:p-9">
            <h2 className="eyebrow mb-5 text-gold-300">{t("summary")}</h2>
            <ul className="flex flex-col gap-4">
              {doc.summary.map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-body-lg">
                  <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-gold-400 text-ink-950">
                    <Check className="size-3.5" strokeWidth={3} aria-hidden />
                  </span>
                  {s[l]}
                </li>
              ))}
            </ul>
          </Reveal>

          {doc.sections.map((s, i) => (
            <Reveal key={s.id}>
              <section id={s.id} className="scroll-mt-28">
                <h2 className="flex items-baseline gap-4 font-display text-display-md">
                  <span lang="en" className="tabular text-body text-accent-text">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {s.title[l]}
                </h2>
                <div className="mt-4 flex max-w-prose flex-col gap-4 text-body-lg leading-relaxed text-foreground/80">
                  {s.body.map((p, j) => (
                    <p key={j}>{p[l]}</p>
                  ))}
                  {s.bullets && (
                    <ul className="flex flex-col gap-2.5">
                      {s.bullets.map((b, j) => (
                        <li key={j} className="flex gap-3">
                          <span className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-secondary" aria-hidden />
                          {b[l]}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </Reveal>
          ))}
        </article>
      </div>
    </>
  );
}
