"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

/** Full-bleed "myvisa" that rises letter by letter as the footer scrolls in. Latin letters only, so splitting is safe. */
export function FooterWordmark() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const letters = ["m", "y", "v", "i", "s", "a"];

  return (
    <div ref={ref} lang="en" dir="ltr" aria-hidden className="relative mt-10 select-none overflow-hidden px-[2vw] sm:mt-16">
      <div className="flex justify-center font-[family-name:var(--font-instrument)] text-[clamp(6rem,24vw,22rem)] leading-[0.82] tracking-[-0.04em]">
        {letters.map((ch, i) => (
          <Letter key={i} ch={ch} i={i} progress={scrollYProgress} reduce={Boolean(reduce)} italic={i < 2} />
        ))}
      </div>
    </div>
  );
}

function Letter({
  ch,
  i,
  progress,
  reduce,
  italic,
}: {
  ch: string;
  i: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  reduce: boolean;
  italic: boolean;
}) {
  const start = 0.1 + i * 0.07;
  const y = useTransform(progress, [start, start + 0.45], reduce ? ["0%", "0%"] : ["70%", "0%"]);
  const opacity = useTransform(progress, [start, start + 0.35], reduce ? [1, 1] : [0, 1]);
  return (
    <motion.span
      style={{ y, opacity }}
      className={
        italic
          ? "inline-block bg-gradient-to-b from-gold-300 to-gold-600 bg-clip-text pe-[0.04em] italic text-transparent"
          : "inline-block bg-gradient-to-b from-sand-100 to-sand-100/10 bg-clip-text text-transparent"
      }
    >
      {ch}
    </motion.span>
  );
}
