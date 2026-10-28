import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { BlogEditor } from "@/components/admin/blog";
import type { Locale } from "@/i18n/routing";

export default function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return <BlogEditor />;
}
