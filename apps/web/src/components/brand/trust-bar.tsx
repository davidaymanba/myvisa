import { BadgeCheck, Building2, LockKeyhole, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const PAYMENT_METHODS = ["mada", "VISA", "Mastercard", "Apple Pay", "STC Pay"] as const;

/** Legal identity + payment marks. CR/VAT numbers will be read from admin Settings in Phase 3. */
export function TrustBar({ crNumber, vatNumber, className }: { crNumber: string; vatNumber: string; className?: string }) {
  const t = useTranslations("ui.trust");
  const items = [
    { icon: Building2, label: t("cr"), value: crNumber },
    { icon: BadgeCheck, label: t("vat"), value: vatNumber },
    { icon: LockKeyhole, label: t("payments"), value: t("paymentsValue") },
    { icon: ShieldCheck, label: t("pdpl"), value: t("pdplValue") },
  ];

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        {items.map(({ icon: Icon, label, value }) => (
          <li key={label} className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-surface text-secondary-text">
              <Icon className="size-5" aria-hidden />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-caption text-muted-foreground">{label}</span>
              <span className="tabular text-body-sm font-medium">{value}</span>
            </span>
          </li>
        ))}
      </ul>
      <ul className="flex flex-wrap items-center gap-2" aria-label={t("paymentMethods")}>
        {PAYMENT_METHODS.map((m) => (
          <li key={m} lang="en" className="rounded-lg border border-border bg-surface px-3 py-1.5 text-caption font-semibold text-foreground/80">
            {m}
          </li>
        ))}
      </ul>
    </div>
  );
}
