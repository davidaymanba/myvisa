"use client";

import { ArrowRight, CalendarCheck, FileSearch, Inbox, Landmark, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Counter } from "@/components/motion/counter";
import { Magnetic } from "@/components/motion/magnetic";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";

const ICONS = [Inbox, FileSearch, CalendarCheck, Landmark];

export function StaggerDemo() {
  const t = useTranslations("styleGuide.motion");
  const [run, setRun] = useState(0);
  const cards = t.raw("cards") as string[];
  return (
    <div className="flex flex-col gap-4">
      <Stagger key={run} className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((label, i) => {
          const Icon = ICONS[i] ?? Inbox;
          return (
            <StaggerItem key={label} className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <span className="grid size-10 place-items-center rounded-xl bg-muted text-secondary-text">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="text-body-sm font-medium">
                <span className="tabular me-1.5 text-accent-text">0{i + 1}</span>
                {label}
              </span>
            </StaggerItem>
          );
        })}
      </Stagger>
      <Button variant="ghost" size="sm" className="self-start" onClick={() => setRun((r) => r + 1)}>
        <RotateCcw aria-hidden />
        {t("replay")}
      </Button>
    </div>
  );
}

export function CountersDemo() {
  const t = useTranslations("styleGuide.motion");
  const stats = [
    { value: 12480, label: t("stats.visas") },
    { value: 97.8, suffix: "%", fractionDigits: 1, label: t("stats.approval") },
    { value: 4.9, suffix: "/5", fractionDigits: 1, label: t("stats.rating") },
    { value: 5, label: t("stats.reply") },
  ];
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-1 bg-surface p-5">
            <dd className="font-display text-display-md">
              <Counter value={s.value} suffix={s.suffix} fractionDigits={s.fractionDigits} />
            </dd>
            <dt className="text-body-sm text-muted-foreground">{s.label}</dt>
          </div>
        ))}
      </dl>
      <p className="text-caption text-muted-foreground">{t("sampleNote")}</p>
    </div>
  );
}

export function MagneticDemo({ label }: { label: string }) {
  return (
    <Magnetic>
      <Button size="lg">
        {label}
        <ArrowRight className="flip-rtl" aria-hidden />
      </Button>
    </Magnetic>
  );
}
