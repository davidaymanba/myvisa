"use client";

import type { AppLocale, Nationality, SavedTravelerView } from "@myvisa/shared";
import { Pencil, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Flag } from "@/components/brand/flag";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Guilloche } from "./guilloche";
import { daysUntil } from "./use-account";

export function nationalityName(iso2: string, nationalities: Nationality[], locale: AppLocale) {
  if (iso2 === "SA") return locale === "ar" ? "سعودي" : "Saudi";
  return nationalities.find((n) => n.iso2 === iso2)?.name[locale] ?? iso2;
}

/** Decorative machine-readable zone, built from what we may show (never the full passport number). */
function mrz(t: SavedTravelerView) {
  const clean = (s: string) => s.toUpperCase().replace(/[^A-Z]+/g, "<");
  const line1 = `P<${t.nationalityIso2}${clean(t.surnameEn)}<<${clean(t.givenNameEn)}`.padEnd(44, "<").slice(0, 44);
  const dob = t.dateOfBirth.slice(2).replace(/-/g, "");
  const exp = t.passportExpiry.slice(2).replace(/-/g, "");
  const line2 = `${t.passportNumberMasked.replace(/•/g, "<").padEnd(9, "<")}0${t.nationalityIso2}<${dob}0${t.gender === "FEMALE" ? "F" : "M"}${exp}0`.padEnd(44, "<").slice(0, 44);
  return [line1, line2];
}

export function ExpiryBadge({ date }: { date: string }) {
  const t = useTranslations("account.travelers");
  const days = daysUntil(date);
  if (days < 0) return <Badge tone="danger">{t("expired")}</Badge>;
  if (days < 183) return <Badge tone="warning">{t("expiresSoon")}</Badge>;
  return <Badge tone="success">{t("valid")}</Badge>;
}

/** A saved traveller drawn as a passport data page: photo, fields, MRZ — with a soft lift on hover. */
export function PassportCard({ traveler, nationalities, index, onEdit, onDelete }: { traveler: SavedTravelerView; nationalities: Nationality[]; index: number; onEdit: () => void; onDelete: () => void }) {
  const t = useTranslations("account.travelers");
  const ta = useTranslations("apply.travelers");
  const tc = useTranslations("account.common");
  const locale = useLocale() as AppLocale;
  const format = useFormatter();
  const date = (iso: string) => format.dateTime(new Date(`${iso}T00:00:00Z`), { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
  const [l1, l2] = mrz(traveler);
  const initials = `${traveler.givenNameEn.charAt(0)}${traveler.surnameEn.charAt(0)}`;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 30, rotateX: -12 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ delay: index * 0.07, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -6, rotate: index % 2 ? 0.6 : -0.6 }}
      className="group relative isolate overflow-hidden rounded-[1.5rem] border border-sand-300 bg-[linear-gradient(160deg,var(--color-sand-50),var(--color-sand-200))] text-ink-900 shadow-md [perspective:1000px] dark:border-teal-700 dark:bg-[linear-gradient(160deg,var(--color-teal-700),var(--color-ink-900))] dark:text-sand-100"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 text-teal-500/[0.12] dark:text-teal-200/10">
        <Guilloche variant="waves" className="h-full w-full" />
      </div>
      <div aria-hidden className="pointer-events-none absolute -end-16 -top-16 -z-10 size-52 text-gold-500/20 transition-transform duration-[2s] group-hover:rotate-45">
        <Guilloche className="size-full" />
      </div>

      <header className="flex items-center justify-between gap-3 border-b border-ink-900/10 px-5 py-3 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Flag code={traveler.nationalityIso2.toLowerCase()} className="h-4 w-6 rounded-[3px] shadow-sm" />
          <span className="eyebrow text-gold-700 dark:text-gold-300">{ta(`relationships.${traveler.relationship}`)}</span>
        </div>
        <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <button type="button" onClick={onEdit} className="grid size-8 place-items-center rounded-full hover:bg-ink-900/10 dark:hover:bg-white/10" aria-label={tc("edit")}>
            <Pencil className="size-3.5" aria-hidden />
          </button>
          <button type="button" onClick={onDelete} className="grid size-8 place-items-center rounded-full text-danger hover:bg-danger-soft" aria-label={tc("delete")}>
            <Trash2 className="size-3.5" aria-hidden />
          </button>
        </div>
      </header>

      <div className="flex gap-4 px-5 py-4">
        <div className="relative grid h-28 w-[5.5rem] shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-teal-300 to-teal-700 shadow-inner">
          <span lang="en" className="font-display text-display-md text-white/90">
            {initials}
          </span>
          <span aria-hidden className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.25)_0.7px,transparent_0.7px)] [background-size:4px_4px]" />
        </div>
        <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-3 gap-y-2 text-caption">
          <div className="col-span-2 flex min-w-0 flex-col">
            <dt className="text-ink-500 dark:text-sand-300/70">{ta("surname")} / {ta("givenName")}</dt>
            <dd lang="en" dir="ltr" className="truncate font-display text-title font-medium leading-tight rtl:text-end">
              {traveler.surnameEn}, {traveler.givenNameEn}
            </dd>
            {traveler.fullNameAr && <dd className="truncate text-body-sm text-ink-600 dark:text-sand-200/80">{traveler.fullNameAr}</dd>}
          </div>
          <div className="flex flex-col">
            <dt className="text-ink-500 dark:text-sand-300/70">{t("nationality")}</dt>
            <dd className="truncate font-medium">{nationalityName(traveler.nationalityIso2, nationalities, locale)}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-ink-500 dark:text-sand-300/70">{t("born")}</dt>
            <dd className="tabular font-medium">{date(traveler.dateOfBirth)}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-ink-500 dark:text-sand-300/70">{t("passportNo")}</dt>
            <dd lang="en" dir="ltr" className="tabular font-mono font-semibold tracking-wider rtl:text-end">
              {traveler.passportNumberMasked}
            </dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-ink-500 dark:text-sand-300/70">{t("expires")}</dt>
            <dd className="tabular font-medium">{date(traveler.passportExpiry)}</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
        <ExpiryBadge date={traveler.passportExpiry} />
        <Badge tone="outline" className="border-ink-900/15 dark:border-white/15">
          {t("orders", { count: traveler.orders })}
        </Badge>
        <Badge tone="outline" className="border-ink-900/15 dark:border-white/15">
          {t("documents", { count: traveler.documents })}
        </Badge>
      </div>

      <div lang="en" dir="ltr" aria-hidden className={cn("overflow-hidden bg-ink-900/[0.06] px-5 py-2.5 font-mono text-[0.62rem] leading-relaxed tracking-[0.18em] text-ink-700 dark:bg-black/20 dark:text-sand-200/70")}>
        <div className="truncate">{l1}</div>
        <div className="truncate">{l2}</div>
      </div>
    </motion.article>
  );
}
