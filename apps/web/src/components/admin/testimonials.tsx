"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PUBLISH_STATUSES, testimonialInputSchema, type TestimonialInput, type TestimonialRecord } from "@myvisa/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CloudOff, MessageSquareQuote, Plus, Quote, Star, TriangleAlert } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { SelectField, TextField } from "./fields";
import { Bilingual, ConfirmDelete } from "./form-bits";
import { AdminPageHeader } from "./page-header";
import { useCan, useFieldError, useMutationToasts, applyServerErrors } from "./use-admin";

const KEY = ["admin", "testimonials"] as const;
const EMPTY: TestimonialInput = { authorNameAr: "", authorNameEn: null, cityAr: null, cityEn: null, serviceLabelAr: null, serviceLabelEn: null, rating: 5, quoteAr: "", quoteEn: null, serviceId: null, consentedAt: null, status: "DRAFT", sortOrder: 0 };

function toValues(r: TestimonialRecord): TestimonialInput {
  return Object.fromEntries(Object.keys(EMPTY).map((k) => [k, r[k as keyof TestimonialRecord] ?? EMPTY[k as keyof TestimonialInput]])) as TestimonialInput;
}

export function TestimonialsView() {
  const t = useTranslations("admin.testimonials");
  const tc = useTranslations("admin.common");
  const can = useCan();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: KEY, queryFn: () => api<TestimonialRecord[]>("/admin/testimonials") });

  return (
    <>
      <AdminPageHeader
        index="04"
        eyebrow={t("eyebrow")}
        title={t("title")}
        lead={t("lead")}
        actions={
          can("content:write") && (
            <Button size="lg" onClick={() => setEditing("new")} disabled={editing === "new"}>
              <Plus aria-hidden />
              {t("add")}
            </Button>
          )
        }
      />
      <AnimatePresence initial={false}>
        {editing === "new" && (
          <div className="mb-6">
            <TestimonialForm key="new" onDone={() => setEditing(null)} />
          </div>
        )}
      </AnimatePresence>
      {isError ? (
        <ErrorState icon={<CloudOff />} title={tc("loadError")} retryLabel={tc("retry")} onRetry={() => void refetch()} />
      ) : isLoading || !data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-64 rounded-[1.75rem]" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState icon={<MessageSquareQuote />} title={t("empty")} />
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((item, i) => (editing === item.id ? <TestimonialForm key={item.id} item={item} onDone={() => setEditing(null)} className="md:col-span-2 xl:col-span-3" /> : <Card key={item.id} item={item} index={i} onEdit={can("content:write") ? () => setEditing(item.id) : undefined} />))}
        </div>
      )}
    </>
  );
}

function Card({ item, index, onEdit }: { item: TestimonialRecord; index: number; onEdit?: () => void }) {
  const t = useTranslations("admin.testimonials");
  const te = useTranslations("admin.enums");
  const locale = useLocale();
  const name = (locale === "en" && item.authorNameEn) || item.authorNameAr;
  const quote = (locale === "en" && item.quoteEn) || item.quoteAr;
  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 20, rotate: index % 2 ? 1 : -1 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ delay: Math.min(index, 9) * 0.05, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      disabled={!onEdit}
      onClick={onEdit}
      className="group relative flex flex-col gap-5 overflow-hidden rounded-[1.75rem] border border-border bg-surface p-6 text-start shadow-sm transition hover:-translate-y-1 hover:shadow-lg disabled:pointer-events-none"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex text-gold-400" aria-label={t("star", { count: item.rating })}>
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className={cn("size-4", i < item.rating ? "fill-current" : "opacity-25")} aria-hidden />
          ))}
        </span>
        <div className="flex flex-wrap justify-end gap-1.5">
          {item.isPlaceholder && (
            <Badge tone="warning">
              <TriangleAlert aria-hidden />
              {t("placeholder")}
            </Badge>
          )}
          <Badge tone={item.status === "PUBLISHED" ? "success" : "neutral"}>{te(`status.${item.status}`)}</Badge>
        </div>
      </div>
      <Quote className="absolute -bottom-4 -end-2 size-28 text-gold-200/40 transition-transform duration-700 group-hover:rotate-6 flip-rtl dark:text-gold-400/10" aria-hidden />
      <blockquote className="relative font-display text-title leading-relaxed">{quote}</blockquote>
      <p className="relative mt-auto flex items-center gap-3 border-t border-border pt-4">
        <span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-teal-400 to-teal-700 font-semibold text-white">{name.charAt(0)}</span>
        <span className="flex flex-col">
          <span className="font-medium">{name}</span>
          <span className="text-caption text-muted-foreground">{[(locale === "en" && item.cityEn) || item.cityAr, (locale === "en" && item.serviceLabelEn) || item.serviceLabelAr].filter(Boolean).join(" · ")}</span>
        </span>
      </p>
    </motion.button>
  );
}

