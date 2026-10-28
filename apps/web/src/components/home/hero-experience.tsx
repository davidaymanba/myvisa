"use client";

import {
  calculatePrice,
  formatMoney,
  pickVisa,
  type AppLocale,
  type ApplicantType,
  type EntryType,
  type Halalas,
  type TravelPurpose,
  type VisaKind,
} from "@myvisa/shared";
import { ArrowUpRight, CalendarClock, DoorOpen, Hourglass, Info, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Flag } from "@/components/brand/flag";
import { PassportStamp } from "@/components/brand/passport-stamp";
import type { GlobePoint } from "@/components/globe/globe";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Button } from "@/components/ui/button";
import { InlineSelect } from "@/components/ui/inline-select";
import { Link } from "@/i18n/navigation";

const Globe = dynamic(() => import("@/components/globe/globe").then((m) => m.Globe), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse rounded-full bg-teal-500/5" />,
});

export interface SearchVisa {
  purpose: TravelPurpose;
  kind: VisaKind;
  name: string;
  processingDays: readonly [number, number];
  maxStayDays: number;
  entry: EntryType;
  pricing: { applicant: ApplicantType; eligible: boolean; governmentFee: Halalas; serviceFee: Halalas; reason?: string }[];
}

export interface SearchDestination {
  slug: string;
  iso2: string;
  iata: string;
  lat: number;
  lon: number;
  name: string;
  visas: SearchVisa[];
}

const ORIGIN: GlobePoint = { code: "RUH", lat: 24.96, lon: 46.7 };
const PURPOSES: TravelPurpose[] = ["TOURISM", "BUSINESS", "STUDY", "MEDICAL", "FAMILY_VISIT"];
const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Owns the hero's interactive layer: the globe (positioned against the <section>, so this component must
 * not be wrapped in a positioned element) and the smart search that steers it. Server-rendered copy comes in as `intro` / `outro`.
 */
