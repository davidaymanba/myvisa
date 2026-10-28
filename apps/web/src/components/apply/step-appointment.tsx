"use client";

import { APPOINTMENT_CITIES } from "@myvisa/shared";
import { Building2 } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface AppointmentValue {
  preferredCity: (typeof APPOINTMENT_CITIES)[number] | null;
  preferredDateFrom: string | null;
  preferredDateTo: string | null;
  appointmentNotes: string | null;
}

export function StepAppointment({ value, onChange }: { value: AppointmentValue; onChange: (v: AppointmentValue) => void }) {
  const t = useTranslations("apply.appointment");
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex flex-col gap-8">
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-4 font-display text-heading">{t("city")}</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {APPOINTMENT_CITIES.map((city, i) => {
            const active = value.preferredCity === city;
            return (
              <motion.button
                key={city}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ ...value, preferredCity: city })}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={cn("group relative flex flex-col items-start gap-6 overflow-hidden rounded-[1.75rem] border p-5 text-start transition-all duration-300", active ? "dark border-transparent bg-ink-950 text-foreground shadow-lg" : "border-border bg-surface hover:-translate-y-1 hover:shadow-md")}
              >
                {active && <span aria-hidden className="absolute -end-10 -top-10 size-32 animate-drift rounded-full bg-gold-400/30 blur-2xl" />}
                <Building2 className={cn("relative size-6 transition-transform duration-500 group-hover:-rotate-6", active ? "text-gold-300" : "text-secondary-text")} aria-hidden />
                <span className="relative font-display text-display-md">{t(`cities.${city}`)}</span>
              </motion.button>
            );
          })}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-4 font-display text-heading">{t("window")}</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("from")}>
            <Input type="date" dir="ltr" min={today} value={value.preferredDateFrom ?? ""} onChange={(e) => onChange({ ...value, preferredDateFrom: e.target.value || null })} />
          </Field>
          <Field label={t("to")}>
            <Input type="date" dir="ltr" min={value.preferredDateFrom ?? today} value={value.preferredDateTo ?? ""} onChange={(e) => onChange({ ...value, preferredDateTo: e.target.value || null })} />
          </Field>
        </div>
      </fieldset>
      <Field label={t("notes")} hint={t("notesHint")}>
        <Textarea rows={3} value={value.appointmentNotes ?? ""} onChange={(e) => onChange({ ...value, appointmentNotes: e.target.value || null })} />
      </Field>
    </div>
  );
}