function TestimonialForm({ item, onDone, className }: { item?: TestimonialRecord; onDone: () => void; className?: string }) {
  const t = useTranslations("admin.testimonials");
  const te = useTranslations("admin.enums");
  const tc = useTranslations("admin.common");
  const fieldError = useFieldError();
  const queryClient = useQueryClient();
  const toasts = useMutationToasts();
  const form = useForm<TestimonialInput>({ resolver: zodResolver(testimonialInputSchema), defaultValues: item ? toValues(item) : EMPTY });
  const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });
  const save = useMutation({
    mutationFn: (data: TestimonialInput) => (item ? api(`/admin/testimonials/${item.id}`, { method: "PUT", body: data }) : api("/admin/testimonials", { method: "POST", body: data })),
    onSuccess: async () => {
      await refresh();
      toasts.success(item ? t("saved") : t("created"));
      onDone();
    },
    onError: (e) => {
      applyServerErrors(e, form.setError);
      toasts.error(e);
    },
  });
  const remove = useMutation({
    mutationFn: () => api(`/admin/testimonials/${item!.id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await refresh();
      toasts.success(t("deleted"));
      onDone();
    },
    onError: toasts.error,
  });

  return (
    <motion.form layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} onSubmit={form.handleSubmit((d) => save.mutate(d))} noValidate className={cn("flex flex-col gap-5 rounded-[1.75rem] border border-gold-400/50 bg-surface p-6 shadow-md ring-4 ring-gold-400/10 sm:p-8", className)}>
      {item?.isPlaceholder && (
        <p className="flex items-start gap-2 rounded-2xl bg-warning-soft px-4 py-3 text-body-sm text-warning">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("placeholderBody")}
        </p>
      )}
      <Bilingual>
        <TextField form={form} name="authorNameAr" label={t("authorNameAr")} />
        <TextField form={form} name="authorNameEn" label={t("authorNameEn")} lang="en" />
        <TextField form={form} name="cityAr" label={t("cityAr")} />
        <TextField form={form} name="cityEn" label={t("cityEn")} lang="en" />
        <TextField form={form} name="serviceLabelAr" label={t("serviceLabelAr")} />
        <TextField form={form} name="serviceLabelEn" label={t("serviceLabelEn")} lang="en" />
        <TextField form={form} name="quoteAr" label={t("quoteAr")} multiline rows={4} />
        <TextField form={form} name="quoteEn" label={t("quoteEn")} lang="en" multiline rows={4} />
      </Bilingual>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label={t("rating")}>
          <Controller
            control={form.control}
            name="rating"
            render={({ field }) => (
              <div role="radiogroup" aria-label={t("rating")} className="flex h-12 items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={field.value === n} aria-label={t("star", { count: n })} onClick={() => field.onChange(n)} className="grid size-10 place-items-center rounded-full transition hover:scale-110 hover:bg-gold-100 dark:hover:bg-gold-400/10">
                    <Star className={cn("size-6 text-gold-400 transition", n <= field.value ? "fill-current" : "opacity-30")} aria-hidden />
                  </button>
                ))}
              </div>
            )}
          />
        </Field>
        <Field label={t("consentedAt")} hint={t("consentHint")} error={fieldError(form.formState.errors.consentedAt)}>
          <Controller control={form.control} name="consentedAt" render={({ field }) => <Input type="date" dir="ltr" value={field.value ? field.value.slice(0, 10) : ""} onChange={(e) => field.onChange(e.target.value ? `${e.target.value}T00:00:00.000Z` : null)} />} />
        </Field>
        <SelectField form={form} name="status" label={t("status")} options={PUBLISH_STATUSES.map((s) => ({ value: s, label: te(`status.${s}`) }))} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" loading={save.isPending}>
          {item ? tc("save") : tc("create")}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
        {item && (
          <span className="ms-auto">
            <ConfirmDelete label={tc("delete")} busy={remove.isPending} onConfirm={() => remove.mutateAsync()} />
          </span>
        )}
      </div>
    </motion.form>
  );
}
