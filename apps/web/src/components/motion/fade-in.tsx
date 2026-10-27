"use client";

import { motion, type HTMLMotionProps } from "motion/react";

/** Mount-time fade + rise, for above-the-fold content choreography. */
export function FadeIn({ delay = 0, y = 20, ...props }: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay }}
      {...props}
    />
  );
}
