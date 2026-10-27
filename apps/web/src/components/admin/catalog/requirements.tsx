"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { APPLICANT_TYPES, DOCUMENT_TYPES, requirementInputSchema, type RequirementData, type RequirementInput, type RequirementRecord, type ServiceRecord } from "@myvisa/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Pencil, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { SelectField, SwitchField, TextField } from "../fields";
import { Bilingual, ConfirmDelete, ReorderButtons } from "../form-bits";
import { adminKeys, applyServerErrors, useCan, useMutationToasts } from "../use-admin";

const EMPTY: RequirementInput = { applicantType: null, documentType: "PASSPORT", titleAr: "", titleEn: "", detailsAr: null, detailsEn: null, isRequired: true, perTraveler: true, sortOrder: 0 };

function toValues(r: RequirementRecord): RequirementInput {
  return Object.fromEntries(Object.keys(EMPTY).map((k) => [k, r[k as keyof RequirementRecord] ?? EMPTY[k as keyof RequirementInput]])) as RequirementInput;
}

export function Requirements({ service, countryId }: { service: ServiceRecord; countryId: string }) {
  const t = useTranslations("admin.requirements");
  const te = useTranslations("admin.enums");
  const locale = useLocale();
  const can = useCan();
  const queryClient = useQueryClient();
  const toasts = useMutationToasts();
  const [order, setOrder] = useState(service.requirements);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  useEffect(() => setOrder(service.requirements), [service.requirements]);

  const reorder = useMutation({
    mutationFn: (ids: string[]) => api(`/admin/services/${service.id}/requirements-order`, { method: "PUT", body: { ids } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.country(countryId) });
      toasts.success(t("saved"));
    },
    onError: (e) => {
      setOrder(service.requirements);
      toasts.error(e);
    },
  });

  const move = (index: number, delta: -1 | 1) => {
    const next = [...order];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item!);
    setOrder(next);
    reorder.mutate(next.map((r) => r.id));
  };

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-heading">{t("title")}</h3>
          <p className="text-body-sm text-muted-foreground">{t("hint")}</p>
        </div>
        {can("catalog:write") && editing !== "new" && (
          <Button variant="outline" size="sm" onClick={() => setEditing("new")}>
            <Plus aria-hidden />
            {t("add")}
          </Button>
        )}
      </header>

      <AnimatePresence initial={false}>{editing === "new" && <RequirementForm key="new" service={service} countryId={countryId} onDone={() => setEditing(null)} />}</AnimatePresence>

      <motion.ol layout className="flex flex-col gap-2">
        {order.map((r, i) =>
          editing === r.id ? (
            <RequirementForm key={r.id} requirement={r} service={service} countryId={countryId} onDone={() => setEditing(null)} />
          ) : (
            <motion.li layout key={r.id} transition={{ type: "spring", stiffness: 500, damping: 40 }} className="group flex items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-3 shadow-xs">
              {can("catalog:write") && <ReorderButtons first={i === 0} last={i === order.length - 1} onUp={() => move(i, -1)} onDown={() => move(i, 1)} disabled={reorder.isPending} />}
              <span lang="en" className="w-6 text-center font-display text-caption text-muted-foreground tabular">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-secondary-text">
                <FileText className="size-4" aria-hidden />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate font-medium">{locale === "ar" ? r.titleAr : r.titleEn}</span>
                <span className="flex flex-wrap gap-1.5">
                  <Badge tone="neutral">{te(`docs.${r.documentType}`)}</Badge>
                  {!r.isRequired && <Badge tone="outline">{t("optional")}</Badge>}
                  {r.applicantType && <Badge tone={r.applicantType === "RESIDENT" ? "teal" : "gold"}>{te(`applicants.${r.applicantType}`)}</Badge>}
                  <Badge tone="outline">{r.perTraveler ? t("perTraveler") : t("perOrder")}</Badge>
                </span>
              </div>
              {can("catalog:write") && (
                <Button variant="ghost" size="icon-sm" onClick={() => setEditing(r.id)} aria-label={t("title")}>
                  <Pencil aria-hidden />
                </Button>
              )}
            </motion.li>
          ),
        )}
      </motion.ol>
      {order.length === 0 && editing !== "new" && <p className="text-body-sm text-muted-foreground">{t("empty")}</p>}
    </section>
  );
}

function RequirementForm({ requirement, service, countryId, onDone }: { requirement?: RequirementRecord; service: ServiceRecord; countryId: string; onDone: () => void }) {
  const t = useTranslations("admin.requirements");
  const te = useTranslations("admin.enums");
  const tc = useTranslations("admin.common");
  const queryClient = useQueryClient();
  const toasts = useMutationToasts();
  const form = useForm<RequirementInput, unknown, RequirementData>({ resolver: zodResolver(requirementInputSchema), defaultValues: requirement ? toValues(requirement) : EMPTY });
  const refresh = () => queryClient.invalidateQueries({ queryKey: adminKeys.country(countryId) });

  const save = useMutation({
    mutationFn: (data: RequirementData) => (requirement ? api(`/admin/requirements/${requirement.id}`, { method: "PUT", body: data }) : api(`/admin/services/${service.id}/requirements`, { method: "POST", body: data })),
    onSuccess: async () => {
      await refresh();
      toasts.success(t("saved"));
      onDone();
    },
    onError: (e) => {
      applyServerErrors(e, form.setError);
      toasts.error(e);
    },
  });
  const remove = useMutation({
    mutationFn: () => api(`/admin/requirements/${requirement!.id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await refresh();
      toasts.success(t("deleted"));
      onDone();
    },
    onError: toasts.error,
  });

  return (
    <motion.li layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="list-none rounded-[1.5rem] border border-gold-400/50 bg-surface p-5 shadow-sm ring-4 ring-gold-400/10">
      <form onSubmit={form.handleSubmit((d) => save.mutate(d))} noValidate className="flex flex-col gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField form={form} name="documentType" label={t("doc")} options={DOCUMENT_TYPES.map((d) => ({ value: d, label: te(`docs.${d}`) }))} />
          <SelectField form={form} name="applicantType" label={t("appliesTo")} options={APPLICANT_TYPES.map((a) => ({ value: a, label: te(`applicants.${a}`) }))} nullable noneLabel={t("everyone")} />
        </div>
        <Bilingual>
          <TextField form={form} name="titleAr" label={t("titleAr")} />
          <TextField form={form} name="titleEn" label={t("titleEn")} lang="en" />
          <TextField form={form} name="detailsAr" label={t("detailsAr")} multiline rows={3} />
          <TextField form={form} name="detailsEn" label={t("detailsEn")} lang="en" multiline rows={3} />
        </Bilingual>
        <div className="grid gap-3 sm:grid-cols-2">
          <SwitchField form={form} name="isRequired" label={t("isRequired")} />
          <SwitchField form={form} name="perTraveler" label={t("perTraveler")} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" size="sm" loading={save.isPending}>
            {requirement ? tc("save") : tc("create")}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            {tc("cancel")}
          </Button>
          {requirement && (
            <span className="ms-auto">
              <ConfirmDelete label={tc("delete")} busy={remove.isPending} onConfirm={() => remove.mutateAsync()} />
            </span>
          )}
        </div>
      </form>
    </motion.li>
  );
}
