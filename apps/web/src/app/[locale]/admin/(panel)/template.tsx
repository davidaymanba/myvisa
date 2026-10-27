"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/** Each admin screen rises in on navigation. */
export default function PanelTemplate({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 18, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}
