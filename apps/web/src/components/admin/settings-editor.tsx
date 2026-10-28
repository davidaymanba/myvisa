"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { SETTING_SCHEMAS, type PublicSettings, type SettingKey, type Settings } from "@myvisa/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CloudOff, Building2, FileCheck2, Lock, MessageCircle } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useForm, type FieldValues, type UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import { NumberField, TextField } from "./fields";
import { Bilingual } from "./form-bits";
import { AdminPageHeader } from "./page-header";
import { adminKeys, applyServerErrors, useCan, useMutationToasts } from "./use-admin";

export function SettingsEditor() {
  const t = useTranslations("admin.settings");
  const tc = useTranslations("admin.common");
  const can = useCan();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: adminKeys.settings, queryFn: () => api<PublicSettings>("/settings") });
  const readOnly = !can("settings:write");

  return (
    <>
      <AdminPageHeader index="05" eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      {readOnly && (
        <p className="mb-6 flex items-center gap-2 rounded-2xl border border-border bg-muted px-4 py-3 text-body-sm">
          <Lock className="size-4" aria-hidden />
          {t("readOnly")}
        </p>
      )}
      {isError ? (
        <ErrorState title={tc("loadError")} icon={<CloudOff />} retryLabel={tc("retry")} onRetry={() => void refetch()} />
      ) : isLoading || !data ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Skeleton className="h-[36rem] rounded-[2rem]" />
          <Skeleton className="h-72 rounded-[2rem]" />
        </div>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <SettingCard settingKey="company" value={data.company} readOnly={readOnly} icon={<Building2 />} index="01">
              {(form) => (
                <>
                  <Bilingual>
                    <TextField form={form} name="legalName.ar" label={t("company.legalNameAr")} />
                    <TextField form={form} name="legalName.en" label={t("company.legalNameEn")} lang="en" />
                  </Bilingual>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <TextField form={form} name="crNumber" label={t("company.crNumber")} lang="code" />
                    <TextField form={form} name="vatNumber" label={t("company.vatNumber")} lang="code" />
                    <TextField form={form} name="phone" label={t("company.phone")} lang="code" />
                    <TextField form={form} name="phoneDisplay" label={t("company.phoneDisplay")} lang="code" />
                    <TextField form={form} name="email" label={t("company.email")} lang="code" className="sm:col-span-2 [&_input]:normal-case" />
                  </div>
                  <Bilingual>
                    <TextField form={form} name="address.ar" label={t("company.addressAr")} />
                    <TextField form={form} name="address.en" label={t("company.addressEn")} lang="en" />
                    <TextField form={form} name="hours.ar" label={t("company.hoursAr")} />
                    <TextField form={form} name="hours.en" label={t("company.hoursEn")} lang="en" />
                    <NumberField form={form} name="geo.lat" label={t("company.lat")} />
                    <NumberField form={form} name="geo.lon" label={t("company.lon")} />
                  </Bilingual>
                </>
              )}
            </SettingCard>
          </div>
          <div className="flex flex-col gap-6 xl:col-span-5">
            <SettingCard settingKey="support" value={data.support} readOnly={readOnly} icon={<MessageCircle />} index="02" dark>
              {(form) => (
                <>
                  <TextField form={form} name="whatsapp" label={t("support.whatsapp")} lang="code" />
                  <TextField form={form} name="whatsappDisplay" label={t("support.whatsappDisplay")} lang="code" />
                  <NumberField form={form} name="whatsappEtaMinutes" label={t("support.eta")} step="1" />
                  <EtaPreview minutes={Number(form.watch("whatsappEtaMinutes") ?? 0)} />
                </>
              )}
            </SettingCard>
            <SettingCard settingKey="legal" value={data.legal} readOnly={readOnly} icon={<FileCheck2 />} index="03">
              {(form) => (
                <div className="grid gap-5 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                  <TextField form={form} name="termsVersion" label={t("legal.termsVersion")} lang="code" />
                  <TextField form={form} name="privacyVersion" label={t("legal.privacyVersion")} lang="code" />
                  <TextField form={form} name="refundPolicyVersion" label={t("legal.refundPolicyVersion")} lang="code" />
                </div>
              )}
            </SettingCard>
          </div>
        </div>
      )}
    </>
  );
}

function SettingCard<K extends SettingKey>({ settingKey, value, readOnly, icon, index, dark, children }: { settingKey: K; value: Settings[K]; readOnly: boolean; icon: ReactNode; index: string; dark?: boolean; children: (form: UseFormReturn<FieldValues>) => ReactNode }) {
  const t = useTranslations("admin.settings");
  const tc = useTranslations("admin.common");
  const queryClient = useQueryClient();
  const toasts = useMutationToasts();
  const form = useForm<FieldValues>({ resolver: zodResolver(SETTING_SCHEMAS[settingKey] as never), defaultValues: value as FieldValues });
  const save = useMutation({
    mutationFn: (body: FieldValues) => api<{ value: Settings[K] }>(`/admin/settings/${settingKey}`, { method: "PUT", body }),
    onSuccess: async (res) => {
      form.reset(res.value as FieldValues);
      await queryClient.invalidateQueries({ queryKey: adminKeys.settings });
      toasts.success(t("saved"));
    },
    onError: (e) => {
      applyServerErrors(e, form.setError);
      toasts.error(e);
    },
  });

  return (
    <motion.form
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: Number(index) * 0.08, ease: [0.16, 1, 0.3, 1] }}
      onSubmit={form.handleSubmit((d) => save.mutate(d))}
      noValidate
      data-surface={dark ? "dark" : undefined}
      className={dark ? "dark relative isolate overflow-hidden rounded-[2rem] bg-ink-950 p-6 text-foreground shadow-lg sm:p-8" : "rounded-[2rem] border border-border bg-surface p-6 shadow-sm sm:p-8"}
    >
      {dark && <div aria-hidden className="absolute -end-20 -top-24 -z-10 size-72 animate-drift rounded-full bg-teal-500/30 blur-[90px]" />}
      <header className="mb-6 flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gold-100 text-gold-800 dark:bg-gold-400/15 dark:text-gold-300 [&_svg]:size-5">{icon}</span>
        <div className="flex flex-1 flex-col gap-1">
          <h2 className="font-display text-heading">{t(`${settingKey}.title` as "company.title")}</h2>
          <p className="text-body-sm text-muted-foreground">{t(`${settingKey}.hint` as "company.hint")}</p>
        </div>
        <span lang="en" className="font-display text-display-md leading-none text-accent-text/50 tabular">
          {index}
        </span>
      </header>
      <fieldset disabled={readOnly} className="flex min-w-0 flex-col gap-5">
        {children(form)}
      </fieldset>
      {!readOnly && (
        <div className="mt-6 flex items-center gap-2">
          <Button type="submit" loading={save.isPending} disabled={!form.formState.isDirty}>
            {save.isPending ? tc("saving") : tc("save")}
          </Button>
          {form.formState.isDirty && (
            <Button type="button" variant="ghost" onClick={() => form.reset()}>
              {tc("discard")}
            </Button>
          )}
        </div>
      )}
    </motion.form>
  );
}

function EtaPreview({ minutes }: { minutes: number }) {
  const t = useTranslations("admin.settings.support");
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
      <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-[#25D366] text-white">
        <span className="absolute inset-0 animate-ping rounded-full bg-[#25D366]/40" />
        <MessageCircle className="relative size-5" aria-hidden />
      </span>
      <span className="text-body-sm">{t("preview", { minutes: Number.isFinite(minutes) ? minutes : 0 })}</span>
    </div>
  );
}
