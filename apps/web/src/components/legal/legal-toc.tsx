"use client";

import { motion, useScroll, useSpring } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Sticky table of contents with scroll-spy and a reading-progress rail. */
export function LegalToc({ title, items }: { title: string; items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    items.forEach((i) => {
      const el = document.getElementById(i.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label={title} className="relative">
      <p className="eyebrow mb-4 text-muted-foreground">{title}</p>
      <div className="relative ps-5">
        <span aria-hidden className="absolute inset-y-0 start-0 w-px bg-border" />
        <motion.span aria-hidden className="absolute start-0 top-0 h-full w-px origin-top bg-secondary" style={{ scaleY: progress }} />
        <ol className="flex flex-col gap-1">
          {items.map((i, n) => (
            <li key={i.id}>
              <a
                href={`#${i.id}`}
                className={cn("flex gap-3 rounded-lg py-1.5 text-body-sm transition-colors", active === i.id ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <span lang="en" className={cn("tabular w-5 shrink-0 text-caption", active === i.id && "text-accent-text")}>
                  {String(n + 1).padStart(2, "0")}
                </span>
                {i.label}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
