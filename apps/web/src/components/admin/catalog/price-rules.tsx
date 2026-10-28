"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { APPLICANT_TYPES, priceRuleInputSchema, type CountryListItem, type PriceRuleData, type PriceRuleInput, type PriceRuleRecord, type ServiceRecord } from "@myvisa/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Ban, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { PriceBreakdown } from "@/components/brand/price-breakdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { MoneyField, SelectField, SwitchField, TextField } from "../fields";
import { Bilingual, ConfirmDelete } from "../form-bits";
import { adminKeys, applyServerErrors, useCan, useMutationToasts } from "../use-admin";

const EMPTY: PriceRuleInput = { applicantType: "SAUDI_CITIZEN", nationalityId: null, isEligible: true, governmentFeeHalalas: 0, serviceFeeHalalas: 0, governmentFeeNoteAr: null, governmentFeeNoteEn: null, ineligibleReasonAr: null, ineligibleReasonEn: null };

function toValues(r: PriceRuleRecord): PriceRuleInput {
  return Object.fromEntries(Object.keys(EMPTY).map((k) => [k, r[k as keyof PriceRuleRecord] ?? EMPTY[k as keyof PriceRuleInput]])) as PriceRuleInput;
}

export function PriceRules({ service, countryId, nationalities }: { service: ServiceRecord; countryId: string; nationalities: CountryListItem[] }) {
  const t = useTranslations("admin.rules");
  const can = useCan();
  const [adding, setAdding] = useState(false);

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-heading">{t("title")}</h3>
          <p className="text-body-sm text-muted-foreground">{t("hint")}</p>
        </div>
        {can("pricing:write") && !adding && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus aria-hidden />
            {t("add")}
          </Button>
        )}
      </header>
      <AnimatePresence initial={false}>
        {adding && <RuleCard key="new" service={service} countryId={countryId} nationalities={nationalities} onDone={() => setAdding(false)} />}
        {service.priceRules.map((rule) => (
          <RuleCard key={rule.id} rule={rule} service={service} countryId={countryId} nationalities={nationalities} />
        ))}
      </AnimatePresence>
      {service.priceRules.length === 0 && !adding && <p className="rounded-2xl border border-dashed border-warning/40 bg-warning-soft px-4 py-3 text-body-sm text-warning">{t("empty")}</p>}
    </section>
  );
}

