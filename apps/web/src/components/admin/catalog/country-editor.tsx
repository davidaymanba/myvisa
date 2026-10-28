"use client";

import type { CountryDetail } from "@myvisa/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CloudOff, ArrowUpRight, ChevronLeft } from "lucide-react";
import { LayoutGroup, motion } from "motion/react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Flag } from "@/components/brand/flag";
import { PassportStamp } from "@/components/brand/passport-stamp";
import { FadeIn } from "@/components/motion/fade-in";
import { SplitReveal } from "@/components/motion/split-reveal";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api/client";
import { unsplash } from "@/lib/images";
import { cn } from "@/lib/utils";
import { ConfirmDelete } from "../form-bits";
import { adminKeys, useCan, useMutationToasts } from "../use-admin";
import { CountryForm } from "./country-form";
import { FaqPanel } from "./faqs";
import { VisaPanel } from "./visa-panel";

const TABS = ["visas", "profile", "faqs"] as const;

export function CountryEditor({ id }: { id: string }) {
  const tc = useTranslations("admin.common");
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: adminKeys.country(id), queryFn: () => api<CountryDetail>(`/admin/countries/${id}`) });
  if (isError) return <ErrorState title={tc("loadError")} icon={<CloudOff />} retryLabel={tc("retry")} onRetry={() => void refetch()} />;
  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-72 rounded-[2.5rem]" />
        <Skeleton className="h-12 w-80 rounded-full" />
        <Skeleton className="h-64 rounded-[2rem]" />
      </div>
    );
  }
  return <Editor country={data} />;
}

export function NewCountry() {
  const t = useTranslations("admin.country");
  const tn = useTranslations("admin.nav");
  return (
    <>
      <Hero title={t("newTitle")} crumb={tn("destinations")} />
      <div className="mt-10">
        <CountryForm />
      </div>
    </>
  );
}

function Editor({ country }: { country: CountryDetail }) {
  const t = useTranslations("admin.country");
  const tn = useTranslations("admin.nav");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const toasts = useMutationToasts();
  const can = useCan();
  const [tab, setTab] = useState<(typeof TABS)[number]>(country.isDestination ? "visas" : "profile");

  const remove = useMutation({
    mutationFn: () => api(`/admin/countries/${country.id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.countries });
      toasts.success(t("deleted"));
      router.replace("/admin/destinations");
    },
    onError: toasts.error,
  });

  const name = locale === "ar" ? country.nameAr : country.nameEn;
  const visaCount = country.services.filter((s) => s.category === "VISA").length;

  return (
    <>
      <Hero
        title={name}
        crumb={tn("destinations")}
        imageId={country.imageId}
        iso2={country.iso2}
        eyebrow={country.region ? tc(`regions.${country.region}`) : undefined}
        stampTop={country.nameEn.toUpperCase()}
        stampCode={country.mainAirportIata ?? country.iso2}
        actions={
          <>
            {country.isDestination && (
              <Button asChild variant="outline" size="sm" className="border-white/20 bg-white/5 text-foreground hover:bg-white/10">
                <a href={`${locale === "ar" ? "" : "/en"}/destinations/${country.slug}`} target="_blank" rel="noreferrer">
                  {t("viewOnSite")}
                  <ArrowUpRight className="flip-rtl" aria-hidden />
                </a>
              </Button>
            )}
            {can("catalog:write") && <ConfirmDelete label={t("deleteCountry")} busy={remove.isPending} onConfirm={() => remove.mutateAsync()} />}
          </>
        }
      />

      <LayoutGroup id="country-tabs">
        <div role="tablist" className="sticky top-16 z-20 -mx-4 mt-8 flex gap-1 overflow-x-auto bg-background/85 px-4 py-3 backdrop-blur-xl sm:-mx-8 sm:px-8 lg:top-0 lg:-mx-12 lg:px-12">
          {TABS.filter((k) => country.isDestination || k === "profile").map((k) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("relative shrink-0 rounded-full px-4 py-2.5 text-body-sm font-medium transition-colors sm:px-5", tab === k ? "text-background" : "text-muted-foreground hover:text-foreground")}>
              {tab === k && <motion.span layoutId="country-tab" className="absolute inset-0 rounded-full bg-foreground" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <span className="relative flex items-center gap-2">
                {t(`tabs.${k}`)}
                {k === "visas" && <span className={cn("rounded-full px-1.5 text-caption tabular", tab === k ? "bg-background/20" : "bg-muted")}>{visaCount}</span>}
                {k === "faqs" && <span className={cn("rounded-full px-1.5 text-caption tabular", tab === k ? "bg-background/20" : "bg-muted")}>{country.faqs.length}</span>}
              </span>
            </button>
          ))}
        </div>
      </LayoutGroup>

      <motion.div key={tab} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} className="mt-8">
        {tab === "visas" && <VisaPanel country={country} />}
        {tab === "profile" && <CountryForm key={country.updatedAt} country={country} />}
        {tab === "faqs" && <FaqPanel country={country} />}
      </motion.div>
    </>
  );
}

/** Cinematic header: the destination photo under ink, a word-reveal name and an arrival stamp. */
function Hero({ title, crumb, imageId, iso2, eyebrow, stampTop, stampCode, actions }: { title: string; crumb: string; imageId?: string | null; iso2?: string; eyebrow?: string; stampTop?: string; stampCode?: string; actions?: React.ReactNode }) {
  return (
    <section data-surface="dark" className="dark relative isolate -mx-4 -mt-8 overflow-hidden bg-ink-950 px-4 pb-10 pt-14 text-foreground sm:-mx-8 sm:px-8 lg:-mx-12 lg:-mt-12 lg:px-12 lg:pb-14 lg:pt-20">
      {imageId ? (
        <Image src={unsplash(imageId, 1800)} alt="" fill priority sizes="100vw" className="-z-20 animate-[kenburns_24s_ease-in-out_infinite_alternate] object-cover opacity-60" />
      ) : (
        <div aria-hidden className="absolute -start-24 -top-24 -z-20 size-[40rem] animate-drift rounded-full bg-teal-500/30 blur-[120px]" />
      )}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-ink-950/60 to-ink-950/30" />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-col gap-4">
          <FadeIn>
            <Link href="/admin/destinations" className="-my-2 inline-flex items-center gap-1 py-2 text-caption text-foreground/60 hover:text-foreground">
              <ChevronLeft className="size-4 ltr:rotate-180" aria-hidden />
              {crumb}
            </Link>
          </FadeIn>
          {(iso2 || eyebrow) && (
            <FadeIn delay={0.1} className="flex items-center gap-3">
              {iso2 && <Flag code={iso2} className="h-7 w-10 rounded-md" />}
              {eyebrow && <span className="eyebrow text-gold-300">{eyebrow}</span>}
            </FadeIn>
          )}
          <SplitReveal as="h1" trigger="mount" delay={0.15} className="text-[clamp(3rem,1.5rem+6vw,7.5rem)] font-medium leading-[0.95] tracking-[-0.04em] [:lang(ar)_&]:leading-[1.2]" lines={[{ text: title }]} />
        </div>
        <FadeIn delay={0.4} className="flex flex-wrap items-center gap-2">
          {actions}
        </FadeIn>
      </div>
      {stampTop && <PassportStamp animated shape="circle" tone="gold" top={stampTop} bottom="MYVISA" code={stampCode ?? ""} rotate={-12} className="pointer-events-none absolute end-8 top-10 hidden w-36 opacity-80 xl:block [&_svg]:mix-blend-normal" />}
    </section>
  );
}
