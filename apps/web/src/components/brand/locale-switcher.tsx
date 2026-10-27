"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("ui.locale");
  const locale = useLocale();
  const pathname = usePathname();
  const target = locale === "ar" ? "en" : "ar";

  return (
    <Link
      href={pathname}
      locale={target}
      hrefLang={target}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-4 text-body-sm font-medium transition-colors hover:bg-muted",
        className,
      )}
    >
      <Languages className="size-4" aria-hidden />
      <span lang={target}>{t("switchTo")}</span>
    </Link>
  );
}
