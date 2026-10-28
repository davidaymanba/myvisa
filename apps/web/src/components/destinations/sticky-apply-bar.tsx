"use client";

import { ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/** Phone-only bottom bar that slides in once the hero has scrolled away, and steps aside at the very end of the page so it never covers the footer's last row. */
export function StickyApplyBar({ label, price, priceLabel, href }: { label: string; price: string; priceLabel: string; href: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const nearEnd = y + window.innerHeight > document.documentElement.scrollHeight - 160;
      setShow(y > window.innerHeight * 0.8 && !nearEnd);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] end-20 start-3 z-40 flex items-center justify-between gap-3 rounded-full border border-border bg-background/85 p-2 ps-5 shadow-lg max-[359px]:gap-2 max-[359px]:ps-4 backdrop-blur-xl lg:hidden"
          initial={{ y: 120 }}
          animate={{ y: 0 }}
          exit={{ y: 120 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-caption text-muted-foreground">{priceLabel}</span>
            <span className="tabular whitespace-nowrap font-semibold">{price}</span>
          </span>
          <Button asChild size="md" className="max-[359px]:px-4 max-[359px]:[&_svg]:hidden">
            <Link href={href}>
              {label}
              <ArrowUpRight className="flip-rtl" aria-hidden />
            </Link>
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