function RuleCard({ rule, service, countryId, nationalities, onDone }: { rule?: PriceRuleRecord; service: ServiceRecord; countryId: string; nationalities: CountryListItem[]; onDone?: () => void }) {
  const t = useTranslations("admin.rules");
  const te = useTranslations("admin.enums");
  const tc = useTranslations("admin.common");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const toasts = useMutationToasts();
  const can = useCan();
  const readOnly = !can("pricing:write");
  const visaFree = service.visaKind === "VISA_FREE";

  const form = useForm<PriceRuleInput, unknown, PriceRuleData>({ resolver: zodResolver(priceRuleInputSchema), defaultValues: rule ? toValues(rule) : EMPTY });
  const refresh = () => queryClient.invalidateQueries({ queryKey: adminKeys.country(countryId) });

  const save = useMutation({
    mutationFn: (data: PriceRuleData) => (rule ? api<PriceRuleRecord>(`/admin/price-rules/${rule.id}`, { method: "PUT", body: data }) : api<PriceRuleRecord>(`/admin/services/${service.id}/price-rules`, { method: "POST", body: data })),
    onSuccess: async (_, data) => {
      form.reset(data as PriceRuleInput);
      await refresh();
      toasts.success(rule ? t("saved") : t("created"));
      onDone?.();
    },
    onError: (e) => {
      applyServerErrors(e, form.setError);
      toasts.error(e);
    },
  });
  const remove = useMutation({
    mutationFn: () => api(`/admin/price-rules/${rule!.id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await refresh();
      toasts.success(t("deleted"));
    },
    onError: toasts.error,
  });

  const eligible = form.watch("isEligible") ?? true;
  const government = Number(form.watch("governmentFeeHalalas") ?? 0);
  const ours = Number(form.watch("serviceFeeHalalas") ?? 0);

  // Visa-free: the API refuses any service fee, so keep the form honest too.
  useEffect(() => {
    if (visaFree && ours !== 0) form.setValue("serviceFeeHalalas", 0, { shouldDirty: true });
  }, [visaFree, ours, form]);
  useEffect(() => {
    if (!eligible && (government !== 0 || ours !== 0)) {
      form.setValue("governmentFeeHalalas", 0, { shouldDirty: true });
      form.setValue("serviceFeeHalalas", 0, { shouldDirty: true });
    }
  }, [eligible, government, ours, form]);

  const nationalityOptions = nationalities.map((n) => ({ value: n.id, label: `${locale === "ar" ? n.nameAr : n.nameEn} · ${n.iso2}` }));
  const nationalityName = rule?.nationality ? (locale === "ar" ? rule.nationality.nameAr : rule.nationality.nameEn) : t("anyNationality");

  return (
    <motion.form
      layout
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onSubmit={form.handleSubmit((d) => save.mutate(d))}
      noValidate
      className={cn("grid gap-6 rounded-[1.75rem] border bg-surface p-4 shadow-xs sm:p-6 xl:grid-cols-12", eligible ? "border-border" : "border-danger/25 bg-danger-soft/40", !rule && "border-gold-400/60 ring-4 ring-gold-400/10")}
    >
      <fieldset disabled={readOnly} className="flex min-w-0 flex-col gap-5 xl:col-span-7">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={form.watch("applicantType") === "RESIDENT" ? "teal" : "gold"}>{te(`applicants.${form.watch("applicantType") ?? "SAUDI_CITIZEN"}`)}</Badge>
          <Badge tone="outline">{nationalityName}</Badge>
          {eligible ? (
            <Badge tone="success">
              <BadgeCheck aria-hidden />
              {t("offered")}
            </Badge>
          ) : (
            <Badge tone="danger">
              <Ban aria-hidden />
              {t("notOffered")}
            </Badge>
          )}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField form={form} name="applicantType" label={t("applicant")} options={APPLICANT_TYPES.map((a) => ({ value: a, label: te(`applicants.${a}`) }))} />
          <SelectField form={form} name="nationalityId" label={t("nationality")} options={nationalityOptions} nullable noneLabel={t("anyNationality")} />
        </div>
        <SwitchField form={form} name="isEligible" label={t("offered")} />
        <AnimatePresence initial={false} mode="popLayout">
          {eligible ? (
            <motion.div key="fees" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <MoneyField form={form} name="governmentFeeHalalas" label={t("government")} />
                <MoneyField form={form} name="serviceFeeHalalas" label={t("service")} disabled={visaFree} hint={visaFree ? t("visaFree") : undefined} />
              </div>
              <Bilingual>
                <TextField form={form} name="governmentFeeNoteAr" label={t("noteAr")} multiline rows={2} />
                <TextField form={form} name="governmentFeeNoteEn" label={t("noteEn")} lang="en" multiline rows={2} />
              </Bilingual>
            </motion.div>
          ) : (
            <motion.div key="reason" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <Bilingual>
                <TextField form={form} name="ineligibleReasonAr" label={t("reasonAr")} multiline rows={2} />
                <TextField form={form} name="ineligibleReasonEn" label={t("reasonEn")} lang="en" multiline rows={2} />
              </Bilingual>
            </motion.div>
          )}
        </AnimatePresence>
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" size="sm" loading={save.isPending} disabled={rule ? !form.formState.isDirty : false}>
              {rule ? tc("save") : tc("create")}
            </Button>
            {rule ? form.formState.isDirty && (
              <Button type="button" size="sm" variant="ghost" onClick={() => form.reset()}>
                {tc("discard")}
              </Button>
            ) : (
              <Button type="button" size="sm" variant="ghost" onClick={onDone}>
                {tc("cancel")}
              </Button>
            )}
            {rule && <span className="ms-auto"><ConfirmDelete label={tc("delete")} busy={remove.isPending} onConfirm={() => remove.mutateAsync()} /></span>}
          </div>
        )}
      </fieldset>

      <div className="min-w-0 xl:col-span-5">
        <div className="sticky top-24 flex flex-col gap-2">
          <p className="eyebrow flex items-center gap-2 text-accent-text">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-success/60" />
              <span className="relative size-2 rounded-full bg-success" />
            </span>
            {t("preview")}
          </p>
          {eligible ? <PriceBreakdown lines={[{ governmentFee: government, serviceFee: ours }]} className="shadow-none" /> : <p className="rounded-3xl border border-dashed border-danger/30 p-6 text-body-sm text-danger">{form.watch("ineligibleReasonAr") || t("notOffered")}</p>}
          <p className="text-caption text-muted-foreground">{t("previewHint")}</p>
        </div>
      </div>
    </motion.form>
  );
}
