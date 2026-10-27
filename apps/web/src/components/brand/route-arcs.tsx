"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/utils";

interface Point {
  code: string;
  lon: number;
  lat: number;
  /** Which side of the dot the code sits on, to keep neighbouring labels apart. */
  label?: "above" | "below" | "left" | "right";
}

const ORIGIN: Point = { code: "RUH", lon: 46.7, lat: 24.7 };

const DEFAULT_DESTINATIONS: Point[] = [
  { code: "LHR", lon: -0.45, lat: 51.47, label: "left" },
  { code: "CDG", lon: 2.55, lat: 49.0, label: "below" },
  { code: "IST", lon: 28.8, lat: 41.27, label: "left" },
  { code: "TBS", lon: 44.95, lat: 41.67 },
  { code: "KUL", lon: 101.7, lat: 2.75 },
  { code: "HND", lon: 139.78, lat: 35.55, label: "below" },
  { code: "JFK", lon: -73.78, lat: 40.64 },
  { code: "DPS", lon: 115.17, lat: -8.75 },
];

const W = 1000;
const H = 420;
// Simple equirectangular crop covering the Americas' east coast to Japan.
const project = ({ lon, lat }: Point) => ({ x: ((lon + 82) / 232) * W, y: ((68 - lat) / 84) * H });

function arcPath(a: { x: number; y: number }, b: { x: number; y: number }) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${mx.toFixed(1)} ${(my - dist * 0.32).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

function labelPosition(p: { x: number; y: number }, side: Point["label"] = "above") {
  switch (side) {
    case "below":
      return { x: p.x, y: p.y + 22, textAnchor: "middle" as const };
    case "left":
      return { x: p.x - 10, y: p.y + 4, textAnchor: "end" as const };
    case "right":
      return { x: p.x + 10, y: p.y + 4, textAnchor: "start" as const };
    default:
      return { x: p.x, y: p.y - 12, textAnchor: "middle" as const };
  }
}

/**
 * Lightweight hero visual: animated great-circle-ish arcs from Riyadh. ~3 KB of SVG,
 * no WebGL — keeps LCP fast on mid-range phones. Map projection is never mirrored for RTL.
 * On phones the box is 4:3 and the map is centre-cropped (slice) so Riyadh's routes stay legible.
 */
export function RouteArcs({ destinations = DEFAULT_DESTINATIONS, className }: { destinations?: Point[]; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const o = project(ORIGIN);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      direction="ltr"
      preserveAspectRatio="xMidYMid slice"
      className={cn("block aspect-[4/3] h-auto w-full sm:aspect-[1000/420]", className)}
      aria-hidden
    >
      <defs>
        <pattern id={`dots-${uid}`} width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.2" fill="currentColor" />
        </pattern>
        <radialGradient id={`fade-${uid}`} cx="55%" cy="48%" r="60%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id={`mask-${uid}`}>
          <rect width={W} height={H} fill={`url(#fade-${uid})`} />
        </mask>
        <linearGradient id={`arc-${uid}`} x1="0" x2="1">
          <stop offset="0%" stopColor="var(--color-gold-400)" />
          <stop offset="100%" stopColor="var(--color-teal-300)" />
        </linearGradient>
      </defs>

      <rect width={W} height={H} fill={`url(#dots-${uid})`} mask={`url(#mask-${uid})`} className="text-foreground/[0.13]" />

      {destinations.map((d, i) => {
        const p = project(d);
        const path = arcPath(o, p);
        return (
          <g key={d.code}>
            <motion.path
              d={path}
              fill="none"
              stroke={`url(#arc-${uid})`}
              strokeWidth="1.6"
              strokeLinecap="round"
              initial={reduce ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.6, delay: 0.3 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
            />
            <path d={path} fill="none" stroke="var(--color-gold-300)" strokeWidth="1.6" strokeDasharray="2 10" className="animate-route-dash opacity-60" />
            {!reduce && (
              <circle r="3.2" fill="var(--color-gold-400)">
                <animateMotion dur={`${5 + (i % 3)}s`} begin={`${1.6 + i * 0.4}s`} repeatCount="indefinite" path={path} />
              </circle>
            )}
            <circle cx={p.x} cy={p.y} r="4" fill="var(--surface)" stroke="var(--secondary-text)" strokeWidth="2" />
            <text {...labelPosition(p, d.label)} fontSize="12" fontWeight="600" letterSpacing="1.5" fill="currentColor" stroke="var(--background)" strokeWidth="4" paintOrder="stroke" className="text-muted-foreground" style={{ fontFamily: "var(--font-inter), var(--font-sans)" }}>
              {d.code}
            </text>
          </g>
        );
      })}

      <g>
        <circle cx={o.x} cy={o.y} r="9" fill="var(--color-gold-400)" opacity="0.35" className="origin-center animate-pulse-ring [transform-box:fill-box]" />
        <circle cx={o.x} cy={o.y} r="6.5" fill="var(--color-gold-400)" stroke="var(--surface)" strokeWidth="2.5" />
        <text x={o.x} y={o.y + 26} textAnchor="middle" fontSize="13" fontWeight="700" letterSpacing="1.5" fill="currentColor" stroke="var(--background)" strokeWidth="4" paintOrder="stroke" className="text-foreground" style={{ fontFamily: "var(--font-inter), var(--font-sans)" }}>
          {ORIGIN.code}
        </text>
      </g>
    </svg>
  );
}
