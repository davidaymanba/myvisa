import type { CSSProperties, ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Mount-time fade + rise for above-the-fold content. Pure CSS (no hydration needed), so the content
 * appears with the first paint instead of waiting for JavaScript — the difference is seconds of LCP on phones.
 * Mark the page's main text block `lcp`: it is never hidden, only eased into place.
 */
export function FadeIn({ delay = 0, y = 20, lcp = false, className, style, ...props }: ComponentProps<"div"> & { delay?: number; y?: number; lcp?: boolean }) {
  // `lcp`: the page's main text block — painted with the first frame, only settling into place.
  return <div className={cn(lcp ? "animate-settle-in" : "animate-rise-in", className)} style={{ animationDelay: `${delay}s`, "--rise-y": `${y}px`, ...style } as CSSProperties} {...props} />;
}
