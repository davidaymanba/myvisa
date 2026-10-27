"use client";

import type { Permission } from "@myvisa/shared";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Globe2, Inbox, LayoutGrid, Languages, LogOut, Menu, MessageSquareQuote, ScrollText, Settings2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { api, setUnauthorizedHandler } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { useMe } from "./use-admin";

const NAV: { href: string; key: "overview" | "destinations" | "testimonials" | "settings" | "inbox" | "audit"; icon: typeof LayoutGrid; permission: Permission }[] = [
  { href: "/admin", key: "overview", icon: LayoutGrid, permission: "admin:access" },
  { href: "/admin/destinations", key: "destinations", icon: Globe2, permission: "catalog:read" },
  { href: "/admin/inbox", key: "inbox", icon: Inbox, permission: "contact:read" },
  { href: "/admin/testimonials", key: "testimonials", icon: MessageSquareQuote, permission: "content:read" },
  { href: "/admin/settings", key: "settings", icon: Settings2, permission: "settings:read" },
  { href: "/admin/audit", key: "audit", icon: ScrollText, permission: "audit:read" },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  // A dead session anywhere in the panel sends the user back to login, then back here.
  useEffect(() => {
    setUnauthorizedHandler(() => router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`));
    return () => setUnauthorizedHandler(null);
  }, [router, pathname]);

  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <div className="relative flex min-h-dvh bg-background">
      <aside className="dark sticky top-0 hidden h-dvh w-72 shrink-0 lg:block">
        <Rail pathname={pathname} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="dark sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-ink-950/90 px-4 py-3 text-foreground backdrop-blur-xl lg:hidden">
          <Link href="/admin" className="flex items-center gap-2">
            <Logo />
          </Link>
          <button type="button" onClick={() => setMenuOpen(true)} className="grid size-10 place-items-center rounded-full border border-white/15" aria-label={useTranslations("admin.nav")("menu")}>
            <Menu className="size-5" aria-hidden />
          </button>
        </header>
        <AnimatePresence>
          {menuOpen && (
            <motion.div className="dark fixed inset-0 z-50 lg:hidden" initial={{ clipPath: "circle(0% at 92% 4%)" }} animate={{ clipPath: "circle(150% at 92% 4%)" }} exit={{ clipPath: "circle(0% at 92% 4%)" }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}>
              <Rail pathname={pathname} onClose={() => setMenuOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        <main id="main" className="relative min-w-0 flex-1 px-4 pb-32 pt-8 sm:px-8 lg:px-12 lg:pt-12">
          {children}
        </main>
      </div>
    </div>
  );
}

function Rail({ pathname, onClose }: { pathname: string; onClose?: () => void }) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me, isLoading } = useMe();
  const can = (p: Permission) => Boolean(me?.permissions.includes(p));

  const logout = async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    queryClient.clear();
    router.replace("/admin/login");
  };

  return (
    <div className="relative isolate flex h-full flex-col overflow-hidden bg-ink-950 px-5 py-6 text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -start-24 -top-24 size-80 animate-drift rounded-full bg-teal-500/30 blur-[90px]" />
        <div className="absolute -bottom-32 -end-20 size-72 animate-drift rounded-full bg-gold-400/20 blur-[90px] [animation-delay:-6s]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgb(247_243_236/0.07)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
      </div>

      <div className="flex items-center justify-between gap-3">
        <Link href="/admin" className="flex flex-col gap-1.5">
          <Logo />
          <span className="eyebrow text-gold-300">{t("brand")}</span>
        </Link>
        {onClose && (
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full border border-white/15" aria-label={t("common.close")}>
            <X className="size-5" aria-hidden />
          </button>
        )}
      </div>

      <nav aria-label={t("nav.label")} className="mt-10 flex flex-col gap-1">
        {NAV.filter((item) => !me || can(item.permission)).map((item, i) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <motion.div key={item.href} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-body-sm font-medium transition-colors", active ? "text-ink-950" : "text-foreground/70 hover:text-foreground")}
              >
                {active && (
                  <motion.span
                    layoutId="admin-nav-pill"
                    className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-l from-gold-300 to-gold-400 shadow-[0_8px_30px_-8px_rgb(200_162_74/0.7)]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon className={cn("size-[18px] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110")} aria-hidden />
                {t(`nav.${item.key}`)}
                <span lang="en" className={cn("ms-auto font-display text-caption tabular opacity-50", active && "opacity-70")}>
                  {String(i + 1).padStart(2, "0")}
                </span>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <ThemeToggle className="border-white/10 bg-white/5" />
          <Link href={pathname} locale={locale === "ar" ? "en" : "ar"} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-caption font-medium hover:bg-white/10">
            <Languages className="size-3.5" aria-hidden />
            {t("nav.language")}
          </Link>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
          {isLoading || !me ? (
            <div className="flex items-center gap-3">
              <Skeleton className="size-11 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-teal-300 to-teal-700 font-display text-heading text-white">
                {(locale === "ar" ? me.fullNameAr : me.fullNameEn)?.charAt(0) ?? "★"}
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-body-sm font-medium">{(locale === "ar" ? me.fullNameAr : me.fullNameEn) ?? me.phone}</span>
                <Badge tone="gold" className="w-fit">
                  {t(`roles.${me.role}`)}
                </Badge>
              </div>
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <a href={locale === "ar" ? "/" : "/en"} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/10 text-caption font-medium transition hover:bg-white/10">
              {t("nav.viewSite")}
              <ArrowUpRight className="size-3.5 flip-rtl" aria-hidden />
            </a>
            <button type="button" onClick={logout} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/10 text-caption font-medium transition hover:border-danger/50 hover:bg-danger/15">
              <LogOut className="size-3.5 flip-rtl" aria-hidden />
              {t("nav.logout")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
