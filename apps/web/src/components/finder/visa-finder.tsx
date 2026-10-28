"use client";

import { pickVisa, type ApplicantType, type TravelPurpose } from "@myvisa/shared";
import { SiWhatsapp } from "@icons-pack/react-simple-icons";
import { ArrowUpRight, CalendarCheck, Check, Clock, Hourglass, Info, Link2, PartyPopper, Timer } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Flag } from "@/components/brand/flag";
import { PassportStamp } from "@/components/brand/passport-stamp";
import { PriceBreakdown } from "@/components/brand/price-breakdown";
import type { VisaTabData } from "@/components/destinations/visa-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export interface FinderDestination {
  slug: string;
  iso2: string;
  iata: string;
  name: string;
  image: string;
  imageAlt: string;
  visas: VisaTabData[];
}

const PURPOSES: TravelPurpose[] = ["TOURISM", "BUSINESS", "STUDY", "MEDICAL", "FAMILY_VISIT"];
const EASE = [0.16, 1, 0.3, 1] as const;

interface FinderProps {
  destinations: FinderDestination[];
  nationalities: { iso2: string; name: string }[];
  whatsapp: string;
}

/** Reads the shareable query (?to=&purpose=&as=&nat=). Needs a Suspense boundary (useSearchParams). */
export function VisaFinder(props: FinderProps) {
  return <FinderView {...props} params={useSearchParams()} />;
}

/**
 * The same finder with default choices, server-rendered as the Suspense fallback: the page ships complete
 * HTML of the same height, so nothing jumps when the query-aware version takes over.
 */
export function VisaFinderFallback(props: FinderProps) {
  return <FinderView {...props} params={null} />;
}

