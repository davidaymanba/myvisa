"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const CHARSET = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-·";

/**
 * Solari-style split-flap text: every cell spins through the character drum and lands on its letter,
 * staggered left to right. Latin only — airport boards (and Arabic joins) don't mix.
 */
export function SplitFlap({ text, length, className, cellClassName, delay = 0 }: { text: string; length: number; className?: string; cellClassName?: string; delay?: number }) {
  const reduce = useReducedMotion();
  const target = text.toUpperCase().padEnd(length, " ").slice(0, length);
  const [shown, setShown] = useState(target);
  const frame = useRef<number>(0);

  useEffect(() => {
    if (reduce) {
      setShown(target);
      return;
    }
    const start = performance.now() + delay * 1000;
    // Each cell flips for a while, then settles; later cells settle later.
    const settleAt = Array.from({ length }, (_, i) => 260 + i * 55 + Math.random() * 120);
    const tick = (now: number) => {
      const elapsed = now - start;
      let done = true;
      const next = Array.from(target, (ch, i) => {
        if (elapsed < 0) return shown[i] ?? " ";
        if (elapsed >= settleAt[i]!) return ch;
        done = false;
        return CHARSET[Math.floor((elapsed / 45 + i * 7) % CHARSET.length)]!;
      }).join("");
      setShown(next);
      if (!done || elapsed < 0) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animate whenever the target changes
  }, [target, reduce, delay, length]);

  return (
    <span lang="en" dir="ltr" className={cn("inline-flex gap-[3px]", className)}>
      <span className="sr-only">{text}</span>
      {Array.from(shown, (ch, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            "relative grid h-[1.6em] w-[1.05em] place-items-center overflow-hidden rounded-[3px] bg-gradient-to-b from-[#1a2533] to-[#0d151f] font-mono font-semibold text-gold-200 shadow-[inset_0_-1px_0_rgb(0_0_0/0.6),0_1px_0_rgb(255_255_255/0.05)]",
            "after:absolute after:inset-x-0 after:top-1/2 after:h-px after:bg-black/70",
            cellClassName,
          )}
        >
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}
