import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { Confirmation } from "@/components/apply/confirmation";
import { Logo } from "@/components/brand/logo";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getSettings } from "@/lib/api/server";

export default function ConfirmationPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ order?: string; payment?: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const { order, payment } = use(searchParams);
  const { support } = use(getSettings());
  return (
    <div className="min-h-dvh bg-background">
      <header className="container-page flex items-center py-6">
        <Link href="/" aria-label="myvisa">
          <Logo />
        </Link>
      </header>
      {order ? <Confirmation orderId={order} paymentId={payment ?? null} whatsapp={support.whatsapp} /> : null}
    </div>
  );
}
