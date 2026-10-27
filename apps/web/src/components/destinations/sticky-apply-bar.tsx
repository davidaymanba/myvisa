"use client";

import { ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/** Phone-only bottom bar that slides in once the hero has scrolled away. */
export function StickyApplyBar({ label, price, priceLabel, href }: { label: string; price: string; priceLabel: string; href: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] end-20 start-3 z-40 flex items-center justify-between gap-3 rounded-full border border-border bg-background/85 p-2 ps-5 shadow-lg backdrop-blur-xl lg:hidden"
          initial={{ y: 120 }}
          animate={{ y: 0 }}
          exit={{ y: 120 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <span className="flex flex-col leading-tight">
            <span className="text-caption text-muted-foreground">{priceLabel}</span>
            <span className="tabular font-semibold">{price}</span>
          </span>
          <Button asChild size="md">
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
