"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { saudiMobileSchema } from "@myvisa/shared";
import { ArrowRight, Briefcase, GraduationCap, Palmtree, Stethoscope } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, RadioCard, RadioGroup, Switch } from "@/components/ui/choice";
import { Field, Label } from "@/components/ui/field";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Input, Textarea } from "@/components/ui/input";
import { OtpInput } from "@/components/ui/otp-input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flag } from "@/components/brand/flag";

const NATIONALITIES = ["SA", "EG", "JO", "IN", "PK"] as const;
const PURPOSES = [
  { value: "TOURISM", icon: Palmtree },
  { value: "STUDY", icon: GraduationCap },
  { value: "MEDICAL", icon: Stethoscope },
  { value: "BUSINESS", icon: Briefcase },
] as const;

const schema = z.object({
  fullName: z.string().trim().regex(/^[A-Za-z][A-Za-z' -]{2,}$/, "name"),
  phone: saudiMobileSchema,
  nationality: z.enum(NATIONALITIES, { message: "nationality" }),
  purpose: z.enum(["TOURISM", "STUDY", "MEDICAL", "BUSINESS"]),
  notes: z.string().max(500).optional(),
  consent: z.literal(true, { message: "consent" }),
  whatsapp: z.boolean(),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;
type ErrorKey = "name" | "invalid_saudi_mobile" | "nationality" | "consent";

export function FormsDemo() {
  const t = useTranslations("styleGuide.forms");
  const [otp, setOtp] = useState("");
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", phone: "", purpose: "TOURISM", notes: "", whatsapp: true },
  });

  const err = (message?: string) => (message ? t(`errors.${message as ErrorKey}`) : undefined);

  const onSubmit = async (data: FormOutput) => {
    await new Promise((r) => setTimeout(r, 900));
    toast.success(t("submitted"), { description: t("submittedDesc", { phone: data.phone }) });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-7">
        <CardContent className="pt-5 sm:pt-6">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
            <Field label={t("fullName")} hint={t("fullNameHint")} error={err(errors.fullName?.message)}>
              <Input {...register("fullName")} autoComplete="name" dir="ltr" placeholder="MOHAMMED ALQAHTANI" className="uppercase placeholder:normal-case" />
            </Field>

            <div className="grid gap-6 sm:grid-cols-2">
              <Field label={t("phone")} hint={t("phoneHint")} error={err(errors.phone?.message)}>
                <PhoneInput {...register("phone")} />
              </Field>
              <Field label={t("nationality")} error={err(errors.nationality?.message)}>
                <Controller
                  control={control}
                  name="nationality"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger onBlur={field.onBlur}>
                        <SelectValue placeholder={t("nationalityPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {NATIONALITIES.map((code) => (
                          <SelectItem key={code} value={code}>
                            <span className="flex items-center gap-2.5">
                              <Flag code={code} />
                              {t(`nationalities.${code}`)}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>

            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 text-body-sm font-medium">{t("purpose")}</legend>
              <Controller
                control={control}
                name="purpose"
                render={({ field }) => (
                  <RadioGroup value={field.value} onValueChange={field.onChange} className="sm:grid-cols-2">
                    {PURPOSES.map(({ value, icon: Icon }) => {
                      const [title, description] = t.raw(`purposes.${value}`) as [string, string];
                      return <RadioCard key={value} value={value} icon={<Icon />} title={title} description={description} />;
                    })}
                  </RadioGroup>
                )}
              />
            </fieldset>

            <Field label={t("notes")} optional={t("optional")}>
              <Textarea {...register("notes")} rows={3} />
            </Field>

            <div className="flex flex-col gap-4 rounded-2xl bg-surface-sunken/70 p-4">
              <Controller
                control={control}
                name="consent"
                render={({ field }) => (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="consent"
                        checked={field.value === true}
                        onCheckedChange={(v) => field.onChange(v === true)}
                        aria-invalid={Boolean(errors.consent) || undefined}
                        className="mt-1"
                      />
                      <Label htmlFor="consent" className="font-normal leading-relaxed">
                        {t("consent")}
                      </Label>
                    </div>
                    {errors.consent && <p className="ps-8 text-caption font-medium text-danger">{err(errors.consent.message)}</p>}
                  </div>
                )}
              />
              <Controller
                control={control}
                name="whatsapp"
                render={({ field }) => (
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="wa-updates" className="font-normal">
                      {t("whatsappUpdates")}
                    </Label>
                    <Switch id="wa-updates" checked={field.value} onCheckedChange={field.onChange} />
                  </div>
                )}
              />
            </div>

            <Button type="submit" variant="ink" size="lg" loading={isSubmitting} className="self-start">
              {t("submit")}
              <ArrowRight className="flip-rtl" aria-hidden />
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6 lg:col-span-5">
        <Card>
          <CardHeader>
            <CardTitle>{t("otp")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <OtpInput
              value={otp}
              onChange={setOtp}
              onComplete={(code) => toast(t("submitted"), { description: code })}
              label={t("otp")}
              digitLabel={(n) => `${t("otp")} ${n}`}
            />
            <p className="text-caption text-muted-foreground">{t("otpHint")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("documents")}</CardTitle>
          </CardHeader>
          <CardContent>
            <FileDropzone />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
