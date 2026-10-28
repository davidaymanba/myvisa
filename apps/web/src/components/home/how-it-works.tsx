"use client";

import { AnimatePresence, motion, useInView, useScroll, useSpring } from "motion/react";
import { Check, FileCheck2, MapPin, Plane, ScanLine, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/brand/logo";
import { PassportStamp } from "@/components/brand/passport-stamp";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

interface Step {
  title: string;
  body: string;
}

/**
 * Scroll-told story: steps scroll past on one side while a sticky "device" on the other side
 * plays the matching scene. A progress rail fills with scroll. Phones show each scene inline.
 */
export function HowItWorks() {
  const t = useTranslations("home.how");
  const steps = t.raw("steps") as Step[];
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 60%", "end 60%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
      <div className="hidden lg:col-span-6 lg:block">
        <div className="sticky top-[14vh] h-[72vh]">
          <SceneFrame active={active} />
        </div>
      </div>

      <ol ref={listRef} className="relative lg:col-span-6">
        <span aria-hidden className="absolute bottom-0 start-[1.375rem] top-0 w-px bg-border" />
        <motion.span aria-hidden className="absolute start-[1.375rem] top-0 w-px origin-top bg-gradient-to-b from-gold-400 to-teal-400" style={{ height: "100%", scaleY: progress }} />
        {steps.map((step, i) => (
          <StepItem key={step.title} index={i} step={step} active={active === i} onActive={() => setActive(i)} />
        ))}
      </ol>
    </div>
  );
}

function StepItem({ index, step, active, onActive }: { index: number; step: Step; active: boolean; onActive: () => void }) {
  const ref = useRef<HTMLLIElement>(null);
  const inView = useInView(ref, { margin: "-45% 0px -45% 0px" });
  useEffect(() => {
    if (inView) onActive();
  }, [inView, onActive]);

  return (
    <li ref={ref} className="relative flex gap-6 pb-16 last:pb-0 lg:min-h-[62vh] lg:items-center lg:pb-0">
      <span
        className={cn(
          "relative z-10 grid size-11 shrink-0 place-items-center rounded-full border-2 bg-background font-semibold tabular transition-all duration-500",
          active ? "scale-110 border-gold-400 bg-gold-400 text-ink-950 shadow-gold" : "border-border text-muted-foreground",
        )}
        lang="en"
      >
        {index + 1}
      </span>
      <div className="flex flex-col gap-4 pt-1">
        <h3 className={cn("font-display text-[clamp(1.75rem,1.4rem+1.4vw,2.75rem)] leading-tight transition-colors duration-500", !active && "lg:text-foreground/35")}>{step.title}</h3>
        <p className={cn("max-w-md text-body-lg text-muted-foreground transition-opacity duration-500", !active && "lg:opacity-40")}>{step.body}</p>
        <div className="mt-4 h-[23rem] overflow-hidden rounded-3xl max-sm:-ms-[4.25rem] sm:h-80 lg:hidden">
          <SceneFrame active={index} />
        </div>
      </div>
    </li>
  );
}

function SceneFrame({ active }: { active: number }) {
  return (
    <div className="dark relative h-full overflow-hidden rounded-[2rem] border border-white/10 bg-ink-900 text-foreground shadow-lg">
      <div aria-hidden className="absolute -start-20 -top-20 size-72 rounded-full bg-teal-500/30 blur-3xl" />
      <div aria-hidden className="absolute -bottom-24 -end-10 size-72 rounded-full bg-gold-400/20 blur-3xl" />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(rgb(243_247_249/0.6)_1px,transparent_1px)] [background-size:22px_22px] opacity-[0.07]" />
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          className="absolute inset-0 grid place-items-center p-5 sm:p-8"
          initial={{ opacity: 0, scale: 0.94, filter: "blur(8px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          {active === 0 && <SceneSearch />}
          {active === 1 && <SceneScan />}
          {active === 2 && <SceneBook />}
          {active === 3 && <SceneApproved />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ── Scenes: decorative mini-UIs; text is language-neutral (codes, numbers, icons). ── */

function SceneSearch() {
  const chips = ["IST", "CDG", "LHR", "HND", "TBS"];
  return (
    <div className="w-full max-w-sm" aria-hidden>
      <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3.5 backdrop-blur">
        <Search className="size-5 text-gold-300" />
        <motion.span className="h-2.5 rounded-full bg-white/30" initial={{ width: 0 }} animate={{ width: "60%" }} transition={{ duration: 1, ease: EASE, delay: 0.2 }} />
        <motion.span className="ms-auto h-5 w-px bg-gold-300" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }} />
      </div>
      <div className="mt-5 flex flex-wrap gap-2" dir="ltr">
        {chips.map((c, i) => (
          <motion.span
            key={c}
            className={cn("rounded-full border px-4 py-2 font-[family-name:var(--font-inter)] text-body-sm font-semibold tracking-wider", i === 0 ? "border-gold-400 bg-gold-400 text-ink-950" : "border-white/15 text-foreground/70")}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.08, duration: 0.5, ease: EASE }}
          >
            {c}
          </motion.span>
        ))}
      </div>
      <motion.div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.6, ease: EASE }}>
        <div className="flex items-center justify-between" dir="ltr">
          <span className="font-[family-name:var(--font-inter)] text-display-md font-semibold">RUH</span>
          <Plane className="size-5 text-gold-300" />
          <span className="font-[family-name:var(--font-inter)] text-display-md font-semibold">IST</span>
        </div>
        <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div className="bg-teal-300" initial={{ width: 0 }} animate={{ width: "38%" }} transition={{ delay: 1.3, duration: 0.8, ease: EASE }} />
          <motion.div className="bg-gold-400" initial={{ width: 0 }} animate={{ width: "62%" }} transition={{ delay: 1.5, duration: 0.8, ease: EASE }} />
        </div>
      </motion.div>
    </div>
  );
}

