import { TRACKING_STEPS, trackingStepIndex, type OrderStatus, type TrackingStep } from "@myvisa/shared";
import { Check, FileSearch, Inbox, Landmark, PackageCheck, CalendarCheck, Plane, Stamp } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { LogoMark } from "./logo";

const stepIcons: Record<TrackingStep, typeof Check> = {
  RECEIVED: Inbox,
  DOCUMENTS_REVIEW: FileSearch,
  APPOINTMENT_BOOKED: CalendarCheck,
  SUBMITTED_TO_EMBASSY: Landmark,
  DECISION_ISSUED: Stamp,
  DELIVERED: PackageCheck,
};

export interface BoardingPassProps {
  orderNumber: string;
  from: { code: string; city: string };
  to: { code: string; city: string };
  serviceName: string;
  travelers: number;
  status: OrderStatus;
  /** ISO timestamps of milestones already reached. */
  reachedAt?: Partial<Record<TrackingStep, string>>;
  className?: string;
}

/** Order tracking styled as a boarding pass: route header, tear line, then the six milestones. */
export function BoardingPass({ orderNumber, from, to, serviceName, travelers, status, reachedAt = {}, className }: BoardingPassProps) {
  const t = useTranslations("ui.boardingPass");
  const format = useFormatter();
  const current = trackingStepIndex(status);
  const actionRequired = status === "ACTION_REQUIRED";
  const progressPct = current <= 0 ? 0 : (current / (TRACKING_STEPS.length - 1)) * 100;

  return (
    <article className={cn("relative overflow-hidden rounded-3xl border border-border bg-surface shadow-md", className)} aria-label={t("aria", { number: orderNumber })}>
      {/* Header stub */}
      <header className="flex items-center justify-between gap-4 bg-inverse px-5 py-4 text-inverse-foreground sm:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <LogoMark tone="dark" className="text-sand-100 dark:text-sand-100 [&_rect]:fill-white/10" />
          <span className="eyebrow text-inverse-muted">{t("title")}</span>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span className="text-caption text-inverse-muted">{t("orderNumber")}</span>
          <span lang="en" dir="ltr" className="whitespace-nowrap font-mono text-body-sm font-semibold tracking-wider">
            {orderNumber}
          </span>
        </div>
      </header>

      {/* Route */}
      <div className="grid grid-cols-1 gap-6 px-5 py-6 sm:px-7 md:grid-cols-[1fr_auto] md:items-center md:gap-10">
        <div className="flex items-center gap-3 sm:gap-6">
          <Airport label={t("from")} code={from.code} city={from.city} />
          <div className="relative flex flex-1 items-center" aria-hidden>
            <span className="size-2 rounded-full border-2 border-secondary" />
            <span className="h-px flex-1 border-t-2 border-dashed border-border-strong" />
            <span className="mx-1 grid size-9 place-items-center rounded-full bg-primary text-ink-900 shadow-gold">
              <Plane className="size-4 flip-rtl" />
            </span>
            <span className="h-px flex-1 border-t-2 border-dashed border-border-strong" />
            <span className="size-2 rounded-full bg-secondary" />
          </div>
          <Airport label={t("to")} code={to.code} city={to.city} align="end" />
        </div>
        <dl className="grid grid-cols-3 gap-4 border-t border-border pt-5 text-body-sm max-sm:flex max-sm:flex-wrap max-sm:gap-x-8 md:flex md:flex-col md:gap-3 md:border-s md:border-t-0 md:ps-8 md:pt-0">
          <Meta label={t("service")} value={serviceName} className="max-sm:basis-full" />
          <Meta label={t("travelers")} value={t("travelerCount", { count: travelers })} />
          <div className="flex min-w-0 flex-col gap-1">
            <dt className="text-caption text-muted-foreground">{t("status")}</dt>
            <dd>
              <Badge tone={actionRequired ? "warning" : status === "DELIVERED" ? "success" : "teal"} dot>
                {t(`statuses.${status}`)}
              </Badge>
            </dd>
          </div>
        </dl>
      </div>

      {/* Tear line with punched notches */}
      <div className="relative" aria-hidden>
        <div className="perforation mx-6" />
        <span className="absolute -start-3 top-1/2 size-6 -translate-y-1/2 rounded-full border border-border bg-background" />
        <span className="absolute -end-3 top-1/2 size-6 -translate-y-1/2 rounded-full border border-border bg-background" />
      </div>

      {/* Milestones */}
      <div className="px-5 py-6 sm:px-7">
        <ol className="relative grid grid-cols-1 gap-5 md:grid-cols-6 md:gap-2">
          {/* Track line (desktop: horizontal, mobile: vertical) */}
          <span className="absolute start-[17px] top-4 bottom-4 w-0.5 rounded-full bg-border md:start-[calc(100%/12)] md:end-[calc(100%/12)] md:top-[17px] md:bottom-auto md:h-0.5 md:w-auto" aria-hidden />
          <span
            className="absolute start-[17px] top-4 w-0.5 rounded-full bg-secondary transition-all duration-700 md:hidden"
            style={{ height: `calc((100% - 2rem) * ${progressPct / 100})` }}
            aria-hidden
          />
          <span
            className="absolute start-[calc(100%/12)] top-[17px] hidden h-0.5 rounded-full bg-secondary transition-all duration-700 md:block"
            style={{ width: `calc((100% - 100%/6) * ${progressPct / 100})` }}
            aria-hidden
          />
          {TRACKING_STEPS.map((step, i) => {
            const Icon = stepIcons[step];
            const done = i < current || (status === "DELIVERED" && i === current);
            const isCurrent = i === current && status !== "DELIVERED";
            const when = reachedAt[step];
            return (
              <li key={step} className="relative flex items-start gap-4 md:flex-col md:items-center md:gap-3 md:text-center" aria-current={isCurrent ? "step" : undefined}>
                <span
                  className={cn(
                    "relative z-10 grid size-9 shrink-0 place-items-center rounded-full border-2 bg-surface transition-colors [&_svg]:size-4",
                    done && "border-secondary bg-secondary text-secondary-foreground",
                    isCurrent && !actionRequired && "border-primary text-accent-text",
                    isCurrent && actionRequired && "border-warning text-warning",
                    !done && !isCurrent && "border-border text-muted-foreground",
                  )}
                >
                  {isCurrent && (
                    <span className={cn("absolute inset-0 animate-pulse-ring rounded-full", actionRequired ? "bg-warning/40" : "bg-primary/40")} aria-hidden />
                  )}
                  {done ? <Check strokeWidth={3} /> : <Icon />}
                </span>
                <span className="flex flex-col gap-0.5 pt-1.5 md:pt-0">
                  <span className={cn("text-body-sm font-medium", !done && !isCurrent && "text-muted-foreground")}>{t(`steps.${step}`)}</span>
                  <span className="text-caption text-muted-foreground">
                    {isCurrent && actionRequired
                      ? t("actionRequired")
                      : when
                        ? format.dateTime(new Date(when), { day: "numeric", month: "short" })
                        : isCurrent
                          ? t("inProgress")
                          : t("pending")}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <footer className="flex items-center justify-between gap-4 border-t border-border bg-surface-sunken/60 px-5 py-3 sm:px-7">
        <span className="text-caption text-muted-foreground">{t("footer")}</span>
        <Barcode value={orderNumber} />
      </footer>
    </article>
  );
}

function Airport({ label, code, city, align = "start" }: { label: string; code: string; city: string; align?: "start" | "end" }) {
  return (
    <div className={cn("flex flex-col", align === "end" && "items-end text-end")}>
      <span className="text-caption text-muted-foreground">{label}</span>
      <span lang="en" className="font-display text-display-lg leading-none font-normal">
        {code}
      </span>
      <span className="text-body-sm text-muted-foreground">{city}</span>
    </div>
  );
}

function Meta({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}

/** Decorative barcode, deterministic per order number. */
function Barcode({ value }: { value: string }) {
  let h = 2166136261;
  const bars: number[] = [];
  for (let i = 0; i < 44; i++) {
    h ^= value.charCodeAt(i % value.length) + i;
    h = Math.imul(h, 16777619) >>> 0;
    bars.push((h % 3) + 1);
  }
  let x = 0;
  return (
    <svg viewBox="0 0 132 28" className="h-7 w-32 text-foreground/80" aria-hidden direction="ltr">
      {bars.map((w, i) => {
        const rect = i % 2 === 0 ? <rect key={i} x={x} y={0} width={w} height={28} fill="currentColor" /> : null;
        x += w;
        return rect;
      })}
    </svg>
  );
}