function FinderView({ destinations, nationalities, whatsapp, params }: FinderProps & { params: Pick<URLSearchParams, "get"> | null }) {
  const t = useTranslations("finder");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();

  const q = (key: string) => params?.get(key) ?? null;
  const [applicant, setApplicant] = useState<ApplicantType>(q("as") === "RESIDENT" ? "RESIDENT" : "SAUDI_CITIZEN");
  const [nationality, setNationality] = useState(q("nat") ?? nationalities[0]?.iso2 ?? "EG");
  const [slug, setSlug] = useState(destinations.some((d) => d.slug === q("to")) ? (q("to") as string) : (destinations[0]?.slug ?? ""));
  const [purpose, setPurpose] = useState<TravelPurpose>(PURPOSES.includes(q("purpose") as TravelPurpose) ? (q("purpose") as TravelPurpose) : "TOURISM");

  // Keep the URL shareable without adding history entries.
  // A boolean, not `params` itself: every replace below yields a new params object and would loop.
  const live = params !== null;
  useEffect(() => {
    if (!live) return;
    const query = new URLSearchParams({ to: slug, purpose, as: applicant, ...(applicant === "RESIDENT" ? { nat: nationality } : {}) });
    router.replace(`${pathname}?${query.toString()}`, { scroll: false });
  }, [slug, purpose, applicant, nationality, router, pathname, live]);

  const destination = destinations.find((d) => d.slug === slug) ?? destinations[0];
  const result = useMemo(() => {
    if (!destination) return undefined;
    const picked = pickVisa(destination.visas, purpose, applicant);
    const visa = picked?.visa;
    const price = visa?.pricing.find((p) => p.applicant === applicant);
    if (!picked || !visa || !price) return undefined;
    return { visa, price, fallback: picked.fallback, reqs: visa.requirements.filter((r) => !r.applicant || r.applicant === applicant) };
  }, [destination, purpose, applicant]);

  const visaFree = result?.visa.kind === "VISA_FREE";
  const waText = destination ? encodeURIComponent(`${t("eyebrow")}: ${destination.name} · ${tc(`purposes.${purpose}`)} · ${tc(`applicants.${applicant}`)}`) : "";

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      {/* Questions */}
      <div className="lg:col-span-5">
        <div className="flex flex-col gap-8 lg:sticky lg:top-28">
          <Question n={1} title={t("who")}>
            <LayoutGroup id="who">
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-surface p-1.5">
                {(["SAUDI_CITIZEN", "RESIDENT"] as const).map((a) => (
                  <button key={a} type="button" aria-pressed={applicant === a} onClick={() => setApplicant(a)} className={cn("relative h-12 rounded-xl text-body-sm font-medium transition-colors", applicant === a ? "text-background" : "text-muted-foreground hover:text-foreground")}>
                    {applicant === a && <motion.span layoutId="who-pill" className="absolute inset-0 rounded-xl bg-foreground" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
                    <span className="relative">{tc(`applicants.${a}`)}</span>
                  </button>
                ))}
              </div>
            </LayoutGroup>
            <AnimatePresence initial={false}>
              {applicant === "RESIDENT" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: EASE }} className="overflow-hidden">
                  <div className="pt-3">
                    <Select value={nationality} onValueChange={setNationality}>
                      <SelectTrigger aria-label={t("nationality")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {nationalities.map((n) => (
                          <SelectItem key={n.iso2} value={n.iso2}>
                            <span className="flex items-center gap-2.5">
                              <Flag code={n.iso2} />
                              {n.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Question>

          <Question n={2} title={t("where")}>
            <LayoutGroup id="where">
              <ul className="grid max-h-[22rem] grid-cols-2 gap-2 overflow-y-auto pe-1 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3" data-lenis-prevent>
                {destinations.map((d) => {
                  const on = d.slug === slug;
                  return (
                    <li key={d.slug}>
                      <button type="button" aria-pressed={on} onClick={() => setSlug(d.slug)} className={cn("relative flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-start text-body-sm transition-colors", on ? "border-transparent text-secondary-foreground" : "border-border bg-surface hover:border-border-strong")}>
                        {on && <motion.span layoutId="where-pill" className="absolute inset-0 rounded-xl bg-secondary" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
                        <Flag code={d.iso2} className="relative" />
                        <span className="relative truncate font-medium">{d.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </LayoutGroup>
          </Question>

          <Question n={3} title={t("why")}>
            <div className="flex flex-wrap gap-2">
              {PURPOSES.map((p) => (
                <button key={p} type="button" aria-pressed={purpose === p} onClick={() => setPurpose(p)} className={cn("h-11 rounded-full border px-5 text-body-sm font-medium transition-all", purpose === p ? "border-foreground bg-foreground text-background" : "border-border bg-surface hover:border-border-strong")}>
                  {tc(`purposes.${p}`)}
                </button>
              ))}
            </div>
          </Question>
        </div>
      </div>

      {/* Result */}
      <div className="lg:col-span-7" aria-live="polite">
        <AnimatePresence mode="wait">
          {destination && result && (
            <motion.article
              key={`${slug}-${purpose}-${applicant}`}
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.55, ease: EASE }}
              className="overflow-hidden rounded-[2rem] border border-border bg-surface shadow-lg"
            >
              <div className="dark relative h-52 overflow-hidden sm:h-64">
                <motion.div className="absolute inset-0" initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 1.4, ease: EASE }}>
                  <Image src={destination.image} alt={destination.imageAlt} fill sizes="(min-width: 1024px) 700px, 100vw" className="object-cover" />
                </motion.div>
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
                <div className="absolute inset-x-6 bottom-5 flex items-end justify-between gap-4 text-foreground sm:inset-x-8">
                  <div>
                    <p className="eyebrow text-gold-300">{t("result")}</p>
                    <h2 className="mt-2 flex items-center gap-3 font-display text-display-lg leading-none">
                      <Flag code={destination.iso2} className="h-6 w-9 rounded-md" />
                      {destination.name}
                    </h2>
                  </div>
                  <PassportStamp animated shape="circle" tone="gold" top={visaFree ? "VISA FREE" : "MYVISA"} bottom={destination.iata} code={destination.iata} rotate={-12} className="hidden w-24 sm:block [&_svg]:mix-blend-normal [&_svg]:[color:var(--color-gold-300)]" />
                </div>
              </div>

              <div className="flex flex-col gap-6 p-6 sm:p-8">
                {result.fallback && (
                  <p className="flex items-start gap-2 rounded-xl bg-info-soft px-4 py-3 text-body-sm">
                    <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
                    {t("fallback", { country: destination.name })}
                  </p>
                )}

                {visaFree ? (
                  <div className="flex items-start gap-4 rounded-2xl bg-success-soft p-5">
                    <PartyPopper className="size-7 shrink-0 text-success" aria-hidden />
                    <div>
                      <p className="font-display text-heading">{t("free")}</p>
                      <p className="mt-1 text-body-sm text-foreground/80">{t("freeBody")}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-display text-display-md">{result.visa.name}</h3>
                      <Badge tone="teal">{result.visa.kindLabel}</Badge>
                    </div>
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Fact icon={<Hourglass />} label={t("processing")} value={tc("workingDays", { min: result.visa.processingDays[0], max: result.visa.processingDays[1] })} />
                      <Fact icon={<Clock />} label={t("stay")} value={tc("days", { count: result.visa.maxStayDays })} />
                      <Fact icon={<Timer />} label={t("validity")} value={tc("days", { count: result.visa.validityDays })} />
                      <Fact icon={<CalendarCheck />} label={t("appointment")} value={result.visa.appointment ? t("appointmentYes") : t("appointmentNo")} />
                    </dl>
                  </>
                )}

                {applicant === "RESIDENT" && (
                  <p className="flex items-start gap-2 text-body-sm text-muted-foreground">
                    <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {t("residentNote")}
                  </p>
                )}

                {!visaFree && result.reqs.length > 0 && (
                  <div>
                    <h4 className="mb-3 font-medium">{t("documents", { count: result.reqs.length })}</h4>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {result.reqs.map((r, i) => (
                        <motion.li key={`${r.doc}-${i}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.05, duration: 0.4 }} className="flex items-start gap-2.5 rounded-xl bg-muted/70 px-3.5 py-2.5 text-body-sm">
                          <Check className={cn("mt-0.5 size-4 shrink-0", r.optional ? "text-muted-foreground" : "text-secondary-text")} strokeWidth={2.5} aria-hidden />
                          <span>{r.title}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.price.eligible && (result.price.governmentFee > 0 || result.price.serviceFee > 0) && (
                  <PriceBreakdown lines={[{ governmentFee: result.price.governmentFee, serviceFee: result.price.serviceFee }]} className="border-0 bg-muted/50 shadow-none" />
                )}
                {!result.price.eligible && <p className="rounded-xl bg-danger-soft px-4 py-3 text-body-sm text-danger">{result.price.reason}</p>}

                <div className="flex flex-col gap-3 border-t border-border pt-6">
                  <p className="text-body-sm text-muted-foreground">{t("applySoon")}</p>
                  <div className="flex flex-wrap gap-3">
                    {result.price.eligible && (
                      <Button asChild size="lg">
                        <Link href={{ pathname: "/apply", query: { to: destination.slug, visa: result.visa.id, purpose, as: applicant, ...(applicant === "RESIDENT" ? { nationality } : {}) } }}>
                          {t("applyNow")}
                          <ArrowUpRight className="flip-rtl" aria-hidden />
                        </Link>
                      </Button>
                    )}
                    <Button asChild size="lg" variant={result.price.eligible ? "outline" : "primary"}>
                      <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${waText}`} target="_blank" rel="noopener noreferrer">
                        <SiWhatsapp aria-hidden />
                        {t("whatsapp")}
                      </a>
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => {
                        void navigator.clipboard?.writeText(window.location.href);
                        toast.success(t("copied"));
                      }}
                    >
                      <Link2 aria-hidden />
                      {t("share")}
                    </Button>
                    <Button asChild size="lg" variant="ghost">
                      <Link href={`/destinations/${destination.slug}`}>{tc("viewDetails")}</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </motion.article>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Question({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-4 flex items-center gap-3 font-display text-heading">
        <span lang="en" className="grid size-8 place-items-center rounded-full bg-gold-400 text-body-sm font-semibold text-ink-950">
          {n}
        </span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl bg-muted/70 px-4 py-3">
      <dt className="flex items-center gap-1.5 text-caption text-muted-foreground [&_svg]:size-3.5">
        {icon}
        {label}
      </dt>
      <dd className="text-body-sm font-semibold">{value}</dd>
    </div>
  );
}
