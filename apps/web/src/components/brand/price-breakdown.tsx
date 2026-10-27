import { calculatePrice, formatMoney, type AppLocale, type Discount, type PriceLine } from "@myvisa/shared";
import { Landmark, ShieldCheck, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The trust centrepiece: government fee and our fee are always shown apart, VAT is visibly
 * applied to our fee only, and the proportion bar makes the split legible at a glance.
 */
export function PriceBreakdown({
  lines,
  discount,
  travelers = 1,
  className,
}: {
  lines: readonly PriceLine[];
  discount?: Discount;
  travelers?: number;
  className?: string;
}) {
  const t = useTranslations("ui.price");
  const locale = useLocale() as AppLocale;
  const price = calculatePrice(lines, discount);
  const money = (v: number) => formatMoney(v, locale, { fractionDigits: 2 });
  const ourShare = price.serviceFees - price.discount + price.vat;
  const govPct = price.total ? (price.governmentFees / price.total) * 100 : 0;

  return (
    <section className={cn("rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6", className)} aria-labelledby="price-breakdown-title">
      <div className="flex items-center justify-between gap-3">
        <h3 id="price-breakdown-title" className="font-display text-heading">
          {t("title")}
        </h3>
        {travelers > 1 && <span className="text-caption text-muted-foreground">{t("travelers", { count: travelers })}</span>}
      </div>

      <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full bg-secondary transition-[width] duration-700" style={{ width: `${govPct}%` }} />
        <div className="h-full flex-1 bg-primary" />
      </div>
      <div className="mt-2 flex justify-between text-caption text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-secondary" aria-hidden />
          {t("legendGovernment")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary" aria-hidden />
          {t("legendOurs")}
        </span>
      </div>

      <dl className="mt-6 divide-y divide-border text-body-sm">
        <Row
          icon={<Landmark aria-hidden />}
          label={t("government")}
          note={t("governmentNote")}
          value={money(price.governmentFees)}
        />
        <Row icon={<Sparkles aria-hidden />} label={t("service")} value={money(price.serviceFees)} />
        {price.discount > 0 && <Row label={t("discount")} value={`− ${money(price.discount)}`} valueClassName="text-success" />}
        <Row
          label={t("vat", { rate: Math.round(price.vatRate * 100) })}
          note={t("vatNote")}
          value={money(price.vat)}
        />
      </dl>

      <div className="mt-2 flex items-baseline justify-between gap-4 border-t-2 border-foreground/80 pt-4">
        <span className="font-medium">{t("total")}</span>
        <span className="tabular font-display text-display-md">{money(price.total)}</span>
      </div>
      <p className="mt-1 text-end text-caption text-muted-foreground">{t("ourShare", { amount: money(ourShare) })}</p>

      <p className="mt-5 flex items-start gap-2 rounded-xl bg-muted px-3.5 py-3 text-caption text-foreground/80">
        <ShieldCheck className="mt-px size-4 shrink-0 text-secondary-text" aria-hidden />
        {t("noHidden")}
      </p>
    </section>
  );
}

function Row({
  icon,
  label,
  note,
  value,
  valueClassName,
}: {
  icon?: ReactNode;
  label: string;
  note?: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <dt className="flex items-start gap-2.5">
        {icon && <span className="mt-0.5 text-muted-foreground [&_svg]:size-4">{icon}</span>}
        <span className="flex flex-col">
          <span className="text-foreground">{label}</span>
          {note && <span className="text-caption text-muted-foreground">{note}</span>}
        </span>
      </dt>
      <dd className={cn("tabular shrink-0 font-medium", valueClassName)}>{value}</dd>
    </div>
  );
}
