"use client";

import type { ComponentProps, PointerEvent } from "react";
import { cn } from "@/lib/utils";

/** A card whose border and surface light up under the cursor (CSS vars, no re-renders). */
export function Spotlight({ className, children, ...props }: ComponentProps<"div">) {
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--sx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--sy", `${e.clientY - r.top}px`);
  };
  return (
    <div
      onPointerMove={onMove}
      className={cn(
        "group/spot relative isolate overflow-hidden",
        "before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:opacity-0 before:transition-opacity before:duration-500 hover:before:opacity-100",
        "before:bg-[radial-gradient(420px_circle_at_var(--sx,50%)_var(--sy,50%),rgb(52_193_195/0.14),transparent_60%)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
