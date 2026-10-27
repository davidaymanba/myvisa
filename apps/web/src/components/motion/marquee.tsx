import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Infinite CSS marquee (no JS). Content is duplicated once; the track slides by half its width.
 * Direction follows the reading direction; `reverse` flips it. Pauses on hover and for reduced motion.
 */
export function Marquee({
  children,
  reverse = false,
  duration = 40,
  className,
  fade = true,
  gap = "1rem",
}: {
  children: ReactNode;
  reverse?: boolean;
  duration?: number;
  className?: string;
  fade?: boolean;
  /** Space between items; also padded after each copy so the loop seam is invisible. */
  gap?: string;
}) {
  return (
    <div
      className={cn(
        "group relative flex overflow-hidden",
        fade && "[mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]",
        className,
      )}
    >
      <div
        className={cn("flex w-max shrink-0 animate-marquee group-hover:[animation-play-state:paused]", reverse && "[animation-direction:reverse]")}
        style={{ animationDuration: `${duration}s` }}
      >
        <div className="flex shrink-0" style={{ gap, paddingInlineEnd: gap }}>
          {children}
        </div>
        <div className="flex shrink-0" style={{ gap, paddingInlineEnd: gap }} aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
