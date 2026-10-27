import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/brand/logo";
import { PassportStamp } from "@/components/brand/passport-stamp";
import { FadeIn } from "@/components/motion/fade-in";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <main className="dark relative isolate flex min-h-[100svh] flex-col items-center justify-center gap-10 overflow-hidden bg-ink-950 px-6 text-center text-foreground">
      <div aria-hidden className="absolute -top-1/3 start-1/4 -z-10 size-[50vw] animate-drift rounded-full bg-teal-500/25 blur-[130px]" />
      <Link href="/" className="absolute start-6 top-6">
        <Logo />
      </Link>
      <div className="relative">
        <p lang="en" className="font-[family-name:var(--font-instrument)] text-[clamp(8rem,30vw,18rem)] leading-none text-foreground/10">
          404
        </p>
        <PassportStamp animated shape="rect" tone="danger" top="ENTRY DENIED" bottom="PAGE NOT FOUND" code="404" rotate={-12} className="absolute inset-0 m-auto w-56 sm:w-72 [&_svg]:mix-blend-normal" />
      </div>
      <FadeIn delay={0.4} className="flex max-w-md flex-col items-center gap-4">
        <h1 className="font-display text-display-lg">{t("title")}</h1>
        <p className="text-body-lg text-foreground/70">{t("body")}</p>
        <Button asChild size="lg" className="mt-4">
          <Link href="/">
            {t("cta")}
            <ArrowUpRight className="flip-rtl" aria-hidden />
          </Link>
        </Button>
      </FadeIn>
    </main>
  );
}
