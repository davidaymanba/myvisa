"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PUBLISH_STATUSES, faqInputSchema, type CountryDetail, type FaqData, type FaqInput, type FaqRecord } from "@myvisa/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircleQuestion, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { api } from "@/lib/api/client";
import { SelectField, TextField } from "../fields";
import { Bilingual, ConfirmDelete } from "../form-bits";
import { adminKeys, applyServerErrors, useCan, useMutationToasts } from "../use-admin";

export function FaqPanel({ country }: { country: CountryDetail }) {
  const t = useTranslations("admin.faqs");
  const te = useTranslations("admin.enums");
  const locale = useLocale();
  const can = useCan();
  const [editing, setEditing] = useState<string | "new" | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {can("content:write") && editing !== "new" && (
        <Button variant="outline" className="w-fit" onClick={() => setEditing("new")}>
          <Plus aria-hidden />
          {t("add")}
        </Button>
      )}
      <AnimatePresence initial={false}>{editing === "new" && <FaqForm key="new" country={country} onDone={() => setEditing(null)} />}</AnimatePresence>
      {country.faqs.length === 0 && editing !== "new" && <EmptyState icon={<MessageCircleQuestion />} title={t("empty")} />}
      {country.faqs.map((f, i) =>
        editing === f.id ? (
          <FaqForm key={f.id} faq={f} country={country} onDone={() => setEditing(null)} />
        ) : (
          <motion.button
            key={f.id}
            type="button"
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            disabled={!can("content:write")}
            onClick={() => setEditing(f.id)}
            className="group flex w-full items-start gap-4 rounded-[1.5rem] border border-border bg-surface p-5 text-start shadow-xs transition hover:-translate-y-0.5 hover:shadow-md disabled:pointer-events-none"
          >
            <span lang="en" className="font-display text-title text-accent-text/60 tabular">
              Q{i + 1}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="font-medium">{locale === "ar" ? f.questionAr : f.questionEn}</span>
              <span className="line-clamp-2 text-body-sm text-muted-foreground">{locale === "ar" ? f.answerAr : f.answerEn}</span>
            </span>
            {f.status !== "PUBLISHED" && <Badge tone="warning">{te(`status.${f.status}`)}</Badge>}
          </motion.button>
        ),
      )}
    </div>
  );
}

function FaqForm({ faq, country, onDone }: { faq?: FaqRecord; country: CountryDetail; onDone: () => void }) {
  const t = useTranslations("admin.faqs");
  const te = useTranslations("admin.enums");
  const tc = useTranslations("admin.common");
  const queryClient = useQueryClient();
  const toasts = useMutationToasts();
  const form = useForm<FaqInput, unknown, FaqData>({
    resolver: zodResolver(faqInputSchema),
    defaultValues: faq
      ? { scope: "COUNTRY", countryId: country.id, serviceId: null, questionAr: faq.questionAr, questionEn: faq.questionEn, answerAr: faq.answerAr, answerEn: faq.answerEn, sortOrder: faq.sortOrder, status: faq.status }
      : { scope: "COUNTRY", countryId: country.id, serviceId: null, questionAr: "", questionEn: "", answerAr: "", answerEn: "", sortOrder: country.faqs.length, status: "PUBLISHED" },
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: adminKeys.country(country.id) });
  const save = useMutation({
    mutationFn: (data: FaqData) => (faq ? api(`/admin/faqs/${faq.id}`, { method: "PUT", body: data }) : api("/admin/faqs", { method: "POST", body: data })),
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
    mutationFn: () => api(`/admin/faqs/${faq!.id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await refresh();
      toasts.success(t("deleted"));
      onDone();
    },
    onError: toasts.error,
  });

  return (
    <motion.form layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} onSubmit={form.handleSubmit((d) => save.mutate(d))} noValidate className="flex flex-col gap-5 rounded-[1.75rem] border border-gold-400/50 bg-surface p-6 shadow-sm ring-4 ring-gold-400/10">
      <Bilingual>
        <TextField form={form} name="questionAr" label={t("questionAr")} />
        <TextField form={form} name="questionEn" label={t("questionEn")} lang="en" />
        <TextField form={form} name="answerAr" label={t("answerAr")} multiline rows={4} />
        <TextField form={form} name="answerEn" label={t("answerEn")} lang="en" multiline rows={4} />
      </Bilingual>
      <SelectField form={form} name="status" label={t("status")} options={PUBLISH_STATUSES.map((s) => ({ value: s, label: te(`status.${s}`) }))} className="sm:max-w-xs" />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" loading={save.isPending}>
          {faq ? tc("save") : tc("create")}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          {tc("cancel")}
        </Button>
        {faq && (
          <span className="ms-auto">
            <ConfirmDelete label={tc("delete")} busy={remove.isPending} onConfirm={() => remove.mutateAsync()} />
          </span>
        )}
      </div>
    </motion.form>
  );
}
