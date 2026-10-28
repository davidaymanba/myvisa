"use client";

import { APPLICANT_TYPES, GENDERS, RELATIONSHIPS, travelerInputSchema, type AppLocale, type Nationality, type OrderQuote, type SavedTravelerView, type TravelerInput } from "@myvisa/shared";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Check, Plus, Trash2, UserRound } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Controller, get, useFieldArray, useForm, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { useApplyFieldError } from "./use-apply";

export const MAX_TRAVELERS = 9;

const formSchema = z.object({
  travelers: z.array(travelerInputSchema).min(1).max(MAX_TRAVELERS),
  email: z.union([z.literal(""), z.email()]).optional(),
});
export type TravelersForm = z.input<typeof formSchema>;
export type TravelersData = z.output<typeof formSchema>;

export function blankTraveler(applicantType: TravelerInput["applicantType"], first: boolean, nationalityIso2?: string): TravelerInput {
  return {
    relationship: first ? "SELF" : "SPOUSE",
    givenNameEn: "",
    surnameEn: "",
    fullNameAr: "",
    gender: "MALE",
    dateOfBirth: "",
    nationalityIso2: applicantType === "SAUDI_CITIZEN" ? "SA" : (nationalityIso2 ?? ""),
    applicantType,
    passportNumber: "",
    passportExpiry: "",
  };
}

export function useTravelersForm(defaults: TravelersForm) {
  return useForm<TravelersForm, unknown, TravelersData>({ resolver: zodResolver(formSchema), defaultValues: defaults, mode: "onTouched" });
}

export function StepTravelers({ form, nationalities, quote, travelTo }: { form: UseFormReturn<TravelersForm, unknown, TravelersData>; nationalities: Nationality[]; quote?: OrderQuote; travelTo: string | null }) {
  const t = useTranslations("apply.travelers");
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "travelers" });
  const fieldError = useApplyFieldError();

  return (
    <div className="flex flex-col gap-5">
      <SavedFamily
        full={fields.length >= MAX_TRAVELERS}
        onPick={(t) => {
          // Fill the first card while it's still empty; otherwise add a new one.
          const first = form.getValues("travelers.0");
          if (fields.length === 1 && !first?.passportNumber && !first?.givenNameEn) form.setValue("travelers.0", t, { shouldValidate: true });
          else append(t);
        }}
      />
      <AnimatePresence initial={false}>
        {fields.map((f, i) => (
          <TravelerCard key={f.id} index={i} form={form} nationalities={nationalities} onRemove={fields.length > 1 ? () => remove(i) : undefined} line={quote?.lines[i]} travelTo={travelTo} />
        ))}
      </AnimatePresence>
      {fields.length < MAX_TRAVELERS ? (
        <button
          type="button"
          onClick={() => append(blankTraveler(form.getValues("travelers.0.applicantType") ?? "SAUDI_CITIZEN", false, form.getValues("travelers.0.nationalityIso2")))}
          className="group flex items-center justify-center gap-3 rounded-[1.75rem] border-2 border-dashed border-border-strong py-6 text-body font-medium text-muted-foreground transition hover:border-secondary hover:bg-secondary/[0.04] hover:text-foreground"
        >
          <span className="grid size-10 place-items-center rounded-full bg-muted transition-transform duration-300 group-hover:rotate-90 group-hover:bg-secondary group-hover:text-secondary-foreground">
            <Plus className="size-5" aria-hidden />
          </span>
          {t("add")}
        </button>
      ) : (
        <p className="text-center text-body-sm text-muted-foreground">{t("max", { max: MAX_TRAVELERS })}</p>
      )}
      <Field label={t("email")} hint={t("emailHint")} error={fieldError(form.formState.errors.email)} className="max-w-md">
        <Input type="email" dir="ltr" autoComplete="email" {...form.register("email")} />
      </Field>
    </div>
  );
}

