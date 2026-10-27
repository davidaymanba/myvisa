"use client";

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

/** Paragraph whose words "ink in" one by one as it scrolls through the viewport. */
export function ScrollText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 45%"] });
  const words = text.split(" ");
  return (
    <p ref={ref} className={cn("flex flex-wrap gap-x-[0.28em]", className)}>
      {words.map((w, i) => (
        <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} reduce={Boolean(reduce)}>
          {w}
        </Word>
      ))}
    </p>
  );
}

function Word({ children, progress, range, reduce }: { children: string; progress: MotionValue<number>; range: [number, number]; reduce: boolean }) {
  const opacity = useTransform(progress, range, reduce ? [1, 1] : [0.14, 1]);
  return <motion.span style={{ opacity }}>{children}</motion.span>;
}
