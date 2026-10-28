"use client";

import { calculatePrice, formatMoney, type AppLocale, type ApplicantType } from "@myvisa/shared";
import { ArrowUpRight, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useDeferredValue, useState } from "react";
import { Flag } from "@/components/brand/flag";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export interface PriceRow {
  slug: string;
  iso2: string;
  country: string;
  haystack: string;
  visas: { id: string; name: string; prices: Partial<Record<ApplicantType, { gov: number; service: number } | null>> }[];
}

export function PriceTable({ rows }: { rows: PriceRow[] }) {
  const t = useTranslations("pricingPage");
  const tc = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const [applicant, setApplicant] = useState<ApplicantType>("SAUDI_CITIZEN");
  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim().toLowerCase());
  const money = (v: number) => formatMoney(v, locale, { fractionDigits: 2 });

  const flat = rows
    .filter((r) => !query || r.haystack.includes(query))
    .flatMap((r) =>
      r.visas
        .map((v) => ({ r, v, p: v.prices[applicant] }))
        .filter((x) => x.p !== undefined && x.p !== null),
    );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-body-sm text-muted-foreground">{t("as")}</span>
          <div role="radiogroup" className="inline-flex rounded-full border border-border bg-surface p-1">
            {(["SAUDI_CITIZEN", "RESIDENT"] as const).map((a) => (
              <button key={a} role="radio" aria-checked={applicant === a} onClick={() => setApplicant(a)} className={cn("relative h-9 rounded-full px-4 text-body-sm font-medium transition-colors", applicant === a ? "text-background" : "text-muted-foreground hover:text-foreground")}>
                {applicant === a && <motion.span layoutId="price-who" className="absolute inset-0 rounded-full bg-foreground" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
                <span className="relative">{tc(`applicants.${a}`)}</span>
              </button>
            ))}
          </div>
        </div>
        <label className="flex h-11 w-full items-center gap-3 rounded-full border border-border-strong/70 bg-surface px-5 focus-within:border-ring focus-within:ring-4 focus-within:ring-ring/15 sm:w-72">
          <Search className="size-4 text-muted-foreground" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} className="h-full flex-1 bg-transparent outline-none" />
        </label>
      </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-border bg-surface shadow-sm">
        <table className="w-full text-body-sm max-md:block">
          <thead className="bg-surface-sunken/70 text-caption text-muted-foreground max-md:hidden">
            <tr>
              <th className="px-6 py-4 text-start font-medium">{t("destination")}</th>
              <th className="px-4 py-4 text-start font-medium">{t("visa")}</th>
              <th className="px-4 py-4 text-end font-medium">
                <span className="me-1.5 inline-block size-2 rounded-full bg-secondary" />
                {t("gov")}
              </th>
              <th className="px-4 py-4 text-end font-medium">
                <span className="me-1.5 inline-block size-2 rounded-full bg-primary" />
                {t("service")}
              </th>
              <th className="px-4 py-4 text-end font-medium">{t("vat")}</th>
              <th className="px-6 py-4 text-end font-medium">{t("total")}</th>
            </tr>
          </thead>
          <tbody className="max-md:block">
            <AnimatePresence initial={false}>
              {flat.map(({ r, v, p }, i) => {
                const b = p ? calculatePrice([{ governmentFee: p.gov, serviceFee: p.service }]) : null;
                const first = i === 0 || flat[i - 1]?.r.slug !== r.slug;
                return (
                  <motion.tr
                    key={`${applicant}-${v.id}`}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, delay: Math.min(i * 0.015, 0.4) }}
                    className={cn("group border-t border-border transition-colors hover:bg-muted/50 max-md:grid max-md:grid-cols-1 max-md:gap-x-6 max-md:gap-y-1.5 max-md:px-5 max-md:py-4 sm:max-md:grid-cols-2", !first && "md:border-t-border/50")}
                  >
                    <td className="px-6 py-4 max-md:p-0 sm:max-md:col-span-2">
                      {(
                        <Link href={`/destinations/${r.slug}`} className="inline-flex items-center gap-3 font-medium hover:text-secondary-text max-md:min-h-7">
                          <Flag code={r.iso2} />
                          <span className={cn(!first && "md:text-muted-foreground")}>{r.country}</span>
                          <ArrowUpRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100 flip-rtl" aria-hidden />
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground max-md:p-0 max-md:pb-2 sm:max-md:col-span-2">{v.name}</td>
                    <Cell label={t("gov")} value={b ? money(b.governmentFees) : "—"} />
                    <Cell label={t("service")} value={b ? money(b.serviceFees) : "—"} />
                    <Cell label={t("vat")} value={b ? money(b.vat) : "—"} />
                    <td className="px-6 py-4 text-end max-md:mt-2 max-md:flex max-md:items-baseline max-md:justify-between max-md:gap-4 max-md:border-t max-md:border-border max-md:p-0 max-md:pt-2 sm:max-md:col-span-2">
                      <span className="text-caption text-muted-foreground md:hidden">{t("total")}</span>
                      <span className="tabular font-semibold max-md:whitespace-nowrap">{b ? (b.total === 0 ? tc("free") : money(b.total)) : t("notEligible")}</span>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <td className="tabular px-4 py-4 text-end max-md:flex max-md:items-baseline max-md:justify-between max-md:gap-4 max-md:p-0 max-md:text-start">
      <span className="text-caption text-muted-foreground md:hidden">{label}</span>
      <span className="max-md:whitespace-nowrap">{value}</span>
    </td>
  );
}