function TravelerCard({ index, form, nationalities, onRemove, line, travelTo }: { index: number; form: UseFormReturn<TravelersForm, unknown, TravelersData>; nationalities: Nationality[]; onRemove?: () => void; line?: OrderQuote["lines"][number]; travelTo: string | null }) {
  const t = useTranslations("apply.travelers");
  const locale = useLocale() as AppLocale;
  const fieldError = useApplyFieldError();
  const name = (k: string) => `travelers.${index}.${k}` as `travelers.${number}.givenNameEn`;
  const err = (k: string) => fieldError(get(form.formState.errors, `travelers.${index}.${k}`));
  const applicant = form.watch(`travelers.${index}.applicantType`);
  const expiry = form.watch(`travelers.${index}.passportExpiry`);
  const given = form.watch(`travelers.${index}.givenNameEn`);

  // A Saudi citizen's nationality is Saudi; switching to resident clears it so it's chosen deliberately.
  useEffect(() => {
    const current = form.getValues(`travelers.${index}.nationalityIso2`);
    if (applicant === "SAUDI_CITIZEN" && current !== "SA") form.setValue(`travelers.${index}.nationalityIso2`, "SA", { shouldValidate: form.formState.isSubmitted });
    if (applicant === "RESIDENT" && current === "SA") form.setValue(`travelers.${index}.nationalityIso2`, "");
  }, [applicant, form, index]);

  const shortExpiry = useMemo(() => {
    if (!expiry || !travelTo) return false;
    const limit = new Date(travelTo);
    limit.setMonth(limit.getMonth() + 6);
    return new Date(expiry) < limit;
  }, [expiry, travelTo]);

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, transition: { duration: 0.25 } }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn("rounded-[2rem] border bg-surface p-5 shadow-sm sm:p-7", line && !line.eligible ? "border-danger/40" : "border-border")}
    >
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-teal-300 to-teal-700 text-white">
            <UserRound className="size-5" aria-hidden />
          </span>
          <div className="flex flex-col">
            <span className="eyebrow text-accent-text">{t("traveler", { n: index + 1 })}</span>
            <span lang="en" dir="ltr" className="font-display text-title [direction:ltr] rtl:text-end">
              {given?.trim() || "—"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {line && (line.eligible ? <Badge tone="success">{t(`applicants.${line.applicantType}`)}</Badge> : <Badge tone="danger">{t("notOffered")}</Badge>)}
          {onRemove && (
            <Button type="button" variant="ghost" size="icon-sm" className="text-danger hover:bg-danger-soft" onClick={onRemove} aria-label={t("remove")}>
              <Trash2 aria-hidden />
            </Button>
          )}
        </div>
      </header>
      {line && !line.eligible && line.ineligibleReason && <p className="mb-5 rounded-2xl bg-danger-soft px-4 py-3 text-body-sm text-danger">{line.ineligibleReason[locale]}</p>}

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectBox form={form} name={name("applicantType")} label={t("applicantType")} options={APPLICANT_TYPES.map((a) => ({ value: a, label: t(`applicants.${a}`) }))} error={err("applicantType")} />
        <SelectBox form={form} name={name("relationship")} label={t("relationship")} options={RELATIONSHIPS.map((r) => ({ value: r, label: t(`relationships.${r}`) }))} error={err("relationship")} />
        <Field label={t("givenName")} hint={t("nameHint")} error={err("givenNameEn")}>
          <Input dir="ltr" lang="en" autoComplete="given-name" className="uppercase" {...form.register(name("givenNameEn"))} />
        </Field>
        <Field label={t("surname")} error={err("surnameEn")}>
          <Input dir="ltr" lang="en" autoComplete="family-name" className="uppercase" {...form.register(name("surnameEn"))} />
        </Field>
        <Field label={t("fullNameAr")} error={err("fullNameAr")} className="sm:col-span-2">
          <Input dir="rtl" lang="ar" {...form.register(name("fullNameAr"))} />
        </Field>
        <SelectBox form={form} name={name("gender")} label={t("gender")} options={GENDERS.map((g) => ({ value: g, label: t(`genders.${g}`) }))} error={err("gender")} />
        <Field label={t("dateOfBirth")} error={err("dateOfBirth")}>
          <Input type="date" dir="ltr" autoComplete="bday" {...form.register(name("dateOfBirth"))} />
        </Field>
        <SelectBox
          form={form}
          name={name("nationalityIso2")}
          label={t("nationality")}
          disabled={applicant === "SAUDI_CITIZEN"}
          options={applicant === "SAUDI_CITIZEN" ? [{ value: "SA", label: locale === "ar" ? "سعودي" : "Saudi" }] : nationalities.map((n) => ({ value: n.iso2, label: n.name[locale] }))}
          error={err("nationalityIso2")}
        />
        <Field label={t("passportNumber")} error={err("passportNumber")}>
          <Input dir="ltr" lang="en" autoComplete="off" spellCheck={false} className="tabular uppercase tracking-wider" {...form.register(name("passportNumber"))} />
        </Field>
        <Field label={t("passportExpiry")} error={err("passportExpiry")} className="sm:col-span-2 sm:max-w-[calc(50%-0.625rem)]">
          <Input type="date" dir="ltr" {...form.register(name("passportExpiry"))} />
        </Field>
      </div>
      <AnimatePresence>
        {shortExpiry && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-4 flex items-start gap-2 rounded-2xl bg-warning-soft px-4 py-3 text-body-sm text-warning">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t("expiryWarning")}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function SelectBox({ form, name, label, options, error, disabled }: { form: UseFormReturn<TravelersForm, unknown, TravelersData>; name: `travelers.${number}.givenNameEn`; label: string; options: { value: string; label: string }[]; error?: string; disabled?: boolean }) {
  return (
    <Field label={label} error={error}>
      <Controller
        control={form.control}
        name={name}
        render={({ field }) => (
          <Select value={field.value || undefined} onValueChange={field.onChange} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </Field>
  );
}

/** Travellers saved on the account (the family): one tap fills a card with their passport details. */
function SavedFamily({ onPick, full }: { onPick: (t: TravelerInput) => void; full: boolean }) {
  const t = useTranslations("apply.travelers");
  const saved = useQuery({ queryKey: ["account", "travelers"], queryFn: () => api<SavedTravelerView[]>("/me/travelers"), retry: false });
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);
  if (!saved.data?.length) return null;

  const pick = async (id: string) => {
    setLoading(id);
    try {
      const traveler = await api<TravelerInput>(`/me/travelers/${id}`);
      onPick({ ...traveler, fullNameAr: traveler.fullNameAr ?? "" });
      setAdded((s) => new Set(s).add(id));
    } finally {
      setLoading(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3 rounded-[1.75rem] border border-gold-400/40 bg-gold-50/60 p-4 sm:p-5 dark:bg-gold-400/[0.06]">
      <span className="eyebrow text-accent-text">{t("saved")}</span>
      <div className="flex flex-wrap gap-2">
        {saved.data.map((s) => {
          const isAdded = added.has(s.id);
          return (
            <motion.button
              key={s.id}
              type="button"
              whileTap={{ scale: 0.95 }}
              disabled={isAdded || full || loading !== null}
              onClick={() => void pick(s.id)}
              className={cn("flex items-center gap-2 rounded-full border py-1.5 pe-4 ps-1.5 text-body-sm font-medium transition-colors disabled:cursor-default", isAdded ? "border-success/40 bg-success-soft text-success" : "border-border bg-surface hover:border-foreground/30")}
            >
              <span lang="en" className={cn("grid size-7 place-items-center rounded-full text-caption text-white", isAdded ? "bg-success" : "bg-gradient-to-br from-teal-300 to-teal-700")}>
                {isAdded ? <Check className="size-3.5" aria-hidden /> : `${s.givenNameEn.charAt(0)}${s.surnameEn.charAt(0)}`}
              </span>
              <span lang="en">{s.givenNameEn}</span>
              <span className="text-caption text-muted-foreground">· {isAdded ? t("savedAdded") : t(`relationships.${s.relationship}`)}</span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
