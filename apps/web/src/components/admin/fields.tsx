"use client";

import { Controller, get, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";
import type { ReactNode } from "react";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput, ToggleRow } from "./form-bits";
import { numberOrNull, useFieldError } from "./use-admin";

interface Base<T extends FieldValues> {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
  hint?: ReactNode;
  optional?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** Text input bound to the form. `lang` sets direction: Arabic fields type RTL, English and codes LTR. */
export function TextField<T extends FieldValues>({ form, name, label, hint, optional, disabled, className, lang = "ar", multiline, rows = 4, placeholder, upper }: Base<T> & { lang?: "ar" | "en" | "code"; multiline?: boolean; rows?: number; placeholder?: string; upper?: boolean }) {
  const fieldError = useFieldError();
  const error = fieldError(get(form.formState.errors, name));
  const dir = lang === "ar" ? "rtl" : "ltr";
  const common = { ...form.register(name, upper ? { setValueAs: (v: unknown) => (typeof v === "string" ? v.toUpperCase() : v) } : {}), dir, lang: lang === "code" ? "en" : lang, disabled, placeholder };
  return (
    <Field label={label} hint={hint} optional={optional} error={error} className={className}>
      {multiline ? <Textarea {...common} rows={rows} /> : <Input {...common} className={lang === "code" ? "tabular font-mono uppercase tracking-wider" : undefined} />}
    </Field>
  );
}

export function NumberField<T extends FieldValues>({ form, name, label, hint, optional, disabled, className, step = "any" }: Base<T> & { step?: string }) {
  const fieldError = useFieldError();
  return (
    <Field label={label} hint={hint} optional={optional} error={fieldError(get(form.formState.errors, name))} className={className}>
      <Input type="number" inputMode="decimal" step={step} dir="ltr" className="tabular" disabled={disabled} {...form.register(name, { setValueAs: numberOrNull })} />
    </Field>
  );
}

export function MoneyField<T extends FieldValues>({ form, name, label, hint, disabled, className }: Base<T>) {
  const fieldError = useFieldError();
  return (
    <Field label={label} hint={hint} error={fieldError(get(form.formState.errors, name))} className={className}>
      <Controller control={form.control} name={name} render={({ field }) => <MoneyInput value={Number(field.value ?? 0)} onChange={field.onChange} disabled={disabled} />} />
    </Field>
  );
}

const NONE = "__none";

/** Radix select bound to the form. `nullable` adds a "none" option that stores null. */
export function SelectField<T extends FieldValues>({ form, name, label, hint, optional, disabled, className, options, nullable, noneLabel }: Base<T> & { options: { value: string; label: ReactNode }[]; nullable?: boolean; noneLabel?: string }) {
  const fieldError = useFieldError();
  return (
    <Field label={label} hint={hint} optional={optional} error={fieldError(get(form.formState.errors, name))} className={className}>
      <Controller
        control={form.control}
        name={name}
        render={({ field }) => (
          <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? null : v)} disabled={disabled}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {nullable && <SelectItem value={NONE}>{noneLabel ?? "—"}</SelectItem>}
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

export function SwitchField<T extends FieldValues>({ form, name, label, hint, disabled }: Base<T>) {
  return <Controller control={form.control} name={name} render={({ field }) => <ToggleRow label={label} hint={typeof hint === "string" ? hint : undefined} checked={Boolean(field.value)} onCheckedChange={field.onChange} disabled={disabled} />} />;
}
