"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { REGIONS, countryInputSchema, type CountryData, type CountryDetail, type CountryInput, type ServiceRecord } from "@myvisa/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageOff } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api/client";
import { unsplash } from "@/lib/images";
import { NumberField, SelectField, SwitchField, TextField } from "../fields";
import { Bilingual, FormSection, SaveBar } from "../form-bits";
import { adminKeys, applyServerErrors, useCan, useMutationToasts } from "../use-admin";

type Values = CountryInput;

const EMPTY: Values = {
  slug: "",
  iso2: "",
  iso3: null,
  nameAr: "",
  nameEn: "",
  nationalityAr: null,
  nationalityEn: null,
  region: null,
  isDestination: true,
  isPopular: false,
  isSchengen: false,
  isActive: true,
  sortOrder: 0,
  imageId: null,
  imageAltAr: null,
  imageAltEn: null,
  mainAirportIata: null,
  latitude: null,
  longitude: null,
  capitalAr: null,
  capitalEn: null,
  taglineAr: null,
  taglineEn: null,
  overviewAr: null,
  overviewEn: null,
  bestTimeAr: null,
  bestTimeEn: null,
  flightHours: null,
  currency: null,
  insuranceServiceId: null,
  seoTitleAr: null,
  seoTitleEn: null,
  seoDescAr: null,
  seoDescEn: null,
};

/** Picks exactly the editable fields from a record (the API also returns ids, timestamps and relations). */
function toValues(c: CountryDetail): Values {
  return Object.fromEntries(Object.keys(EMPTY).map((k) => [k, c[k as keyof CountryDetail] ?? EMPTY[k as keyof Values]])) as Values;
}

