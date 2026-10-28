import { cn } from "@/lib/utils";

/** Polar rosette r = R + a·sin(kθ + φ), sampled into an SVG path. */
function rosette(cx: number, cy: number, R: number, a: number, k: number, phase: number, steps = 360) {
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const r = R + a * Math.sin(k * t + phase);
    const x = cx + r * Math.cos(t);
    const y = cy + r * Math.sin(t);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d}Z`;
}

/** Interlaced sine bands, like the security print across a passport data page. */
function wave(y: number, width: number, amp: number, period: number, phase: number) {
  let d = `M0 ${y}`;
  for (let x = 0; x <= width; x += 6) d += `L${x} ${(y + amp * Math.sin((x / period) * Math.PI * 2 + phase)).toFixed(1)}`;
  return d;
}

const ROSETTE = Array.from({ length: 14 }, (_, i) => rosette(200, 200, 120 + (i % 2) * 14, 26 + (i % 3) * 6, 12, (i * Math.PI) / 7));
const WAVES = Array.from({ length: 22 }, (_, i) => wave(14 + i * 18, 400, 7, 80 + (i % 3) * 14, i * 0.7));

/**
 * Passport-style guilloche: an engraved rosette or fine wave bands, drawn in `currentColor`.
 * Purely decorative; computed once at module load (deterministic, so server and client agree).
 */
export function Guilloche({ variant = "rosette", className }: { variant?: "rosette" | "waves"; className?: string }) {
  return (
    <svg viewBox="0 0 400 400" fill="none" stroke="currentColor" aria-hidden className={cn("pointer-events-none", className)} preserveAspectRatio={variant === "waves" ? "none" : "xMidYMid meet"}>
      {(variant === "rosette" ? ROSETTE : WAVES).map((d, i) => (
        <path key={i} d={d} strokeWidth={variant === "rosette" ? 0.6 : 0.5} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}
