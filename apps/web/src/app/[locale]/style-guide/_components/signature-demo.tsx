"use client";

import type { OrderStatus, TrackingStep } from "@myvisa/shared";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { BoardingPass } from "@/components/brand/boarding-pass";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";

const DEMO_STATUSES: OrderStatus[] = ["RECEIVED", "ACTION_REQUIRED", "APPOINTMENT_BOOKED", "SUBMITTED_TO_EMBASSY", "DELIVERED"];

const REACHED: Partial<Record<TrackingStep, string>> = {
  RECEIVED: "2026-10-12T09:20:00+03:00",
  DOCUMENTS_REVIEW: "2026-10-13T11:00:00+03:00",
  APPOINTMENT_BOOKED: "2026-10-15T14:30:00+03:00",
  SUBMITTED_TO_EMBASSY: "2026-10-19T10:00:00+03:00",
  DECISION_ISSUED: "2026-10-24T16:10:00+03:00",
  DELIVERED: "2026-10-26T12:00:00+03:00",
};
const ORDER = ["RECEIVED", "DOCUMENTS_REVIEW", "APPOINTMENT_BOOKED", "SUBMITTED_TO_EMBASSY", "DECISION_ISSUED", "DELIVERED"] as const;

function reachedFor(status: OrderStatus) {
  const upTo = status === "ACTION_REQUIRED" ? 1 : ORDER.indexOf(status as (typeof ORDER)[number]);
  return Object.fromEntries(ORDER.slice(0, upTo + (status === "DELIVERED" ? 1 : 0)).map((s) => [s, REACHED[s]]));
}

export function BoardingPassDemo() {
  const t = useTranslations("styleGuide.signature");
  const tStatus = useTranslations("ui.boardingPass.statuses");
  const [status, setStatus] = useState<OrderStatus>("APPOINTMENT_BOOKED");

  return (
    <div className="flex flex-col gap-5">
      <div role="radiogroup" aria-label={t("boardingPassDesc")} className="flex flex-wrap gap-2">
        {DEMO_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={status === s}
            onClick={() => setStatus(s)}
            className="h-9 rounded-full border border-border px-3.5 text-body-sm transition-colors hover:bg-muted aria-checked:border-foreground aria-checked:bg-foreground aria-checked:text-background"
          >
            {tStatus(s)}
          </button>
        ))}
      </div>
      <BoardingPass
        orderNumber="MV-26-4F7K2Q"
        from={{ code: "RUH", city: t("riyadh") }}
        to={{ code: "IST", city: t("istanbul") }}
        serviceName={t("sampleService")}
        travelers={3}
        status={status}
        reachedAt={reachedFor(status)}
      />
    </div>
  );
}

export function StepperDemo() {
  const t = useTranslations("styleGuide.signature");
  const steps = t.raw("stepperSteps") as string[];
  const [current, setCurrent] = useState(2);
  return (
    <div className="flex flex-col gap-6 rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <Stepper steps={steps} current={current} />
      <div className="flex justify-between gap-3">
        <Button variant="ghost" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
          <ArrowRight className="flip-rtl rotate-180" aria-hidden />
          {t("back")}
        </Button>
        <Button variant="ink" onClick={() => setCurrent((c) => Math.min(steps.length - 1, c + 1))} disabled={current === steps.length - 1}>
          {t("next")}
          <ArrowRight className="flip-rtl" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
