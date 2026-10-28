import { setRequestLocale } from "next-intl/server";
import { TravelersPage } from "@/components/account/travelers";
import type { Locale } from "@/i18n/routing";
import { getCatalog } from "@/lib/api/server";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale as Locale);
  const { nationalities } = await getCatalog();
  return <TravelersPage nationalities={nationalities} />;
}
