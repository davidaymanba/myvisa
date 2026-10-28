"use client";

import type { AppLocale, OrderView } from "@myvisa/shared";
import { Camera, Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { UploadSlot } from "./upload-slot";

/** Required + optional uploads, grouped per traveller, then the order-level ones. */
export function StepDocuments({ order, onChanged }: { order: OrderView; onChanged: () => void }) {
  const t = useTranslations("apply.documents");
  const locale = useLocale() as AppLocale;
  const perOrder = order.requirements.filter((r) => !r.perTraveler);
  const remaining = countRemaining(order);
  let slot = 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface-sunken/60 px-4 py-3">
        <p className="flex items-center gap-2 text-body-sm text-muted-foreground">
          <Lock className="size-4 shrink-0 text-secondary-text" aria-hidden />
          {t("privacy")}
        </p>
        <span className="tabular rounded-full bg-foreground px-3 py-1 text-caption font-medium text-background">{t("remaining", { count: remaining })}</span>
      </div>

      {order.requirements.some((r) => r.documentType === "PERSONAL_PHOTO") && (
        <aside className="grid gap-4 rounded-[1.75rem] border border-gold-400/40 bg-gold-100/40 p-5 dark:bg-gold-400/5 sm:grid-cols-[auto_1fr]">
          <span className="grid size-12 place-items-center rounded-2xl bg-gold-400 text-ink-950">
            <Camera className="size-5" aria-hidden />
          </span>
          <div>
            <h3 className="font-medium">{t("photoGuide.title")}</h3>
            <ul className="mt-2 grid gap-1.5 text-body-sm text-foreground/80 sm:grid-cols-2">
              {(t.raw("photoGuide.items") as string[]).map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="size-1.5 shrink-0 rounded-full bg-gold-500" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      )}

      {order.travelers.map((traveler) => {
        const reqs = order.requirements.filter((r) => r.perTraveler && (!r.applicantType || r.applicantType === traveler.applicantType));
        return (
          <section key={traveler.id} className="flex flex-col gap-3">
            <h3 className="flex items-center gap-3 font-display text-heading">
              <span className="grid size-9 place-items-center rounded-full bg-foreground font-sans text-body-sm text-background">{(traveler.givenNameEn[0] ?? "?").toUpperCase()}</span>
              {t("forTraveler", { name: locale === "ar" && traveler.fullNameAr ? traveler.fullNameAr : `${traveler.givenNameEn} ${traveler.surnameEn}` })}
            </h3>
            <ol className="flex flex-col gap-3">
              {reqs.map((r) => (
                <UploadSlot key={r.id} index={slot++} orderId={order.id} requirement={r} travelerId={traveler.id} documents={order.documents.filter((d) => d.requirementId === r.id && d.orderTravelerId === traveler.id)} onChanged={onChanged} />
              ))}
            </ol>
          </section>
        );
      })}

      {perOrder.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="font-display text-heading">{t("forOrder")}</h3>
          <ol className="flex flex-col gap-3">
            {perOrder.map((r) => (
              <UploadSlot key={r.id} index={slot++} orderId={order.id} requirement={r} travelerId={null} documents={order.documents.filter((d) => d.requirementId === r.id && !d.orderTravelerId)} onChanged={onChanged} />
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

/** Required slots still missing a clean upload (mirrors the API's completeness rule). */
export function countRemaining(order: OrderView): number {
  const ok = (rid: string, tid: string | null) => order.documents.some((d) => d.requirementId === rid && d.orderTravelerId === tid && d.document.uploaded && d.document.scanStatus === "CLEAN");
  let n = 0;
  for (const r of order.requirements.filter((x) => x.isRequired)) {
    if (r.perTraveler) {
      for (const t of order.travelers) if ((!r.applicantType || r.applicantType === t.applicantType) && !ok(r.id, t.id)) n++;
    } else if (!ok(r.id, null)) n++;
  }
  return n;
}
