"use client";

import { useLenis } from "lenis/react";
import { ArrowUpRight, Menu, UserRound, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { LocaleSwitcher } from "@/components/brand/locale-switcher";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { Button } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "./nav-links";

const EASE = [0.76, 0, 0.24, 1] as const;

/**
 * Floating pill header.
 * - Hides on scroll down, returns on scroll up.
 * - Re-themes itself to dark whenever it sits over a section marked `data-surface="dark"`.
 */
export function SiteHeader() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const lenis = useLenis();
  const reduce = useReducedMotion();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [onDark, setOnDark] = useState(false);
  const [open, setOpen] = useState(false);
  const lastY = useRef(0);
  // The menu button sits at the inline end: right in LTR, left in RTL. The reveal circle grows from it.
  const origin = useLocale() === "ar" ? "48px 44px" : "calc(100% - 48px) 44px";

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      setScrolled(y > 24);
      setHidden(y > 160 && y > lastY.current + 2);
      if (y < lastY.current - 2) setHidden(false);
      lastY.current = y;
      const probe = 40;
      const dark = Array.from(document.querySelectorAll<HTMLElement>('[data-surface="dark"]')).some((el) => {
        const r = el.getBoundingClientRect();
        return r.top <= probe && r.bottom >= probe;
      });
      setOnDark(dark);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) lenis?.stop();
    else lenis?.start();
    document.documentElement.style.overflow = open ? "hidden" : "";
  }, [open, lenis]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <motion.header
        initial={reduce ? false : { y: -90, opacity: 0 }}
        animate={{ y: hidden && !open ? -110 : 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={cn("fixed inset-x-0 top-3 z-50 sm:top-4", (onDark || open) && "dark")}
      >
        <div className="container-page">
          <div
            className={cn(
              "flex h-14 items-center justify-between gap-3 rounded-full border ps-4 pe-2 text-foreground transition-[background-color,border-color,box-shadow] duration-500 sm:h-16 sm:ps-5",
              scrolled || open
                ? "border-border/80 bg-background/70 shadow-lg backdrop-blur-xl backdrop-saturate-150"
                : "border-transparent bg-transparent",
            )}
          >
            <Link href="/" aria-label={t("home")} className="shrink-0">
              <Logo />
            </Link>

            <nav aria-label={t("label")} className="hidden lg:block">
              <ul className="flex items-center gap-1">
                {NAV_LINKS.map((link) => (
                  <li key={link.href} className="relative">
                    <Link
                      href={link.href}
                      className={cn(
                        "relative z-10 block rounded-full px-4 py-2 text-body-sm font-medium transition-colors",
                        isActive(link.href) ? "text-background" : "text-foreground/75 hover:text-foreground",
                      )}
                    >
                      {t(link.key)}
                    </Link>
                    {isActive(link.href) && (
                      <motion.span layoutId="nav-active" className="absolute inset-0 rounded-full bg-foreground" transition={{ type: "spring", stiffness: 380, damping: 32 }} />
                    )}
                  </li>
                ))}
              </ul>
            </nav>

            <div className="flex items-center gap-1.5">
              <LocaleSwitcher className="h-10 border-transparent bg-transparent px-3 max-sm:hidden" />
              <Link href="/account" aria-label={t("account")} title={t("account")} className={cn("grid size-10 place-items-center rounded-full transition-colors hover:bg-foreground/10", isActive("/account") && "bg-foreground text-background")}>
                <UserRound className="size-[18px]" aria-hidden />
              </Link>
              <Button asChild size="sm" className="h-10 px-4 max-sm:hidden">
                <Link href="/visa-finder">
                  {t("cta")}
                  <ArrowUpRight className="flip-rtl" aria-hidden />
                </Link>
              </Button>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="mobile-menu"
                aria-label={open ? t("close") : t("menu")}
                className="grid size-11 place-items-center rounded-full bg-foreground text-background transition-transform active:scale-95 lg:hidden"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={open ? "x" : "m"} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    {open ? <X className="size-5" /> : <Menu className="size-5" />}
                  </motion.span>
                </AnimatePresence>
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            data-lenis-prevent
            className="dark fixed inset-0 z-[45] flex flex-col overflow-y-auto overflow-x-hidden overscroll-contain bg-ink-950 px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-28 text-foreground lg:hidden"
            initial={{ clipPath: `circle(0% at ${origin})` }}
            animate={{ clipPath: `circle(150% at ${origin})` }}
            exit={{ clipPath: `circle(0% at ${origin})` }}
            transition={{ duration: reduce ? 0 : 0.75, ease: EASE }}
          >
            <div className="pointer-events-none absolute -end-32 top-10 size-96 rounded-full bg-teal-500/30 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute -start-20 bottom-0 size-80 rounded-full bg-gold-400/20 blur-3xl" aria-hidden />
            <nav aria-label={t("label")} className="relative">
              <ul className="flex flex-col gap-1">
                {[{ href: "/", key: "home" as const }, ...NAV_LINKS, { href: "/blog", key: "blog" as const }, { href: "/track", key: "track" as const }, { href: "/account", key: "account" as const }].map((link, i) => (
                  <li key={link.href} className="overflow-hidden">
                    <motion.div
                      initial={{ y: "110%" }}
                      animate={{ y: 0 }}
                      transition={{ delay: 0.25 + i * 0.06, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <Link
                        href={link.href}
                        className={cn(
                          "flex items-baseline gap-4 py-1.5 font-display text-display-lg transition-colors [@media(max-height:700px)]:py-0.5 [@media(max-height:700px)]:text-display-md",
                          (link.href === "/" ? pathname === "/" : isActive(link.href)) ? "text-gold-300" : "text-foreground hover:text-gold-300",
                        )}
                      >
                        <span lang="en" className="tabular text-caption text-muted-foreground">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {t(link.key)}
                      </Link>
                    </motion.div>
                  </li>
                ))}
              </ul>
            </nav>
            <motion.div
              className="relative mt-auto flex flex-wrap items-center justify-between gap-4 pt-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <LocaleSwitcher />
              <ThemeToggle />
              <Button asChild size="lg" block>
                <Link href="/visa-finder">{t("cta")}</Link>
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
