"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Bell, BookUser, FileStack, Home, LogOut, MoreHorizontal, ReceiptText, Ticket, UserRound, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { LocaleSwitcher } from "@/components/brand/locale-switcher";
import { Logo, LogoMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { api, setUnauthorizedHandler } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { Guilloche } from "./guilloche";
import { useProfile, useSummary } from "./use-account";

type NavKey = "overview" | "orders" | "travelers" | "documents" | "notifications" | "invoices" | "profile";

const NAV: { href: string; key: NavKey; icon: typeof Home }[] = [
  { href: "/account", key: "overview", icon: Home },
  { href: "/account/orders", key: "orders", icon: Ticket },
  { href: "/account/travelers", key: "travelers", icon: BookUser },
  { href: "/account/documents", key: "documents", icon: FileStack },
  { href: "/account/notifications", key: "notifications", icon: Bell },
  { href: "/account/invoices", key: "invoices", icon: ReceiptText },
  { href: "/account/profile", key: "profile", icon: UserRound },
];
const TABS: NavKey[] = ["overview", "orders", "travelers", "documents"];
const EASE = [0.16, 1, 0.3, 1] as const;

const isActive = (pathname: string, href: string) => (href === "/account" ? pathname === "/account" : pathname === href || pathname.startsWith(`${href}/`));

/** Gold-foil text, as stamped on a passport cover. */
const foil = "bg-gradient-to-b from-gold-100 via-gold-300 to-gold-500 bg-clip-text text-transparent";

function useBadges() {
  const { data } = useSummary();
  return {
    orders: (data?.actionRequired ?? 0) + (data?.unreadMessages ?? 0),
    notifications: data?.unreadNotifications ?? 0,
    travelers: data?.expiringSoon ?? 0,
  } as Partial<Record<NavKey, number>>;
}

function useSignOut() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    queryClient.clear();
    router.replace("/account/login");
  };
}

/** The customer area: a passport cover on the side (desktop), a tab bar at the thumb (mobile). */
export function AccountShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setUnauthorizedHandler(() => router.replace(`/account/login?next=${encodeURIComponent(pathname)}`));
    return () => setUnauthorizedHandler(null);
  }, [router, pathname]);

  useEffect(() => setMoreOpen(false), [pathname]);

  return (
    <div className="relative flex min-h-dvh bg-background print:block print:bg-white">
      <aside className="sticky top-0 hidden h-dvh w-[19rem] shrink-0 p-3 lg:block print:hidden">
        <PassportCover pathname={pathname} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        <main id="main" className="relative isolate min-w-0 flex-1 px-4 pb-32 pt-6 sm:px-8 lg:px-12 lg:pb-16 lg:pt-12 print:p-0">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 overflow-hidden text-secondary-text/10 [mask-image:linear-gradient(to_bottom,black,transparent)] print:hidden">
            <Guilloche variant="waves" className="h-full w-full" />
          </div>
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      <MobileTabBar pathname={pathname} onMore={() => setMoreOpen(true)} moreActive={!TABS.some((k) => isActive(pathname, NAV.find((n) => n.key === k)!.href))} />
      <AnimatePresence>{moreOpen && <MoreSheet pathname={pathname} onClose={() => setMoreOpen(false)} />}</AnimatePresence>
    </div>
  );
}

