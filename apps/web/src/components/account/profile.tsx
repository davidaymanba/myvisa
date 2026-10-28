"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { profileUpdateSchema, type ProfileUpdateInput, type ProfileView } from "@myvisa/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut, ShieldCheck, Smartphone } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/choice";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useRouter } from "@/i18n/navigation";
import { ApiError, api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { AccountHeader, LoadError } from "./page-header";
import { accountKeys, useAccountError, useFieldError, useProfile } from "./use-account";

type ProfileForm = ProfileUpdateInput;

export function ProfilePage() {
  const t = useTranslations("account.profile");
  const profile = useProfile();
  return (
    <>
      <AccountHeader page={7} eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      {profile.isError ? <LoadError onRetry={() => profile.refetch()} /> : profile.data ? <ProfileEditor profile={profile.data} /> : <Skeleton className="h-[30rem] rounded-[1.75rem]" />}
    </>
  );
}

function ProfileEditor({ profile }: { profile: ProfileView }) {
  const t = useTranslations("account.profile");
  const fieldError = useFieldError();
  const problem = useAccountError();
  const queryClient = useQueryClient();
  const router = useRouter();
  const toValues = (p: ProfileView): ProfileForm => ({ fullNameAr: p.fullNameAr ?? "", fullNameEn: p.fullNameEn ?? "", email: p.email ?? "", locale: p.locale, marketing: p.marketing });
  const form = useForm<ProfileForm>({ resolver: zodResolver(profileUpdateSchema) as unknown as Resolver<ProfileForm>, defaultValues: toValues(profile) });
  useEffect(() => form.reset(toValues(profile)), [profile, form]);

  const save = useMutation({
    mutationFn: (data: ProfileForm) => api<ProfileView>("/me/profile", { method: "PUT", body: { ...data, email: data.email || null } }),
    onSuccess: (p) => {
      queryClient.setQueryData(accountKeys.profile, p);
      toast.success(t("saved"));
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === "email_taken") form.setError("email", { message: "email_taken" });
      else toast.error(problem(e));
    },
  });

  const signOut = async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    queryClient.clear();
    router.replace("/account/login");
  };

  const emailError = form.formState.errors.email;
  return (
    <div className="grid items-start gap-6 lg:grid-cols-12">
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        noValidate
        onSubmit={form.handleSubmit((d) => save.mutate(d))}
        className="flex flex-col gap-5 rounded-[1.75rem] border border-border bg-surface p-5 sm:p-8 lg:col-span-8"
      >
        <Field label={t("phone")} hint={t("phoneHint")}>
          <div className="flex h-12 items-center gap-3 rounded-2xl border border-border bg-surface-sunken px-4 text-muted-foreground">
            <Smartphone className="size-4" aria-hidden />
            <span dir="ltr" className="tabular font-medium text-foreground">
              {profile.phone}
            </span>
            <ShieldCheck className="ms-auto size-4 text-success" aria-hidden />
          </div>
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("fullNameAr")} error={fieldError(form.formState.errors.fullNameAr)}>
            <Input dir="rtl" lang="ar" autoComplete="name" {...form.register("fullNameAr")} />
          </Field>
          <Field label={t("fullNameEn")} error={fieldError(form.formState.errors.fullNameEn)}>
            <Input dir="ltr" lang="en" {...form.register("fullNameEn")} />
          </Field>
        </div>
        <Field label={t("email")} hint={t("emailHint")} error={emailError?.message === "email_taken" ? t("email_taken") : fieldError(emailError)}>
          <Input type="email" dir="ltr" autoComplete="email" {...form.register("email")} />
        </Field>
        <Field label={t("locale")}>
          <Controller
            control={form.control}
            name="locale"
            render={({ field }) => (
              <div role="radiogroup" className="flex w-fit gap-1 rounded-full bg-muted p-1">
                {(["ar", "en"] as const).map((l) => (
                  <button key={l} type="button" role="radio" aria-checked={field.value === l} onClick={() => field.onChange(l)} className={cn("relative rounded-full px-5 py-2 text-body-sm font-medium transition-colors", field.value === l ? "text-background" : "text-muted-foreground")}>
                    {field.value === l && <motion.span layoutId="profile-locale" className="absolute inset-0 -z-10 rounded-full bg-foreground" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                    <span lang={l}>{t(`locales.${l}`)}</span>
                  </button>
                ))}
              </div>
            )}
          />
        </Field>
        <Controller
          control={form.control}
          name="marketing"
          render={({ field }) => (
            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-border p-4">
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">{t("marketing")}</span>
                <span className="text-body-sm text-muted-foreground">{t("marketingHint")}</span>
              </span>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </label>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" size="lg" loading={save.isPending} disabled={!form.formState.isDirty}>
            {t("save")}
          </Button>
        </div>
      </motion.form>

      <motion.aside initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }} className="flex flex-col gap-4 lg:col-span-4">
        <div className="rounded-[1.75rem] border border-border bg-surface p-5 sm:p-6">
          <p className="flex items-start gap-2 text-body-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-secondary-text" aria-hidden />
            <span>
              {t("privacy")}{" "}
              <Link href="/privacy" className="font-medium text-secondary-text underline underline-offset-4">
                {t("privacyLink")}
              </Link>
            </span>
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-[1.75rem] border border-border bg-surface p-5 sm:p-6">
          <p className="text-body-sm text-muted-foreground">{t("signOutLead")}</p>
          <Button variant="outline" onClick={() => void signOut()}>
            <LogOut className="flip-rtl" aria-hidden />
            {t("signOut")}
          </Button>
        </div>
      </motion.aside>
    </div>
  );
}
