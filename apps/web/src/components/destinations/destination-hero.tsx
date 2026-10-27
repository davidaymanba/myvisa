"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import Image from "next/image";
import { useRef, type ReactNode } from "react";

/** Full-bleed photo that zooms out and drifts as you scroll away; content fades up over it. */
export function DestinationHero({ image, alt, children }: { image: string; alt: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [1.15, 1.35]);
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["0%", "18%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, reduce ? 1 : 0]);

  return (
    <section ref={ref} data-surface="dark" className="dark relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden bg-ink-950 text-foreground">
      <motion.div className="absolute inset-0 -z-20" style={{ scale, y }}>
        <motion.div className="size-full" initial={reduce ? false : { scale: 1.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}>
          <Image src={image} alt={alt} fill priority sizes="100vw" className="object-cover" />
        </motion.div>
      </motion.div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-ink-950/55 to-ink-950/30" />
      <motion.div style={{ opacity: fade }} className="container-page pb-10 pt-40 sm:pb-14">
        {children}
      </motion.div>
    </section>
  );
}
