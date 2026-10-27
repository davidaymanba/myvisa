"use client";

import { ReactLenis } from "lenis/react";
import { useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/** Inertial page scrolling. Off for reduced-motion users; dialogs opt out via data-lenis-prevent. */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <ReactLenis root options={{ lerp: 0.1, wheelMultiplier: 1, anchors: { offset: -80 }, autoRaf: true }}>
      {children}
    </ReactLenis>
  );
}
