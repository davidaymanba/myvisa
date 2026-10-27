import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { CountryEditor } from "@/components/admin/catalog/country-editor";
import type { Locale } from "@/i18n/routing";

export default function Page({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = use(params);
  setRequestLocale(locale);
  return <CountryEditor id={id} />;
}
