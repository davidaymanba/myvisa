"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ENTRY_TYPES, TRAVEL_PURPOSES, VISA_KINDS, calculatePrice, serviceInputSchema, type CountryDetail, type CountryListItem, type ServiceData, type ServiceInput, type ServiceRecord } from "@myvisa/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, ChevronDown, Plus, Stamp } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { NumberField, SelectField, SwitchField, TextField } from "../fields";
import { Bilingual, ConfirmDelete, useMoney } from "../form-bits";
import { adminKeys, applyServerErrors, useCan, useMutationToasts } from "../use-admin";
import { PriceRules } from "./price-rules";
import { Requirements } from "./requirements";

export function VisaPanel({ country }: { country: CountryDetail }) {
  const t = useTranslations("admin.visa");
  const can = useCan();
  const visas = country.services.filter((s) => s.category === "VISA");
  const [open, setOpen] = useState<string | null>(visas[0]?.id ?? null);
  const [adding, setAdding] = useState(false);
  const nationalities = useQuery({ queryKey: adminKeys.nationalities, queryFn: () => api<CountryListItem[]>("/admin/countries?kind=nationality") });

  return (
    <div className="flex flex-col gap-4">
      {can("catalog:write") && !adding && (
        <Button variant="outline" className="w-fit" onClick={() => setAdding(true)}>
          <Plus aria-hidden />
          {t("add")}
        </Button>
      )}
      <AnimatePresence initial={false}>
        {adding && (
          <motion.div key="new" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="rounded-[2rem] border border-gold-400/60 bg-surface p-6 shadow-md ring-4 ring-gold-400/10 sm:p-8">
            <h3 className="mb-6 font-display text-display-md">{t("newTitle")}</h3>
            <VisaForm countryId={country.id} slugPrefix={country.iso2.toLowerCase()} onCreated={(id) => (setAdding(false), setOpen(id))} onCancel={() => setAdding(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {visas.length === 0 && !adding ? (
        <EmptyState icon={<Stamp />} title={t("empty")} description={t("emptyBody")} />
      ) : (
        visas.map((visa, i) => <VisaTicket key={visa.id} visa={visa} index={i} country={country} nationalities={nationalities.data ?? []} open={open === visa.id} onToggle={() => setOpen(open === visa.id ? null : visa.id)} />)
      )}
    </div>
  );
}

/** Collapsed: a boarding-pass stub with the key facts and prices. Expanded: the full visa editor. */
function VisaTicket({ visa, index, country, nationalities, open, onToggle }: { visa: ServiceRecord; index: number; country: CountryDetail; nationalities: CountryListItem[]; open: boolean; onToggle: () => void }) {
  const t = useTranslations("admin.visa");
  const tr = useTranslations("admin.rules");
  const te = useTranslations("admin.enums");
  const tc = useTranslations("common");
  const ta = useTranslations("admin.common");
  const locale = useLocale();
  const money = useMoney();
  const general = visa.priceRules.filter((r) => r.nationalityId === null);

  return (
    <motion.article layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className={cn("overflow-hidden rounded-[2rem] border bg-surface shadow-sm transition-shadow", open ? "border-foreground/15 shadow-lg" : "border-border hover:shadow-md")}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="grid w-full gap-5 p-5 text-start sm:p-6 md:grid-cols-[1fr_auto]">
        <div className="flex min-w-0 items-start gap-4">
          <span lang="en" className="font-display text-display-md leading-none text-accent-text/60 tabular">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="teal">{te(`purposes.${visa.purpose ?? "TOURISM"}`)}</Badge>
              <Badge tone="outline">{tc(`visaKinds.${visa.visaKind ?? "E_VISA"}`)}</Badge>
              {!visa.isActive && <Badge tone="danger">{ta("inactive")}</Badge>}
            </div>
            <h3 className="font-display text-heading">{locale === "ar" ? visa.nameAr : visa.nameEn}</h3>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="size-4" aria-hidden />
                {t("processing", { min: visa.processingDaysMin, max: visa.processingDaysMax })}
              </span>
              {visa.entryType && <span>{tc(`entry.${visa.entryType}`)}</span>}
              {visa.requiresAppointment && <span>{t("appointment")}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 md:border-s md:border-dashed md:border-border-strong md:ps-6">
          <div className="flex flex-wrap gap-2">
            {general.map((r) => (
              <span key={r.id} className={cn("flex flex-col rounded-2xl px-3.5 py-2", r.isEligible ? "bg-muted" : "bg-danger-soft")}>
                <span className="text-caption text-muted-foreground">{te(`applicants.${r.applicantType}`)}</span>
                <span className={cn("tabular font-display text-title", !r.isEligible && "text-danger")}>{r.isEligible ? money(calculatePrice([{ governmentFee: r.governmentFeeHalalas, serviceFee: r.serviceFeeHalalas }]).total) : tr("notOffered")}</span>
              </span>
            ))}
          </div>
          <ChevronDown className={cn("ms-auto size-5 shrink-0 text-muted-foreground transition-transform duration-500", open && "rotate-180")} aria-hidden />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
            <div className="perforation relative mx-6 h-px border-t border-dashed border-border-strong" aria-hidden />
            <div className="flex flex-col gap-12 px-3 py-6 min-[400px]:p-5 sm:p-8">
              <VisaForm visa={visa} countryId={country.id} slugPrefix={country.iso2.toLowerCase()} />
              <PriceRules service={visa} countryId={country.id} nationalities={nationalities} />
              <Requirements service={visa} countryId={country.id} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function toValues(s: ServiceRecord): ServiceInput {
  return {
    category: "VISA",
    slug: s.slug,
    nameAr: s.nameAr,
    nameEn: s.nameEn,
    summaryAr: s.summaryAr,
    summaryEn: s.summaryEn,
    descriptionAr: s.descriptionAr,
    descriptionEn: s.descriptionEn,
    countryId: s.countryId,
    purpose: s.purpose,
    visaKind: s.visaKind,
    entryType: s.entryType,
    validityDays: s.validityDays,
    maxStayDays: s.maxStayDays,
    processingDaysMin: s.processingDaysMin,
    processingDaysMax: s.processingDaysMax,
    requiresAppointment: s.requiresAppointment,
    appointmentNoteAr: s.appointmentNoteAr,
    appointmentNoteEn: s.appointmentNoteEn,
    attributes: s.attributes,
    isActive: s.isActive,
    sortOrder: s.sortOrder,
  };
}

function VisaForm({ visa, countryId, slugPrefix, onCreated, onCancel }: { visa?: ServiceRecord; countryId: string; slugPrefix: string; onCreated?: (id: string) => void; onCancel?: () => void }) {
  const t = useTranslations("admin.visa");
  const te = useTranslations("admin.enums");
  const tc = useTranslations("common");
  const ta = useTranslations("admin.common");
  const queryClient = useQueryClient();
  const toasts = useMutationToasts();
  const can = useCan();
  const readOnly = !can("catalog:write");

  const form = useForm<ServiceInput, unknown, ServiceData>({
    resolver: zodResolver(serviceInputSchema),
    defaultValues: visa
      ? toValues(visa)
      : { category: "VISA", slug: `${slugPrefix}-tourism-`, nameAr: "", nameEn: "", countryId, purpose: "TOURISM", visaKind: "E_VISA", entryType: "SINGLE", validityDays: 90, maxStayDays: 30, processingDaysMin: 3, processingDaysMax: 7, requiresAppointment: false, isActive: true, sortOrder: 99, attributes: null },
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: adminKeys.country(countryId) });

  const save = useMutation({
    mutationFn: (data: ServiceData) => (visa ? api<ServiceRecord>(`/admin/services/${visa.id}`, { method: "PUT", body: data }) : api<ServiceRecord>("/admin/services", { method: "POST", body: data })),
    onSuccess: async (saved, data) => {
      form.reset(data as ServiceInput);
      await Promise.all([refresh(), queryClient.invalidateQueries({ queryKey: adminKeys.countries })]);
      toasts.success(visa ? t("saved") : t("created"));
      if (!visa) onCreated?.(saved.id);
    },
    onError: (e) => {
      applyServerErrors(e, form.setError);
      toasts.error(e);
    },
  });
  const remove = useMutation({
    mutationFn: () => api(`/admin/services/${visa!.id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await Promise.all([refresh(), queryClient.invalidateQueries({ queryKey: adminKeys.countries })]);
      toasts.success(t("deleted"));
    },
    onError: toasts.error,
  });

  const appointment = form.watch("requiresAppointment");

  return (
    <form onSubmit={form.handleSubmit((d) => save.mutate(d))} noValidate className="flex flex-col gap-5">
      <fieldset disabled={readOnly} className="flex min-w-0 flex-col gap-5">
        <Bilingual>
          <TextField form={form} name="nameAr" label={t("fields.nameAr")} />
          <TextField form={form} name="nameEn" label={t("fields.nameEn")} lang="en" />
        </Bilingual>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <TextField form={form} name="slug" label={t("fields.slug")} lang="code" className="lg:col-span-1 [&_input]:normal-case" />
          <SelectField form={form} name="purpose" label={t("fields.purpose")} options={TRAVEL_PURPOSES.map((p) => ({ value: p, label: te(`purposes.${p}`) }))} />
          <SelectField form={form} name="visaKind" label={t("fields.kind")} options={VISA_KINDS.map((k) => ({ value: k, label: tc(`visaKinds.${k}`) }))} />
          <SelectField form={form} name="entryType" label={t("fields.entry")} options={ENTRY_TYPES.map((e) => ({ value: e, label: tc(`entry.${e}`) }))} />
          <NumberField form={form} name="validityDays" label={t("fields.validityDays")} step="1" />
          <NumberField form={form} name="maxStayDays" label={t("fields.maxStayDays")} step="1" />
          <NumberField form={form} name="processingDaysMin" label={t("fields.processingMin")} step="1" />
          <NumberField form={form} name="processingDaysMax" label={t("fields.processingMax")} step="1" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <SwitchField form={form} name="requiresAppointment" label={t("fields.requiresAppointment")} />
          <SwitchField form={form} name="isActive" label={t("fields.isActive")} />
        </div>
        <AnimatePresence initial={false}>
          {appointment && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <Bilingual>
                <TextField form={form} name="appointmentNoteAr" label={t("fields.appointmentNoteAr")} multiline rows={2} />
                <TextField form={form} name="appointmentNoteEn" label={t("fields.appointmentNoteEn")} lang="en" multiline rows={2} />
              </Bilingual>
            </motion.div>
          )}
        </AnimatePresence>
      </fieldset>
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          {visa ? (
            <>
              <Button type="submit" size="sm" loading={save.isPending} disabled={!form.formState.isDirty}>
                {ta("save")}
              </Button>
              {form.formState.isDirty && (
                <Button type="button" variant="ghost" size="sm" onClick={() => form.reset()}>
                  {ta("discard")}
                </Button>
              )}
              <span className="ms-auto">
                <ConfirmDelete label={t("deleteVisa")} busy={remove.isPending} onConfirm={() => remove.mutateAsync()} />
              </span>
            </>
          ) : (
            <>
              <Button type="submit" loading={save.isPending}>
                {ta("create")}
              </Button>
              <Button type="button" variant="ghost" onClick={onCancel}>
                {ta("cancel")}
              </Button>
            </>
          )}
        </div>
      )}
    </form>
  );
}
