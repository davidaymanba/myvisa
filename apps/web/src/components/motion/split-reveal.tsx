"use client";

import { motion, useReducedMotion } from "motion/react";
import { Fragment, type ElementType } from "react";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

export interface RevealLine {
  text: string;
  className?: string;
  /** Applied to each word — use for `bg-clip-text` gradients, which can't paint through transformed children. */
  wordClassName?: string;
}

/**
 * Headline reveal: each word rises out of its own clipping mask, line by line.
 * Splits on words only — splitting Arabic into letters would break its cursive joins.
 */
export function SplitReveal({
  lines,
  as: Tag = "h2",
  className,
  delay = 0,
  stagger = 0.06,
  trigger = "inView",
}: {
  lines: RevealLine[];
  as?: ElementType;
  className?: string;
  delay?: number;
  stagger?: number;
  /** "mount" for above-the-fold heroes, "inView" for everything else. */
  trigger?: "mount" | "inView";
}) {
  const reduce = useReducedMotion();
  let index = 0;
  const label = lines.map((l) => l.text).join(" ");

  const play = { whileInView: "visible", viewport: { once: true, margin: "0px 0px -10% 0px" } };

  // Above the fold: CSS-only, so the headline animates from the first paint, before hydration.
  if (trigger === "mount") {
    return (
      <Tag className={className} aria-label={label}>
        <span className="block" aria-hidden>
          {lines.map((line, li) => (
            <span key={li} className={cn("block", line.className)}>
              {line.text.split(" ").map((word, wi, arr) => {
                const i = index++;
                return (
                  <Fragment key={wi}>
                    <span className="inline-block overflow-hidden pb-[0.12em] align-top -mb-[0.12em]">
                      <span className={cn("inline-block animate-word-in", line.wordClassName)} style={{ animationDelay: `${delay + i * stagger}s` }}>
                        {word}
                      </span>
                    </span>
                    {wi < arr.length - 1 && " "}
                  </Fragment>
                );
              })}
            </span>
          ))}
        </span>
      </Tag>
    );
  }

  return (
    <Tag className={className} aria-label={label}>
      <motion.span initial={reduce ? false : "hidden"} {...play} className="block" aria-hidden>
        {lines.map((line, li) => (
          <span key={li} className={cn("block", line.className)}>
            {line.text.split(" ").map((word, wi, arr) => {
              const i = index++;
              return (
                // The space must sit *between* the inline-blocks; inside one it would be collapsed.
                <Fragment key={wi}>
                  <span className="inline-block overflow-hidden pb-[0.12em] align-top -mb-[0.12em]">
                    <motion.span
                      className={cn("inline-block will-change-transform", line.wordClassName)}
                      variants={{
                        hidden: { y: "110%", rotate: 4 },
                        visible: { y: "0%", rotate: 0, transition: { duration: 1, ease: EASE, delay: delay + i * stagger } },
                      }}
                    >
                      {word}
                    </motion.span>
                  </span>
                  {wi < arr.length - 1 && " "}
                </Fragment>
              );
            })}
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}
