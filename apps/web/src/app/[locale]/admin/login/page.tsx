import { setRequestLocale } from "next-intl/server";
import { Suspense, use } from "react";
import { LoginExperience } from "@/components/admin/login/login-experience";
import type { Locale } from "@/i18n/routing";

export default function AdminLoginPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return (
    <Suspense>
      <LoginExperience />
    </Suspense>
  );
}