export function HeroExperience({
  destinations,
  nationalities,
  intro,
  outro,
}: {
  destinations: SearchDestination[];
  nationalities: { iso2: string; name: string }[];
  intro: ReactNode;
  outro: ReactNode;
}) {
  const t = useTranslations("home.search");
  const tc = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const [applicant, setApplicant] = useState<ApplicantType>("SAUDI_CITIZEN");
  const [nationality, setNationality] = useState(nationalities[0]?.iso2 ?? "EG");
  const [slug, setSlug] = useState(destinations[0]?.slug ?? "");
  const [purpose, setPurpose] = useState<TravelPurpose>("TOURISM");

  const globePoints = useMemo<GlobePoint[]>(() => destinations.map((d) => ({ code: d.iata, lat: d.lat, lon: d.lon })), [destinations]);
  const destination = destinations.find((d) => d.slug === slug) ?? destinations[0];

  const match = useMemo(() => {
    if (!destination) return undefined;
    const picked = pickVisa(destination.visas, purpose, applicant);
    const visa = picked?.visa;
    const price = visa?.pricing.find((p) => p.applicant === applicant);
    if (!picked || !visa || !price) return undefined;
    return { visa, price, fallback: picked.fallback, breakdown: calculatePrice([{ governmentFee: price.governmentFee, serviceFee: price.serviceFee }]) };
  }, [destination, purpose, applicant]);

  const money = (v: number) => formatMoney(v, locale);
  const govPct = match && match.breakdown.total ? (match.breakdown.governmentFees / match.breakdown.total) * 100 : 0;
  const resultKey = `${slug}-${purpose}-${applicant}`;

  return (
    <>
      {/* Globe — sits behind the copy on phones, bleeds off the inline-end edge on desktop. */}
      <motion.div
        aria-hidden
        className="absolute -top-[8vw] start-1/2 z-0 aspect-square w-[130vw] -translate-x-1/2 opacity-40 rtl:translate-x-1/2 sm:w-[95vw] lg:start-auto lg:-end-[6vw] lg:top-[10%] lg:w-[min(56vw,860px)] lg:translate-x-0 lg:opacity-100 lg:rtl:translate-x-0"
        initial={{ opacity: 0, scale: 0.85, rotate: -8 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 1.8, ease: EASE, delay: 0.2 }}
      >
        <Globe origin={ORIGIN} destinations={globePoints} highlight={destination?.iata} />
      </motion.div>

      <div className="container-page relative z-10 flex flex-1 flex-col justify-center pb-24 pt-32 sm:pt-40 lg:pb-28">
        <div className="flex max-w-2xl flex-col lg:max-w-[50%]">
          {intro}
      {/* Smart search */}
      {/* CSS entrance (not motion): it must show with the first paint, before hydration. */}
      <div className="relative mt-10 w-full animate-rise-in" style={{ animationDelay: "0.6s", "--rise-y": "40px" } as CSSProperties}>
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-2 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6)] backdrop-blur-2xl">
          <div className="rounded-[1.4rem] border border-white/[0.06] bg-ink-950/50 p-5 sm:p-6">
            <p className="eyebrow mb-4 flex items-center gap-2 text-muted-foreground">
              <Sparkles className="size-3.5 text-gold-300" aria-hidden />
              {t("label")}
            </p>
            <p className="font-display text-[clamp(1.35rem,1.1rem+1.1vw,1.9rem)] leading-[1.6] text-foreground">
              {t("iAm")}{" "}
              <InlineSelect
                label={t("iAm")}
                value={applicant}
                onValueChange={(v) => setApplicant(v as ApplicantType)}
                options={(["SAUDI_CITIZEN", "RESIDENT"] as const).map((a) => ({ value: a, label: tc(`applicants.${a}`) }))}
              />
              {applicant === "RESIDENT" && (
                <>
                  {" · "}
                  <span className="text-muted-foreground">{t("nationality")}</span>{" "}
                  <InlineSelect
                    label={t("nationality")}
                    value={nationality}
                    onValueChange={setNationality}
                    options={nationalities.map((n) => ({ value: n.iso2, label: n.name, icon: <Flag code={n.iso2} className="h-3.5 w-5" /> }))}
                  />
                </>
              )}{" "}
              {t("travellingTo")}{" "}
              <InlineSelect
                label={t("travellingTo")}
                value={slug}
                onValueChange={setSlug}
                options={destinations.map((d) => ({ value: d.slug, label: d.name, icon: <Flag code={d.iso2} className="h-3.5 w-5" /> }))}
              />{" "}
              {t("for")}{" "}
              <InlineSelect
                label={t("for")}
                value={purpose}
                onValueChange={(v) => setPurpose(v as TravelPurpose)}
                options={PURPOSES.map((p) => ({ value: p, label: tc(`purposes.${p}`) }))}
              />
            </p>

            {/* Instant result */}
            <div aria-live="polite" className="relative mt-5">
              <AnimatePresence mode="popLayout" initial={false}>
                {destination && match && (
                  <motion.div
                    key={resultKey}
                    initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
                    transition={{ duration: 0.5, ease: EASE }}
                    className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5"
                  >
                    <div className="pointer-events-none absolute -end-6 -top-6 w-24 opacity-80 sm:w-32">
                      <PassportStamp
                        animated
                        shape="circle"
                        tone="gold"
                        top={destination.name.toUpperCase()}
                        bottom="MYVISA"
                        code={destination.iata}
                        rotate={-14}
                        seed={destination.iata.charCodeAt(0)}
                        className="w-full [&_svg]:mix-blend-normal"
                      />
                    </div>

                    <div className="flex items-center gap-3 pe-14 sm:pe-20">
                      <Flag code={destination.iso2} className="h-6 w-9 rounded-md" />
                      <div className="min-w-0">
                        <p className="text-title font-semibold max-sm:line-clamp-2 sm:truncate">{match.visa.name}</p>
                        <p className="text-caption text-teal-200">{tc(`visaKinds.${match.visa.kind}`)}</p>
                      </div>
                    </div>

                    {match.fallback && (
                      <p className="mt-3 flex items-start gap-2 text-caption text-muted-foreground">
                        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                        {t("fallback")}
                      </p>
                    )}

                    {match.visa.kind === "VISA_FREE" && match.price.eligible ? (
                      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="font-display text-heading text-teal-200">{t("freeTitle")}</p>
                          <p className="mt-1 max-w-sm text-body-sm text-muted-foreground">{t("freeBody")}</p>
                        </div>
                        <Button asChild variant="outline" size="sm" className="w-fit border-white/20">
                          <Link href={`/destinations/${destination.slug}`}>{t("details")}</Link>
                        </Button>
                      </div>
                    ) : !match.price.eligible ? (
                      <p className="mt-4 rounded-xl bg-danger-soft px-3 py-2.5 text-body-sm text-danger">{match.price.reason ?? t("notEligible")}</p>
                    ) : (
                      <>
                        <dl className="mt-4 grid grid-cols-3 gap-2 text-caption sm:gap-3 sm:text-body-sm">
                          <Fact icon={<Hourglass />} label={t("processing")} value={tc("workingDays", { min: match.visa.processingDays[0], max: match.visa.processingDays[1] })} />
                          <Fact icon={<CalendarClock />} label={t("stay")} value={tc("days", { count: match.visa.maxStayDays })} />
                          <Fact icon={<DoorOpen />} label={t("entry")} value={tc(`entry.${match.visa.entry}`)} />
                        </dl>

                        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                          <div className="min-w-0 sm:flex-1">
                            <p className="text-caption text-muted-foreground">{t("total")}</p>
                            <AnimatedNumber value={match.breakdown.total} format={money} className="font-display text-display-md text-foreground" />
                            <div className="mt-2 flex h-1.5 max-w-60 overflow-hidden rounded-full bg-white/10" aria-hidden>
                              <motion.div className="h-full bg-teal-300" animate={{ width: `${govPct}%` }} transition={{ duration: 0.8, ease: EASE }} />
                              <div className="h-full flex-1 bg-gold-400" />
                            </div>
                            <p className="mt-1.5 flex gap-4 text-caption text-muted-foreground">
                              <span>
                                <span className="me-1 inline-block size-1.5 rounded-full bg-teal-300 align-middle" />
                                {t("gov")} {money(match.breakdown.governmentFees)}
                              </span>
                              <span>
                                <span className="me-1 inline-block size-1.5 rounded-full bg-gold-400 align-middle" />
                                {t("ours")} {money(match.breakdown.serviceFees + match.breakdown.vat)}
                              </span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button asChild variant="ghost" size="sm" className="text-foreground/80">
                              <Link href={`/destinations/${destination.slug}`}>{t("details")}</Link>
                            </Button>
                            <Button asChild size="md">
                              <Link href={{ pathname: "/apply", query: { to: destination.slug, purpose, as: applicant } }}>
                                {t("apply")}
                                <ArrowUpRight className="flip-rtl" aria-hidden />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
          {outro}
        </div>
      </div>
    </>
  );
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-white/[0.04] px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-caption text-muted-foreground [&_svg]:size-3.5">
        {icon}
        {label}
      </dt>
      <dd className="font-medium leading-snug">{value}</dd>
    </div>
  );
}
