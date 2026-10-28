"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { APPLICANT_TYPES, GENDERS, RELATIONSHIPS, travelerInputSchema, type AppLocale, type Nationality, type SavedTravelerView, type TravelerData, type TravelerInput } from "@myvisa/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookUser, Plus } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Controller, useForm, type Path, type UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { ApiError, api } from "@/lib/api/client";
import { AccountHeader, LoadError } from "./page-header";
import { PassportCard } from "./passport-card";
import { accountKeys, useAccountError, useErrorToast, useFieldError, useRefreshAccount, useTravelers } from "./use-account";

type Editing = { mode: "new" } | { mode: "edit"; traveler: SavedTravelerView } | null;

export function TravelersPage({ nationalities }: { nationalities: Nationality[] }) {
  const t = useTranslations("account.travelers");
  const travelers = useTravelers();
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<SavedTravelerView | null>(null);

  return (
    <>
      <AccountHeader
        page={3}
        eyebrow={t("eyebrow")}
        title={t("title")}
        lead={t("lead")}
        actions={
          <Button size="lg" onClick={() => setEditing({ mode: "new" })}>
            <Plus aria-hidden />
            {t("add")}
          </Button>
        }
      />
      {travelers.isError ? (
        <LoadError onRetry={() => travelers.refetch()} />
      ) : travelers.isLoading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72 rounded-[1.5rem]" />
          ))}
        </div>
      ) : travelers.data?.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {travelers.data.map((tr, i) => (
              <PassportCard key={tr.id} traveler={tr} nationalities={nationalities} index={i} onEdit={() => setEditing({ mode: "edit", traveler: tr })} onDelete={() => setDeleting(tr)} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <EmptyState
          icon={<BookUser />}
          title={t("empty")}
          description={t("emptyLead")}
          action={
            <Button onClick={() => setEditing({ mode: "new" })}>
              <Plus aria-hidden />
              {t("add")}
            </Button>
          }
        />
      )}

      <TravelerDialog editing={editing} onClose={() => setEditing(null)} nationalities={nationalities} />
      <DeleteTravelerDialog traveler={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}

const EMPTY: TravelerInput = { relationship: "SELF", givenNameEn: "", surnameEn: "", fullNameAr: "", gender: "MALE", dateOfBirth: "", nationalityIso2: "SA", applicantType: "SAUDI_CITIZEN", passportNumber: "", passportExpiry: "" };

function TravelerDialog({ editing, onClose, nationalities }: { editing: Editing; onClose: () => void; nationalities: Nationality[] }) {
  const t = useTranslations("account.travelers");
  const ta = useTranslations("apply.travelers");
  const tc = useTranslations("account.common");
  const locale = useLocale() as AppLocale;
  const fieldError = useFieldError();
  const problem = useAccountError();
  const queryClient = useQueryClient();
  const refresh = useRefreshAccount();
  const form = useForm<TravelerInput, unknown, TravelerData>({ resolver: zodResolver(travelerInputSchema), defaultValues: EMPTY, mode: "onTouched" });
  const editId = editing?.mode === "edit" ? editing.traveler.id : null;
  const [loading, setLoading] = useState(false);

  // Editing loads the full record (the list only carries the masked passport number).
  useEffect(() => {
    if (!editing) return;
    if (editing.mode === "new") return form.reset(EMPTY);
    setLoading(true);
    api<TravelerInput>(`/me/travelers/${editing.traveler.id}`)
      .then((full) => form.reset({ ...full, fullNameAr: full.fullNameAr ?? "" }))
      .catch(() => onClose())
      .finally(() => setLoading(false));
  }, [editing, form, onClose]);

  const applicant = form.watch("applicantType");
  useEffect(() => {
    const current = form.getValues("nationalityIso2");
    if (applicant === "SAUDI_CITIZEN" && current !== "SA") form.setValue("nationalityIso2", "SA");
    if (applicant === "RESIDENT" && current === "SA") form.setValue("nationalityIso2", "");
  }, [applicant, form]);

  const save = useMutation({
    mutationFn: (data: TravelerData) => (editId ? api<SavedTravelerView>(`/me/travelers/${editId}`, { method: "PUT", body: data }) : api<SavedTravelerView>("/me/travelers", { method: "POST", body: data })),
    onSuccess: (saved) => {
      queryClient.setQueryData<SavedTravelerView[]>(accountKeys.travelers, (list) => (list ? (editId ? list.map((x) => (x.id === saved.id ? saved : x)) : [...list, saved]) : list));
      void refresh();
      toast.success(t("saved"));
      onClose();
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === "traveler_exists") form.setError("passportNumber", { message: "traveler_exists" });
      else toast.error(problem(e));
    },
  });

  const err = (k: keyof TravelerInput) => {
    const e = form.formState.errors[k];
    return e?.message === "traveler_exists" ? t("traveler_exists") : fieldError(e);
  };

  return (
    <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={tc("close")} className="sm:w-[min(44rem,calc(100vw-2rem))]" data-lenis-prevent>
        <DialogTitle className="pe-10">{editing?.mode === "edit" ? t("editTitle", { name: editing.traveler.givenNameEn }) : t("addTitle")}</DialogTitle>
        <DialogDescription>{t("formLead")}</DialogDescription>
        {loading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
        ) : (
          <form noValidate onSubmit={form.handleSubmit((d) => save.mutate(d))} className="mt-6 grid gap-4 sm:grid-cols-2">
            <SelectField form={form} name="applicantType" label={ta("applicantType")} options={APPLICANT_TYPES.map((a) => ({ value: a, label: ta(`applicants.${a}`) }))} error={err("applicantType")} />
            <SelectField form={form} name="relationship" label={ta("relationship")} options={RELATIONSHIPS.map((r) => ({ value: r, label: ta(`relationships.${r}`) }))} error={err("relationship")} />
            <Field label={ta("givenName")} hint={ta("nameHint")} error={err("givenNameEn")}>
              <Input dir="ltr" lang="en" className="uppercase" {...form.register("givenNameEn")} />
            </Field>
            <Field label={ta("surname")} error={err("surnameEn")}>
              <Input dir="ltr" lang="en" className="uppercase" {...form.register("surnameEn")} />
            </Field>
            <Field label={ta("fullNameAr")} error={err("fullNameAr")} className="sm:col-span-2">
              <Input dir="rtl" lang="ar" {...form.register("fullNameAr")} />
            </Field>
            <SelectField form={form} name="gender" label={ta("gender")} options={GENDERS.map((g) => ({ value: g, label: ta(`genders.${g}`) }))} error={err("gender")} />
            <Field label={ta("dateOfBirth")} error={err("dateOfBirth")}>
              <Input type="date" dir="ltr" {...form.register("dateOfBirth")} />
            </Field>
            <SelectField
              form={form}
              name="nationalityIso2"
              label={ta("nationality")}
              disabled={applicant === "SAUDI_CITIZEN"}
              options={applicant === "SAUDI_CITIZEN" ? [{ value: "SA", label: locale === "ar" ? "سعودي" : "Saudi" }] : nationalities.map((n) => ({ value: n.iso2, label: n.name[locale] }))}
              error={err("nationalityIso2")}
            />
            <Field label={ta("passportNumber")} error={err("passportNumber")}>
              <Input dir="ltr" lang="en" autoComplete="off" spellCheck={false} className="tabular uppercase tracking-wider" {...form.register("passportNumber")} />
            </Field>
            <Field label={ta("passportExpiry")} error={err("passportExpiry")}>
              <Input type="date" dir="ltr" {...form.register("passportExpiry")} />
            </Field>
            <div className="mt-2 flex justify-end gap-3 sm:col-span-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                {tc("cancel")}
              </Button>
              <Button type="submit" loading={save.isPending}>
                {tc("save")}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SelectField({ form, name, label, options, error, disabled }: { form: UseFormReturn<TravelerInput, unknown, TravelerData>; name: Path<TravelerInput>; label: string; options: { value: string; label: string }[]; error?: string; disabled?: boolean }) {
  return (
    <Field label={label} error={error}>
      <Controller
        control={form.control}
        name={name}
        render={({ field }) => (
          <Select value={(field.value as string) || undefined} onValueChange={field.onChange} disabled={disabled}>
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

function DeleteTravelerDialog({ traveler, onClose }: { traveler: SavedTravelerView | null; onClose: () => void }) {
  const t = useTranslations("account.travelers");
  const tc = useTranslations("account.common");
  const queryClient = useQueryClient();
  const refresh = useRefreshAccount();
  const onError = useErrorToast();
  const remove = useMutation({
    mutationFn: (id: string) => api(`/me/travelers/${id}`, { method: "DELETE" }),
    onSuccess: (_, id) => {
      queryClient.setQueryData<SavedTravelerView[]>(accountKeys.travelers, (list) => list?.filter((x) => x.id !== id));
      void refresh();
      toast.success(t("removed"));
      onClose();
    },
    onError,
  });
  return (
    <Dialog open={Boolean(traveler)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={tc("close")}>
        <DialogTitle className="pe-10">{traveler ? t("deleteTitle", { name: traveler.givenNameEn }) : ""}</DialogTitle>
        <DialogDescription>{t("deleteLead")}</DialogDescription>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            {tc("cancel")}
          </Button>
          <Button variant="danger" loading={remove.isPending} onClick={() => traveler && remove.mutate(traveler.id)}>
            {tc("delete")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
