"use client";

import { motion, useReducedMotion, useScroll, useTransform, type HTMLMotionProps } from "motion/react";
import { useRef } from "react";

/** Moves its content against the scroll by `offset` px across the element's journey through the viewport. */
export function Parallax({ offset = 80, className, children, ...props }: HTMLMotionProps<"div"> & { offset?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [offset, -offset]);
  return (
    <motion.div ref={ref} style={{ y }} className={className} {...props}>
      {children}
    </motion.div>
  );
}
