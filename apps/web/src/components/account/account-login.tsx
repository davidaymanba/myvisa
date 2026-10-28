"use client";

import type { AuthUser } from "@myvisa/shared";
import { CheckCircle2, LoaderCircle, Search } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { PhoneGate } from "@/components/apply/phone-gate";
import { Logo, LogoMark } from "@/components/brand/logo";
import { PassportStamp } from "@/components/brand/passport-stamp";
import { FadeIn } from "@/components/motion/fade-in";
import { SplitReveal } from "@/components/motion/split-reveal";
import { Link, useRouter } from "@/i18n/navigation";
import { api, refreshSession } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { Guilloche } from "./guilloche";

/** Only same-app account paths, without the locale prefix (the router adds it back). */
function safeNext(raw: string | null): string {
  if (!raw || !/^\/(en\/)?account(\/|$)/.test(raw) || raw.includes("//")) return "/account";
  const path = raw.replace(/^\/en(?=\/)/, "");
  return path.startsWith("/account/login") ? "/account" : path;
}

const EASE = [0.16, 1, 0.3, 1] as const;
const foil = "bg-gradient-to-b from-gold-100 via-gold-300 to-gold-500 bg-clip-text text-transparent";

export function AccountLogin() {
  const t = useTranslations("account.login");
  const tn = useTranslations("account.nav");
  const router = useRouter();
  const params = useSearchParams();
  const reduce = useReducedMotion();
  const rtl = useLocale() === "ar";
  const next = safeNext(params.get("next"));
  const [state, setState] = useState<"checking" | "form" | "granted">("checking");

  const enter = () => {
    setState("granted");
    setTimeout(() => router.replace(next), reduce ? 150 : 1200);
  };

  // An expired access token with a live refresh token goes straight back in.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await refreshSession();
      const me = ok ? await api<AuthUser>("/auth/me").catch(() => null) : null;
      if (cancelled) return;
      if (me) enter();
      else setState("form");
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, []);

  return (
    <main id="main" className="relative isolate flex min-h-dvh overflow-hidden bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-[60vh] text-secondary-text/10 [mask-image:linear-gradient(to_bottom,black,transparent)]">
          <Guilloche variant="waves" className="h-full w-full" />
        </div>
        <div className="absolute -end-40 -top-40 size-[40rem] animate-drift rounded-full bg-gold-200/40 blur-[120px] dark:bg-gold-400/10" />
        <div className="absolute -bottom-40 -start-40 size-[36rem] animate-drift rounded-full bg-teal-200/40 blur-[120px] [animation-delay:-6s] dark:bg-teal-500/15" />
      </div>

      <div className="container-page grid w-full items-center gap-12 py-10 lg:grid-cols-12 lg:py-16">
        <div className="flex flex-col gap-6 lg:col-span-6">
          <FadeIn>
            <Link href="/" aria-label="myvisa">
              <Logo />
            </Link>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="eyebrow flex items-center gap-3 text-accent-text">
              <span className="h-px w-8 bg-current" aria-hidden />
              {t("eyebrow")}
            </p>
          </FadeIn>
          <SplitReveal as="h1" trigger="mount" delay={0.15} className="text-[clamp(2.8rem,1.6rem+4.5vw,6rem)] font-medium leading-[0.98] tracking-[-0.035em] [:lang(ar)_&]:leading-[1.25]" lines={[{ text: t("title") }]} />
          <FadeIn delay={0.4}>
            <p className="max-w-lg text-body-lg text-muted-foreground">{t("lead")}</p>
          </FadeIn>
          <ul className="grid gap-3 sm:grid-cols-2">
            {(t.raw("perks") as string[]).map((perk, i) => (
              <motion.li key={perk} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 + i * 0.08, duration: 0.5, ease: EASE }} className="flex items-center gap-3 rounded-2xl border border-border bg-surface/70 px-4 py-3 text-body-sm backdrop-blur">
                <CheckCircle2 className="size-4 shrink-0 text-secondary-text" aria-hidden />
                {perk}
              </motion.li>
            ))}
          </ul>
          <FadeIn delay={0.9}>
            <p className="flex flex-wrap items-center gap-2 text-body-sm text-muted-foreground">
              <Search className="size-4" aria-hidden />
              {t("trackInstead")}
              <Link href="/track" className="font-medium text-secondary-text underline underline-offset-4">
                {t("trackLink")}
              </Link>
            </p>
          </FadeIn>
        </div>

        {/* The passport: cover swings open onto the data page that holds the sign-in. */}
        <div className="relative lg:col-span-6" style={{ perspective: 2200 }}>
          <div className="relative mx-auto max-w-lg">
            <div className="relative overflow-hidden rounded-[2rem] border border-sand-300 bg-[linear-gradient(160deg,var(--color-sand-50),var(--color-sand-200))] p-4 shadow-lg sm:p-6 dark:border-teal-700 dark:bg-[linear-gradient(160deg,var(--color-teal-700),var(--color-ink-900))]">
              <div aria-hidden className="pointer-events-none absolute inset-0 text-teal-500/10">
                <Guilloche variant="waves" className="h-full w-full" />
              </div>
              <div className="relative flex items-center justify-between px-2 pb-4">
                <span className="eyebrow text-gold-700 dark:text-gold-300">{tn("passport")}</span>
                <span lang="en" className="font-mono text-caption tracking-[0.3em] text-ink-500 dark:text-sand-300/70">
                  P&lt;SAU
                </span>
              </div>
              <div className="relative min-h-[19rem]">
                <AnimatePresence mode="wait">
                  {state === "checking" ? (
                    <motion.div key="checking" exit={{ opacity: 0 }} className="flex min-h-[19rem] flex-col items-center justify-center gap-3 text-muted-foreground" role="status">
                      <LoaderCircle className="size-6 animate-spin" aria-hidden />
                      {t("checking")}
                    </motion.div>
                  ) : state === "form" ? (
                    <motion.div key="form" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
                      <PhoneGate onSignedIn={enter} title={t("cardTitle")} lead={t("cardLead")} />
                    </motion.div>
                  ) : (
                    <motion.div key="granted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex min-h-[19rem] flex-col items-center justify-center gap-4" role="status">
                      <motion.div initial={{ scale: 2.6, opacity: 0, rotate: -35 }} animate={{ scale: 1, opacity: 1, rotate: -10 }} transition={{ type: "spring", stiffness: 260, damping: 13 }} className="w-44">
                        <PassportStamp shape="circle" tone="teal" top="MYVISA · ENTRY" bottom="APPROVED" code="RUH" caption={new Date().toISOString().slice(0, 10)} className="w-full" />
                      </motion.div>
                      <p className="font-display text-heading">{t("welcome")}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div lang="en" dir="ltr" aria-hidden className="relative mt-4 overflow-hidden rounded-xl bg-ink-900/[0.06] px-4 py-2 font-mono text-[0.6rem] leading-relaxed tracking-[0.2em] text-ink-600 dark:bg-black/20 dark:text-sand-200/60">
                <div className="truncate">P&lt;SAUMYVISA&lt;&lt;TRAVELLER&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</div>
                <div className="truncate">MV00000000SAU0000000M0000000&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</div>
              </div>
            </div>

            {/* Cover */}
            {!reduce && (
              <motion.div
                aria-hidden
                className={cn("absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 rounded-[2rem] bg-teal-800 shadow-[0_40px_80px_-30px_rgb(7_48_46/0.9)] [backface-visibility:hidden]", rtl ? "origin-right" : "origin-left")}
                initial={{ rotateY: 0 }}
                animate={{ rotateY: rtl ? 165 : -165, opacity: [1, 1, 0] }}
                transition={{ delay: 0.7, duration: 1.4, ease: [0.65, 0, 0.35, 1], opacity: { delay: 0.7, duration: 1.4, times: [0, 0.8, 1] } }}
              >
                <div className="absolute inset-3 rounded-[1.6rem] border border-dashed border-gold-300/30" />
                <div className="absolute inset-0 overflow-hidden rounded-[2rem] opacity-[0.15] mix-blend-overlay [background-image:radial-gradient(rgb(255_255_255/0.5)_0.6px,transparent_0.6px)] [background-size:3px_3px]" />
                <span className="grid size-24 place-items-center rounded-full border border-gold-300/60">
                  <LogoMark className="size-11 text-gold-300 [&_rect]:fill-transparent" />
                </span>
                <span className={cn("font-display text-display-md", foil)}>{tn("passport")}</span>
                <span lang="en" className="text-caption uppercase tracking-[0.4em] text-gold-300/70">
                  Passport
                </span>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