export function CountryForm({ country }: { country?: CountryDetail }) {
  const t = useTranslations("admin.country");
  const tc = useTranslations("common");
  const ta = useTranslations("admin.common");
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const toasts = useMutationToasts();
  const can = useCan();
  const readOnly = !can("catalog:write");

  const form = useForm<Values, unknown, CountryData>({ resolver: zodResolver(countryInputSchema), defaultValues: country ? toValues(country) : EMPTY, mode: "onTouched" });
  const insurance = useQuery({ queryKey: adminKeys.insurance, queryFn: () => api<ServiceRecord[]>("/admin/services?category=TRAVEL_INSURANCE") });

  const save = useMutation({
    mutationFn: (data: CountryData) => (country ? api<CountryDetail>(`/admin/countries/${country.id}`, { method: "PUT", body: data }) : api<CountryDetail>("/admin/countries", { method: "POST", body: data })),
    onSuccess: async (saved, data) => {
      form.reset(data as Values);
      await queryClient.invalidateQueries({ queryKey: adminKeys.countries });
      if (country) {
        await queryClient.invalidateQueries({ queryKey: adminKeys.country(country.id) });
        toasts.success(t("saved"));
      } else {
        toasts.success(t("created"));
        router.replace(`/admin/destinations/${saved.id}`);
      }
    },
    onError: (error) => {
      applyServerErrors(error, form.setError);
      toasts.error(error);
    },
  });

  const imageId = form.watch("imageId");
  const slug = form.watch("slug");
  const regionOptions = REGIONS.map((r) => ({ value: r, label: tc(`regions.${r}`) }));
  const insuranceOptions = (insurance.data ?? []).map((s) => ({ value: s.id, label: locale === "ar" ? s.nameAr : s.nameEn }));

  return (
    <form onSubmit={form.handleSubmit((data) => save.mutate(data))} noValidate>
      <fieldset disabled={readOnly} className="contents">
        <FormSection index="01" title={t("sections.identity")} hint={t("sections.identityHint")}>
          <Bilingual>
            <TextField form={form} name="nameAr" label={t("fields.nameAr")} />
            <TextField form={form} name="nameEn" label={t("fields.nameEn")} lang="en" />
          </Bilingual>
          <div className="grid gap-5 sm:grid-cols-3">
            <TextField form={form} name="slug" label={t("fields.slug")} lang="code" hint={<span dir="ltr">{t("fields.slugHint", { slug: slug || "…" })}</span>} className="sm:col-span-3 [&_input]:normal-case" />
            <TextField form={form} name="iso2" label={t("fields.iso2")} lang="code" upper />
            <TextField form={form} name="iso3" label={t("fields.iso3")} lang="code" upper />
            <SelectField form={form} name="region" label={t("fields.region")} options={regionOptions} nullable />
          </div>
          <Bilingual>
            <TextField form={form} name="nationalityAr" label={t("fields.nationalityAr")} hint={t("fields.nationalityHint")} />
            <TextField form={form} name="nationalityEn" label={t("fields.nationalityEn")} lang="en" />
          </Bilingual>
        </FormSection>

        <FormSection index="02" title={t("sections.story")} hint={t("sections.storyHint")}>
          <Bilingual>
            <TextField form={form} name="taglineAr" label={t("fields.taglineAr")} />
            <TextField form={form} name="taglineEn" label={t("fields.taglineEn")} lang="en" />
            <TextField form={form} name="overviewAr" label={t("fields.overviewAr")} multiline rows={5} />
            <TextField form={form} name="overviewEn" label={t("fields.overviewEn")} lang="en" multiline rows={5} />
            <TextField form={form} name="capitalAr" label={t("fields.capitalAr")} />
            <TextField form={form} name="capitalEn" label={t("fields.capitalEn")} lang="en" />
            <TextField form={form} name="bestTimeAr" label={t("fields.bestTimeAr")} />
            <TextField form={form} name="bestTimeEn" label={t("fields.bestTimeEn")} lang="en" />
          </Bilingual>
        </FormSection>

        <FormSection index="03" title={t("sections.media")} hint={t("sections.mediaHint")}>
          <div className="grid gap-5 sm:grid-cols-[1fr_14rem]">
            <div className="flex flex-col gap-5">
              <TextField form={form} name="imageId" label={t("fields.imageId")} lang="code" className="[&_input]:normal-case" />
              <TextField form={form} name="imageAltAr" label={t("fields.imageAltAr")} />
              <TextField form={form} name="imageAltEn" label={t("fields.imageAltEn")} lang="en" />
            </div>
            <PhotoPreview id={imageId ?? ""} />
          </div>
        </FormSection>

        <FormSection index="04" title={t("sections.travel")} hint={t("sections.travelHint")}>
          <div className="grid gap-5 sm:grid-cols-3">
            <TextField form={form} name="mainAirportIata" label={t("fields.airport")} lang="code" upper />
            <NumberField form={form} name="latitude" label={t("fields.latitude")} />
            <NumberField form={form} name="longitude" label={t("fields.longitude")} />
            <NumberField form={form} name="flightHours" label={t("fields.flightHours")} />
            <TextField form={form} name="currency" label={t("fields.currency")} lang="code" upper />
            <SelectField form={form} name="insuranceServiceId" label={t("fields.insurance")} options={insuranceOptions} nullable noneLabel={t("fields.noInsurance")} />
          </div>
        </FormSection>

        <FormSection index="05" title={t("sections.visibility")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <SwitchField form={form} name="isActive" label={t("fields.isActive")} />
            <SwitchField form={form} name="isDestination" label={t("fields.isDestination")} hint={t("fields.isDestinationHint")} />
            <SwitchField form={form} name="isPopular" label={t("fields.isPopular")} hint={t("fields.isPopularHint")} />
            <SwitchField form={form} name="isSchengen" label={t("fields.isSchengen")} />
          </div>
        </FormSection>

        <FormSection index="06" title={t("sections.seo")} hint={t("sections.seoHint")}>
          <Bilingual>
            <TextField form={form} name="seoTitleAr" label={t("fields.seoTitleAr")} />
            <TextField form={form} name="seoTitleEn" label={t("fields.seoTitleEn")} lang="en" />
            <TextField form={form} name="seoDescAr" label={t("fields.seoDescAr")} multiline rows={3} />
            <TextField form={form} name="seoDescEn" label={t("fields.seoDescEn")} lang="en" multiline rows={3} />
          </Bilingual>
        </FormSection>
      </fieldset>

      <SaveBar visible={!readOnly && (form.formState.isDirty || !country)} saving={save.isPending} saveLabel={country ? undefined : ta("create")} onDiscard={() => (country ? form.reset() : router.push("/admin/destinations"))} />
    </form>
  );
}

function PhotoPreview({ id }: { id: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const src = id ? unsplash(id.trim(), 600) : "";
  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-border bg-surface-sunken">
      {src && failed !== src ? (
        // eslint-disable-next-line @next/next/no-img-element -- live preview of an arbitrary id; next/image would cache failures
        <img key={src} src={src} alt="" onError={() => setFailed(src)} className="size-full animate-fade-in object-cover" />
      ) : (
        <span className="absolute inset-0 grid place-items-center text-muted-foreground">
          <ImageOff className="size-8" aria-hidden />
        </span>
      )}
    </div>
  );
}