function SceneScan() {
  return (
    <div className="relative w-full max-w-sm" aria-hidden>
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-teal-700 to-ink-900 p-5 shadow-lg">
        <div className="flex gap-4">
          <div className="h-28 w-22 shrink-0 rounded-lg bg-white/15" />
          <div className="flex flex-1 flex-col gap-2.5 pt-1">
            {[80, 60, 70, 45, 55].map((w, i) => (
              <span key={i} className="h-2 rounded-full bg-white/25" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
        <div dir="ltr" className="mt-5 font-mono text-[0.65rem] leading-relaxed tracking-[0.2em] text-white/50">
          P&lt;SAUALQAHTANI&lt;&lt;MOHAMMED&lt;&lt;&lt;&lt;&lt;&lt;
          <br />
          A12345678&lt;9SAU9001017M3101011&lt;&lt;&lt;&lt;
        </div>
        <motion.div
          className="absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-gold-300/40 to-transparent"
          initial={{ top: "-20%" }}
          animate={{ top: ["-20%", "100%", "-20%"] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <ScanLine className="absolute end-4 top-4 size-5 text-gold-300" />
      </div>
      <div className="mt-5 flex flex-col gap-2.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + i * 0.35, duration: 0.5, ease: EASE }}
          >
            <FileCheck2 className="size-4 text-teal-300" />
            <span className="h-2 flex-1 rounded-full bg-white/20" />
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.9 + i * 0.35, type: "spring", stiffness: 400 }} className="grid size-5 place-items-center rounded-full bg-teal-300 text-ink-950">
              <Check className="size-3" strokeWidth={3} />
            </motion.span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SceneBook() {
  const days = Array.from({ length: 21 }, (_, i) => i + 1);
  return (
    <div className="w-full max-w-sm" aria-hidden>
      <div className="rounded-2xl border border-white/15 bg-white/[0.05] p-5 backdrop-blur">
        <div className="mb-4 flex items-center justify-between" dir="ltr">
          <span className="font-[family-name:var(--font-inter)] text-body-sm font-semibold tracking-wider text-foreground/80">NOV 2026</span>
          <span className="flex items-center gap-1.5 text-caption text-foreground/60">
            <MapPin className="size-3.5" /> VFS · RUH
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1.5" dir="ltr">
          {days.map((d) => {
            const booked = d === 12;
            return (
              <motion.span
                key={d}
                className={cn(
                  "grid aspect-square place-items-center rounded-lg font-[family-name:var(--font-inter)] text-caption",
                  booked ? "bg-gold-400 font-bold text-ink-950" : d % 6 === 0 || d % 7 === 0 ? "text-foreground/25" : "bg-white/[0.06] text-foreground/70",
                )}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={booked ? { opacity: 1, scale: [0.6, 1.25, 1] } : { opacity: 1, scale: 1 }}
                transition={{ delay: booked ? 1.1 : 0.15 + d * 0.025, duration: booked ? 0.6 : 0.3 }}
              >
                {d}
              </motion.span>
            );
          })}
        </div>
      </div>
      <motion.div className="mt-4 flex items-center gap-3 rounded-2xl bg-gold-400 px-4 py-3.5 text-ink-950" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5, duration: 0.6, ease: EASE }}>
        <span className="grid size-8 place-items-center rounded-full bg-ink-950 text-gold-300">
          <Check className="size-4" strokeWidth={3} />
        </span>
        <span dir="ltr" className="font-[family-name:var(--font-inter)] text-body-sm font-semibold">
          12 NOV · 09:30 · Biometrics
        </span>
      </motion.div>
    </div>
  );
}

function SceneApproved() {
  return (
    <div className="relative w-full max-w-sm" aria-hidden>
      <motion.div
        className="relative overflow-hidden rounded-3xl bg-sand-100 p-6 text-ink-900 shadow-2xl"
        initial={{ rotate: -4, y: 30 }}
        animate={{ rotate: -2, y: 0 }}
        transition={{ duration: 0.8, ease: EASE }}
      >
        <div className="flex items-center justify-between">
          <LogoMark className="size-7 text-ink-900" />
          <span dir="ltr" className="font-mono text-caption font-semibold tracking-widest text-ink-500">
            MV-26-4F7K2Q
          </span>
        </div>
        <div className="mt-6 flex items-center justify-between" dir="ltr">
          <span className="font-[family-name:var(--font-instrument)] text-[3rem] leading-none">RUH</span>
          <Plane className="size-6 text-gold-600" />
          <span className="font-[family-name:var(--font-instrument)] text-[3rem] leading-none">CDG</span>
        </div>
        <div className="perforation my-6 [--border-strong:var(--color-sand-400)]" />
        <div className="flex gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <motion.span key={i} className="h-1.5 flex-1 rounded-full bg-teal-500" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.3 + i * 0.12, duration: 0.4 }} style={{ originX: 0 }} />
          ))}
        </div>
        <motion.div className="absolute -bottom-4 -end-4 w-40" initial={{ opacity: 0, scale: 2.2, rotate: -30 }} animate={{ opacity: 1, scale: 1, rotate: -12 }} transition={{ delay: 1.1, type: "spring", stiffness: 380, damping: 18 }}>
          <PassportStamp shape="circle" tone="teal" top="VISA APPROVED" bottom="SCHENGEN · C" code="CDG" caption="90 DAYS" rotate={0} className="w-full [&_svg]:[color:var(--color-teal-500)]" />
        </motion.div>
      </motion.div>
    </div>
  );
}