function PassportCover({ pathname }: { pathname: string }) {
  const t = useTranslations("account.nav");
  const format = useFormatter();
  const { data: profile, isLoading } = useProfile();
  const badges = useBadges();
  const signOut = useSignOut();
  const locale = useLocale();
  const name = (locale === "en" ? (profile?.fullNameEn ?? profile?.fullNameAr) : (profile?.fullNameAr ?? profile?.fullNameEn)) ?? null;

  return (
    <div className="dark relative isolate flex h-full flex-col overflow-hidden rounded-[2rem] bg-teal-800 px-5 py-6 text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_30px_60px_-30px_rgb(21_38_78/0.9)]">
      {/* Leather grain, stitched edge and the engraved rosette. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,rgb(74_111_194/0.55),transparent_60%),radial-gradient(90%_70%_at_100%_100%,rgb(7_16_35/0.7),transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.18] mix-blend-overlay [background-image:radial-gradient(rgb(255_255_255/0.5)_0.6px,transparent_0.6px)] [background-size:3px_3px]" />
        <div className="absolute inset-2.5 rounded-[1.6rem] border border-dashed border-gold-300/25" />
        <motion.div className="absolute -end-28 top-10 size-[26rem] text-gold-300/[0.13]" animate={{ rotate: 360 }} transition={{ duration: 180, repeat: Infinity, ease: "linear" }}>
          <Guilloche className="size-full" />
        </motion.div>
      </div>

      <div className="flex items-center justify-between">
        <Link href="/" className="opacity-90 transition-opacity hover:opacity-100" aria-label={t("backToSite")}>
          <Logo />
        </Link>
        <Link href="/" className="inline-flex items-center gap-1 text-caption text-foreground/60 hover:text-foreground">
          {t("backToSite")}
          <ArrowUpRight className="size-3.5 flip-rtl" aria-hidden />
        </Link>
      </div>

      {/* The cover emblem */}
      <div className="mt-8 flex flex-col items-center gap-3 text-center">
        <motion.span initial={{ scale: 0.6, opacity: 0, rotate: -30 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ duration: 0.9, ease: EASE }} className="relative grid size-20 place-items-center rounded-full border border-gold-300/60 shadow-[0_0_40px_-6px_rgb(107_211_214/0.45)]">
          <span className="absolute inset-1.5 rounded-full border border-gold-300/30" />
          <LogoMark className="size-9 text-gold-300 [&_rect]:fill-gold-300/10" />
        </motion.span>
        <div className="flex flex-col gap-1">
          <span className={cn("font-display text-title tracking-wide", foil)}>{t("passport")}</span>
          <span lang="en" className="text-[0.62rem] uppercase tracking-[0.32em] text-gold-300/70 [:lang(ar)_&]:tracking-[0.32em]">
            {t("passportSub")}
          </span>
        </div>
      </div>

      {/* Holder */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-black/15 px-4 py-3 backdrop-blur-sm">
        {isLoading || !profile ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24 bg-white/10" />
            <Skeleton className="h-3 w-32 bg-white/10" />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-200 to-gold-500 font-display text-body font-semibold text-ink-950">{(name ?? profile.phone.slice(-2)).trim().charAt(0).toUpperCase()}</span>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{name ?? t("holder")}</span>
              <span dir="ltr" className="tabular truncate text-caption text-foreground/60 rtl:text-end">
                {profile.phone}
              </span>
            </div>
          </div>
        )}
      </div>

      <nav aria-label={t("label")} className="-mx-1 mt-5 flex flex-col gap-0.5 overflow-y-auto px-1" data-lenis-prevent>
        {NAV.map((item, i) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          const badge = badges[item.key] ?? 0;
          return (
            <motion.div key={item.href} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + 0.045 * i, duration: 0.5, ease: EASE }}>
              <Link href={item.href} aria-current={active ? "page" : undefined} className={cn("group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-body-sm font-medium transition-colors", active ? "text-ink-950" : "text-foreground/75 hover:text-foreground")}>
                {active && <motion.span layoutId="account-nav" className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-l from-gold-200 to-gold-400 shadow-[0_10px_30px_-10px_rgb(52_193_195/0.8)]" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <Icon className="size-[18px] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" aria-hidden />
                {t(item.key)}
                {badge > 0 ? (
                  <motion.span key={badge} initial={{ scale: 0.4 }} animate={{ scale: 1 }} className={cn("tabular ms-auto grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[0.7rem] font-semibold", active ? "bg-ink-950 text-gold-200" : "bg-gold-400 text-ink-950")}>
                    {badge}
                  </motion.span>
                ) : (
                  <span lang="en" className={cn("ms-auto font-display text-caption tabular opacity-40", active && "opacity-70")}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3 pt-5">
        <Button asChild size="md" block>
          <Link href="/apply">{t("newApplication")}</Link>
        </Button>
        <div className="flex items-center justify-between gap-2">
          <ThemeToggle className="border-white/10 bg-white/5" />
          <LocaleSwitcher className="h-9 border-white/10 bg-white/5 px-3" />
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-3">
          {profile ? <p className="text-[0.7rem] text-foreground/45">{t("memberSince", { date: format.dateTime(new Date(profile.memberSince), { month: "long", year: "numeric" }) })}</p> : <span />}
          <button type="button" onClick={signOut} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-caption font-medium text-foreground/70 hover:bg-white/10 hover:text-foreground">
            <LogOut className="size-3.5 flip-rtl" aria-hidden />
            {t("signOut")}
          </button>
        </div>
      </div>
    </div>
  );
}

function MobileTopBar() {
  const t = useTranslations("account.nav");
  const badges = useBadges();
  return (
    <header className="dark sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-teal-800/95 px-4 py-3 text-foreground backdrop-blur-xl lg:hidden print:hidden">
      <Link href="/account" className="flex items-center gap-2.5">
        <LogoMark className="size-7 text-gold-300 [&_rect]:fill-gold-300/10" />
        <span className={cn("font-display text-body", foil)}>{t("passport")}</span>
      </Link>
      <div className="flex items-center gap-2">
        <Link href="/account/notifications" className="relative grid size-10 place-items-center rounded-full border border-white/15" aria-label={t("notifications")}>
          <Bell className="size-[18px]" aria-hidden />
          {(badges.notifications ?? 0) > 0 && <span className="absolute end-1.5 top-1.5 size-2.5 rounded-full bg-gold-400 ring-2 ring-teal-800" />}
        </Link>
        <Button asChild size="sm" className="h-10">
          <Link href="/apply">{t("newApplication")}</Link>
        </Button>
      </div>
    </header>
  );
}

function MobileTabBar({ pathname, onMore, moreActive }: { pathname: string; onMore: () => void; moreActive: boolean }) {
  const t = useTranslations("account.nav");
  const badges = useBadges();
  return (
    <nav aria-label={t("label")} className="dark fixed inset-x-3 bottom-3 z-40 rounded-[1.75rem] border border-white/10 bg-ink-950/90 p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] text-foreground shadow-lg backdrop-blur-xl lg:hidden print:hidden">
      <ul className="grid grid-cols-5">
        {TABS.map((key) => {
          const item = NAV.find((n) => n.key === key)!;
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          const badge = badges[key] ?? 0;
          return (
            <li key={key}>
              <Link href={item.href} aria-current={active ? "page" : undefined} className={cn("relative flex flex-col items-center gap-1 rounded-2xl py-2 text-[0.68rem] font-medium transition-colors", active ? "text-ink-950" : "text-foreground/70")}>
                {active && <motion.span layoutId="account-tab" className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-b from-gold-200 to-gold-400" transition={{ type: "spring", stiffness: 450, damping: 34 }} />}
                <Icon className="size-5" aria-hidden />
                {t(key)}
                {badge > 0 && <span className="absolute end-[22%] top-1.5 size-2 rounded-full bg-gold-400 ring-2 ring-ink-950" />}
              </Link>
            </li>
          );
        })}
        <li>
          <button type="button" onClick={onMore} className={cn("relative flex w-full flex-col items-center gap-1 rounded-2xl py-2 text-[0.68rem] font-medium", moreActive ? "bg-white/10 text-gold-200" : "text-foreground/70")}>
            <MoreHorizontal className="size-5" aria-hidden />
            {t("more")}
            {(badges.notifications ?? 0) > 0 && <span className="absolute end-[22%] top-1.5 size-2 rounded-full bg-gold-400 ring-2 ring-ink-950" />}
          </button>
        </li>
      </ul>
    </nav>
  );
}

function MoreSheet({ pathname, onClose }: { pathname: string; onClose: () => void }) {
  const t = useTranslations("account.nav");
  const signOut = useSignOut();
  const badges = useBadges();
  const items = NAV.filter((n) => !TABS.includes(n.key));
  return (
    <>
      <motion.div className="fixed inset-0 z-40 bg-ink-950/50 backdrop-blur-[2px] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        role="dialog"
        aria-label={t("more")}
        className="dark fixed inset-x-0 bottom-0 z-50 overflow-hidden rounded-t-[2rem] bg-teal-800 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 text-foreground lg:hidden"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <div aria-hidden className="pointer-events-none absolute -end-24 -top-24 size-80 text-gold-300/10">
          <Guilloche className="size-full" />
        </div>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/25" aria-hidden />
        <div className="mb-3 flex items-center justify-between">
          <span className={cn("font-display text-title", foil)}>{t("passport")}</span>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full border border-white/15" aria-label={t("close")}>
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <ul className="flex flex-col gap-1">
          {items.map((item, i) => {
            const Icon = item.icon;
            const badge = badges[item.key] ?? 0;
            return (
              <motion.li key={item.key} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
                <Link href={item.href} className={cn("flex items-center gap-3 rounded-2xl px-4 py-3.5 font-medium", isActive(pathname, item.href) ? "bg-gold-300 text-ink-950" : "bg-white/5")}>
                  <Icon className="size-5" aria-hidden />
                  {t(item.key)}
                  {badge > 0 && <span className="tabular ms-auto grid h-5 min-w-5 place-items-center rounded-full bg-gold-400 px-1.5 text-[0.7rem] font-semibold text-ink-950">{badge}</span>}
                </Link>
              </motion.li>
            );
          })}
        </ul>
        <div className="mt-5 flex items-center justify-between gap-2">
          <ThemeToggle className="border-white/10 bg-white/5" />
          <LocaleSwitcher className="h-9 border-white/10 bg-white/5 px-3" />
          <button type="button" onClick={signOut} className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 px-4 text-body-sm font-medium">
            <LogOut className="size-4 flip-rtl" aria-hidden />
            {t("signOut")}
          </button>
        </div>
      </motion.div>
    </>
  );
}
