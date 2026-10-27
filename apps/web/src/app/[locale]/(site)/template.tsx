"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, type ReactNode } from "react";

// The first page load already has its own entrance choreography (and must not delay LCP),
// so the curtain only plays on client-side navigations.
let hasMounted = false;

/** Re-mounts on every navigation: a short ink curtain lifts and the new page rises in. */
export default function SiteTemplate({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const animateIn = hasMounted && !reduce;
  useEffect(() => {
    hasMounted = true;
  }, []);

  if (!animateIn) return <>{children}</>;
  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[70] origin-top bg-ink-950"
        initial={{ scaleY: 1 }}
        animate={{ scaleY: 0 }}
        transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
      />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}>
        {children}
      </motion.div>
    </>
  );
}
