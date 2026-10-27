"use client";

import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useLocale } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Pinned horizontal gallery: on large screens the section sticks and vertical scroll drives the track
 * sideways (in the reading direction). Phones and reduced-motion users get a native snap rail instead.
 */
export function DestinationsShowcase({ intro, children, count }: { intro: ReactNode; children: ReactNode; count: number }) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const rtl = useLocale() === "ar";
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const measure = () => setDistance(mq.matches && !reduce ? Math.max(0, track.scrollWidth - window.innerWidth) : 0);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    mq.addEventListener("change", measure);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", measure);
      window.removeEventListener("resize", measure);
    };
  }, [reduce, count]);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.3 });
  const x = useTransform(smooth, [0, 1], [0, rtl ? distance : -distance]);
  const bar = useTransform(smooth, [0, 1], ["0%", "100%"]);
  const pinned = distance > 0;

  return (
    <section ref={sectionRef} className="relative" style={pinned ? { height: `calc(100vh + ${distance}px)` } : undefined}>
      <div className={cn(pinned && "sticky top-0 flex h-screen flex-col justify-center overflow-hidden")}>
        <motion.div
          ref={trackRef}
          style={pinned ? { x } : undefined}
          className={cn(
            "flex w-max items-stretch gap-5 px-[clamp(1rem,4vw,2.5rem)] lg:gap-7",
            !pinned && "w-full snap-x snap-mandatory overflow-x-auto pb-4 [scrollbar-width:none]",
          )}
        >
          <div className="flex w-[min(86vw,30rem)] shrink-0 snap-start flex-col justify-center pe-6 lg:w-[34rem] lg:pe-16">{intro}</div>
          {children}
        </motion.div>
        {pinned && (
          <div className="container-page mt-10">
            <div className="h-px w-full overflow-hidden bg-border">
              <motion.div className="h-full bg-foreground" style={{ width: bar }} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
