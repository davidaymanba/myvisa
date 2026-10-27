"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/utils";

type StampShape = "circle" | "oval" | "rect";
type StampTone = "teal" | "gold" | "ink" | "danger";

const toneColor: Record<StampTone, string> = {
  teal: "var(--secondary-text)",
  gold: "var(--accent-text)",
  ink: "var(--foreground)",
  danger: "var(--danger)",
};

export interface PassportStampProps {
  shape?: StampShape;
  tone?: StampTone;
  /** Text around the top arc / header band. */
  top: string;
  /** Text around the bottom arc / footer band. */
  bottom?: string;
  /** Big centre mark — usually an IATA code like "IST". */
  code: string;
  /** Small line under the code — a date, "APPROVED", etc. */
  caption?: string;
  rotate?: number;
  /** Plays the "thunk" stamp-in animation when scrolled into view. */
  animated?: boolean;
  /** Seeds the ink-texture noise so repeated stamps don't look identical. */
  seed?: number;
  className?: string;
  title?: string;
}

/**
 * The recurring "passport stamp" motif. Pure SVG; the worn-ink look comes from an
 * feTurbulence mask + slight displacement, so it stays crisp at any size and costs no image bytes.
 */
export function PassportStamp({
  shape = "circle",
  tone = "teal",
  top,
  bottom,
  code,
  caption,
  rotate = -8,
  animated = false,
  seed = 7,
  className,
  title,
}: PassportStampProps) {
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const filterId = `stamp-ink-${uid}`;
  const topPath = `stamp-top-${uid}`;
  const bottomPath = `stamp-bottom-${uid}`;
  const color = toneColor[tone];
  const isRect = shape === "rect";
  const viewBox = isRect ? "0 0 200 130" : shape === "oval" ? "0 0 200 140" : "0 0 160 160";

  const svg = (
    <svg
      viewBox={viewBox}
      direction="ltr"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className="block size-full overflow-visible mix-blend-multiply dark:mix-blend-normal"
      style={{ color }}
    >
      <defs>
        <filter id={filterId} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed} result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.4 0 0 0 2.2" result="speckle" />
          <feComposite in="SourceGraphic" in2="speckle" operator="in" result="inked" />
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="1" seed={seed + 3} result="warp" />
          <feDisplacementMap in="inked" in2="warp" scale="2.2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {shape === "circle" && (
          <>
            <path id={topPath} d="M 25 80 A 55 55 0 0 1 135 80" />
            <path id={bottomPath} d="M 25 80 A 55 55 0 0 0 135 80" />
          </>
        )}
        {shape === "oval" && (
          <>
            <path id={topPath} d="M 30 70 A 70 46 0 0 1 170 70" />
            <path id={bottomPath} d="M 30 70 A 70 46 0 0 0 170 70" />
          </>
        )}
      </defs>

      <g filter={`url(#${filterId})`} fill="none" stroke="currentColor" opacity={0.88}>
        {shape === "circle" && (
          <>
            <circle cx="80" cy="80" r="74" strokeWidth="3.2" />
            <circle cx="80" cy="80" r="67" strokeWidth="1" />
            <circle cx="80" cy="80" r="43" strokeWidth="1.4" />
            <StampArcText pathId={topPath} text={top} size={11} />
            {bottom && <StampArcText pathId={bottomPath} text={bottom} size={11} />}
            <text x="23" y="84" fontSize="10" fill="currentColor" stroke="none" textAnchor="middle">★</text>
            <text x="137" y="84" fontSize="10" fill="currentColor" stroke="none" textAnchor="middle">★</text>
            <StampCode x={80} y={caption ? 82 : 88} code={code} size={26} />
            {caption && <StampCaption x={80} y={100} text={caption} />}
          </>
        )}
        {shape === "oval" && (
          <>
            <ellipse cx="100" cy="70" rx="94" ry="64" strokeWidth="3.2" />
            <ellipse cx="100" cy="70" rx="86" ry="57" strokeWidth="1" />
            <ellipse cx="100" cy="70" rx="55" ry="32" strokeWidth="1.4" />
            <StampArcText pathId={topPath} text={top} size={11} />
            {bottom && <StampArcText pathId={bottomPath} text={bottom} size={11} />}
            {/* Small plane glyph */}
            <path d="M58 72 l14 -2 l6 -8 l3 0 l-3 8 l9 -1 l3 -3 l2 0 l-1 4 l1 4 l-2 0 l-3 -3 l-9 -1 l3 8 l-3 0 l-6 -8 z" fill="currentColor" stroke="none" transform="translate(-6 -2) scale(0.9)" />
            <StampCode x={112} y={caption ? 72 : 78} code={code} size={26} />
            {caption && <StampCaption x={112} y={88} text={caption} />}
          </>
        )}
        {isRect && (
          <>
            <rect x="4" y="4" width="192" height="122" rx="10" strokeWidth="3.2" />
            <rect x="11" y="11" width="178" height="108" rx="6" strokeWidth="1" />
            <line x1="11" y1="38" x2="189" y2="38" strokeWidth="1" />
            <line x1="11" y1="94" x2="189" y2="94" strokeWidth="1" />
            <text lang={scriptLang(top)} x="100" y="29" fontSize="12" fontWeight="700" letterSpacing="3" textAnchor="middle" fill="currentColor" stroke="none" style={{ fontFamily: "var(--font-sans)" }}>
              {top}
            </text>
            <StampCode x={100} y={caption ? 70 : 76} code={code} size={30} />
            {caption && <StampCaption x={100} y={86} text={caption} />}
            {bottom && (
              <text lang={scriptLang(bottom)} x="100" y="112" fontSize="10.5" fontWeight="600" letterSpacing="2" textAnchor="middle" fill="currentColor" stroke="none" style={{ fontFamily: "var(--font-sans)" }}>
                {bottom}
              </text>
            )}
          </>
        )}
      </g>
    </svg>
  );

  if (!animated || reduce) {
    return (
      <div className={cn("aspect-square w-40", isRect && "aspect-[200/130] w-48", shape === "oval" && "aspect-[200/140] w-48", className)} style={{ rotate: `${rotate}deg` }}>
        {svg}
      </div>
    );
  }

  return (
    <motion.div
      className={cn("aspect-square w-40", isRect && "aspect-[200/130] w-48", shape === "oval" && "aspect-[200/140] w-48", className)}
      initial={{ opacity: 0, scale: 1.45, rotate: rotate - 14 }}
      whileInView={{ opacity: 1, scale: 1, rotate }}
      viewport={{ once: true, margin: "0px 0px -15% 0px" }}
      transition={{ type: "spring", stiffness: 420, damping: 22, mass: 0.9 }}
    >
      {svg}
    </motion.div>
  );
}

/** Tag text with its script so the global Arabic no-tracking rule only hits Arabic strings. */
const scriptLang = (text: string) => (/[\u0600-\u06FF]/.test(text) ? "ar" : "en");

function StampArcText({ pathId, text, size }: { pathId: string; text: string; size: number }) {
  return (
    <text lang={scriptLang(text)} fontSize={size} fontWeight="700" letterSpacing="2.5" fill="currentColor" stroke="none" dominantBaseline="central" style={{ fontFamily: "var(--font-sans)" }}>
      <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
        {text}
      </textPath>
    </text>
  );
}

function StampCode({ x, y, code, size }: { x: number; y: number; code: string; size: number }) {
  return (
    <text lang="en" x={x} y={y} fontSize={size} fontWeight="800" letterSpacing="2" textAnchor="middle" fill="currentColor" stroke="none" style={{ fontFamily: "var(--font-inter), var(--font-sans)" }}>
      {code}
    </text>
  );
}

function StampCaption({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <text lang={scriptLang(text)} x={x} y={y} fontSize="9.5" fontWeight="600" letterSpacing="1.5" textAnchor="middle" fill="currentColor" stroke="none" style={{ fontFamily: "var(--font-inter), var(--font-sans)" }}>
      {text}
    </text>
  );
}
