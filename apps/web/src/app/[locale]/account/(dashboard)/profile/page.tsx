import { setRequestLocale } from "next-intl/server";
import { ProfilePage } from "@/components/account/profile";
import type { Locale } from "@/i18n/routing";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale as Locale);
  return <ProfilePage />;
}
