"use client";

import { formatMoney, type AppLocale, type CouponView, type ServiceRecord } from "@myvisa/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, TicketPercent } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/choice";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { ApiError, api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "./page-header";
import { useCan, useMutationToasts } from "./use-admin";

type Status = "live" | "scheduled" | "expired" | "off" | "exhausted";

function couponStatus(c: CouponView, now = Date.now()): Status {
  if (!c.isActive) return "off";
  if (c.maxRedemptions !== null && c.redemptions >= c.maxRedemptions) return "exhausted";
  if (c.endsAt && new Date(c.endsAt).getTime() < now) return "expired";
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return "scheduled";
  return "live";
}
const STATUS_TONE: Record<Status, "success" | "info" | "neutral" | "danger" | "warning"> = { live: "success", scheduled: "info", expired: "neutral", off: "neutral", exhausted: "warning" };

export function CouponsView() {
  const t = useTranslations("admin.coupons");
  const tc = useTranslations("admin.common");
  const can = useCan();
  const coupons = useQuery({ queryKey: ["admin", "coupons"], queryFn: () => api<CouponView[]>("/admin/coupons") });
  const [editing, setEditing] = useState<CouponView | "new" | null>(null);
  const writable = can("pricing:write");

  return (
    <>
      <AdminPageHeader
        index="05"
        eyebrow={t("eyebrow")}
        title={t("title")}
        lead={t("lead")}
        actions={
          writable && (
            <Button size="lg" onClick={() => setEditing("new")}>
              <Plus aria-hidden />
              {t("new")}
            </Button>
          )
        }
      />
      {coupons.isError ? (
        <ErrorState icon={<TicketPercent />} title={tc("loadError")} onRetry={() => coupons.refetch()} retryLabel={tc("retry")} />
      ) : !coupons.data ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-56 rounded-[1.75rem]" />
          ))}
        </div>
      ) : !coupons.data.length ? (
        <EmptyState icon={<TicketPercent />} title={t("empty")} description={t("emptyBody")} action={writable && <Button onClick={() => setEditing("new")}>{t("new")}</Button>} />
      ) : (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {coupons.data.map((c, i) => (
              <CouponCard key={c.id} coupon={c} index={i} onEdit={writable ? () => setEditing(c) : undefined} />
            ))}
          </AnimatePresence>
        </ul>
      )}
      <CouponDialog editing={editing} onClose={() => setEditing(null)} />
    </>
  );
}

/** A coupon as a perforated ticket: the code on the stub, value and usage on the body. */
function CouponCard({ coupon, index, onEdit }: { coupon: CouponView; index: number; onEdit?: () => void }) {
  const t = useTranslations("admin.coupons");
  const locale = useLocale() as AppLocale;
  const format = useFormatter();
  const status = couponStatus(coupon);
  const value = coupon.kind === "PERCENT" ? `${coupon.value}%` : formatMoney(coupon.value, locale, { fractionDigits: 0 });
  const usage = coupon.maxRedemptions ? Math.min(1, coupon.redemptions / coupon.maxRedemptions) : null;
  const date = (iso: string) => format.dateTime(new Date(iso), { day: "numeric", month: "short" });
  return (
    <motion.li layout initial={{ opacity: 0, y: 24, rotate: index % 2 ? 1 : -1 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: index * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }} whileHover={{ y: -4 }}>
      <button type="button" disabled={!onEdit} onClick={onEdit} className={cn("group relative flex w-full flex-col overflow-hidden rounded-[1.75rem] border bg-surface text-start shadow-sm transition-shadow hover:shadow-md disabled:cursor-default", status === "live" ? "border-gold-400/50" : "border-border", status === "off" || status === "expired" ? "opacity-70" : "")}>
        <div className={cn("relative flex items-end justify-between gap-3 px-5 pb-4 pt-5", status === "live" ? "bg-gradient-to-br from-gold-100 to-gold-300 text-ink-950 dark:from-gold-400/25 dark:to-gold-400/5 dark:text-foreground" : "bg-surface-sunken")}>
          <div className="flex flex-col gap-1">
            <span lang="en" dir="ltr" className="font-mono text-heading font-bold tracking-[0.15em]">
              {coupon.code}
            </span>
            <Badge tone={STATUS_TONE[status]} dot className="w-fit">
              {t(`status.${status}`)}
            </Badge>
          </div>
          <span lang="en" className={cn("tabular whitespace-nowrap font-display leading-none", coupon.kind === "PERCENT" ? "text-display-lg" : "text-display-md")}>
            {value}
          </span>
        </div>
        <div className="relative" aria-hidden>
          <span className="absolute -start-3 -top-3 size-6 rounded-full border border-border bg-background" />
          <span className="absolute -end-3 -top-3 size-6 rounded-full border border-border bg-background" />
          <span className="mx-5 block border-t-2 border-dashed border-border" />
        </div>
        <div className="flex flex-col gap-3 px-5 pb-5 pt-4 text-body-sm">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-foreground">
            <span>{coupon.serviceSlugs.length ? coupon.serviceSlugs.join(" · ") : t("allServices")}</span>
            {(coupon.startsAt || coupon.endsAt) && (
              <span className="tabular">
                {coupon.startsAt ? date(coupon.startsAt) : "…"} – {coupon.endsAt ? date(coupon.endsAt) : "…"}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>{t("redemptions", { count: coupon.redemptions })}</span>
            <span className="text-caption text-muted-foreground">{t("given", { amount: formatMoney(coupon.discountGivenHalalas, locale, { fractionDigits: 0 }) })}</span>
          </div>
          {usage !== null && (
            <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="presentation">
              <motion.div className="h-full rounded-full bg-secondary" initial={{ width: 0 }} animate={{ width: `${usage * 100}%` }} transition={{ delay: 0.3 + index * 0.05, duration: 0.8 }} />
            </div>
          )}
        </div>
      </button>
    </motion.li>
  );
}

interface Form {
  code: string;
  kind: "PERCENT" | "FIXED";
  value: string;
  maxDiscount: string;
  minOrder: string;
  maxRedemptions: string;
  perUser: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  services: string[];
}

const EMPTY: Form = { code: "", kind: "PERCENT", value: "", maxDiscount: "", minOrder: "", maxRedemptions: "", perUser: "1", startsAt: "", endsAt: "", isActive: true, services: [] };
const riyadhInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + 3 * 3_600_000).toISOString().slice(0, 10) : "");
const sarToHalalas = (v: string) => (v.trim() ? Math.round(Number(v) * 100) : null);

function CouponDialog({ editing, onClose }: { editing: CouponView | "new" | null; onClose: () => void }) {
  const t = useTranslations("admin.coupons");
  const tc = useTranslations("admin.common");
  const te = useTranslations("admin.errors");
  const locale = useLocale() as AppLocale;
  const toasts = useMutationToasts();
  const queryClient = useQueryClient();
  const services = useQuery({ queryKey: ["admin", "services"], queryFn: () => api<ServiceRecord[]>("/admin/services"), enabled: Boolean(editing), staleTime: 5 * 60_000 });
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("");

  useEffect(() => {
    setErrors({});
    setFilter("");
    if (!editing || editing === "new") return setForm(EMPTY);
    setForm({
      code: editing.code,
      kind: editing.kind,
      value: editing.kind === "PERCENT" ? String(editing.value) : (editing.value / 100).toString(),
      maxDiscount: editing.maxDiscountHalalas ? (editing.maxDiscountHalalas / 100).toString() : "",
      minOrder: editing.minOrderHalalas ? (editing.minOrderHalalas / 100).toString() : "",
      maxRedemptions: editing.maxRedemptions?.toString() ?? "",
      perUser: String(editing.perUserLimit),
      startsAt: riyadhInput(editing.startsAt),
      endsAt: riyadhInput(editing.endsAt),
      isActive: editing.isActive,
      services: editing.serviceSlugs,
    });
  }, [editing]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const save = useMutation({
    mutationFn: () => {
      const body = {
        code: form.code,
        kind: form.kind,
        value: form.kind === "PERCENT" ? Number(form.value) : (sarToHalalas(form.value) ?? 0),
        maxDiscountHalalas: form.kind === "PERCENT" ? sarToHalalas(form.maxDiscount) : null,
        minOrderHalalas: sarToHalalas(form.minOrder),
        maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
        perUserLimit: Number(form.perUser || 1),
        startsAt: form.startsAt ? `${form.startsAt}T00:00:00+03:00` : null,
        endsAt: form.endsAt ? `${form.endsAt}T23:59:59+03:00` : null,
        isActive: form.isActive,
        serviceSlugs: form.services,
      };
      return editing && editing !== "new" ? api<CouponView>(`/admin/coupons/${editing.id}`, { method: "PUT", body }) : api<CouponView>("/admin/coupons", { method: "POST", body });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
      toasts.success(t("saved"));
      onClose();
    },
    onError: (e) => {
      if (e instanceof ApiError && e.problem.errors?.length) {
        setErrors(Object.fromEntries(e.problem.errors.map((x) => [x.path.split(".")[0]!, te.has(x.message as "generic") ? te(x.message as "generic") : te("validation_failed")])));
      } else toasts.error(e);
    },
  });

  const visas = useMemo(() => (services.data ?? []).filter((s) => !filter || `${s.slug} ${s.nameAr} ${s.nameEn}`.toLowerCase().includes(filter.toLowerCase())), [services.data, filter]);

  return (
    <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={tc("close")} className="sm:w-[min(42rem,calc(100vw-2rem))]" data-lenis-prevent>
        <DialogTitle className="pe-10">{editing && editing !== "new" ? t("editTitle", { code: editing.code }) : t("newTitle")}</DialogTitle>
        <DialogDescription>{t("lead")}</DialogDescription>
        <form
          className="mt-5 grid gap-4 sm:grid-cols-2"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <Field label={t("code")} error={errors.code}>
            <Input dir="ltr" lang="en" className="font-mono uppercase tracking-widest" value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} maxLength={40} />
          </Field>
          <Field label={t("kind")}>
            <div role="radiogroup" className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
              {(["PERCENT", "FIXED"] as const).map((k) => (
                <button key={k} type="button" role="radio" aria-checked={form.kind === k} onClick={() => set("kind", k)} className={cn("rounded-full px-3 py-2 text-body-sm font-medium", form.kind === k ? "bg-surface shadow-sm" : "text-muted-foreground")}>
                  {t(`kinds.${k}`)}
                </button>
              ))}
            </div>
          </Field>
          <Field label={form.kind === "PERCENT" ? t("valuePercent") : t("valueFixed")} error={errors.value}>
            <Input type="number" inputMode="decimal" dir="ltr" min={0} value={form.value} onChange={(e) => set("value", e.target.value)} />
          </Field>
          {form.kind === "PERCENT" ? (
            <Field label={t("maxDiscount")} optional={tc("optional")}>
              <Input type="number" inputMode="decimal" dir="ltr" min={0} value={form.maxDiscount} onChange={(e) => set("maxDiscount", e.target.value)} />
            </Field>
          ) : (
            <span className="hidden sm:block" />
          )}
          <Field label={t("minOrder")} optional={tc("optional")}>
            <Input type="number" inputMode="decimal" dir="ltr" min={0} value={form.minOrder} onChange={(e) => set("minOrder", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("maxRedemptions")} optional={tc("optional")}>
              <Input type="number" inputMode="numeric" dir="ltr" min={1} value={form.maxRedemptions} onChange={(e) => set("maxRedemptions", e.target.value)} />
            </Field>
            <Field label={t("perUser")}>
              <Input type="number" inputMode="numeric" dir="ltr" min={1} max={100} value={form.perUser} onChange={(e) => set("perUser", e.target.value)} />
            </Field>
          </div>
          <Field label={t("startsAt")} optional={tc("optional")}>
            <Input type="date" dir="ltr" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
          </Field>
          <Field label={t("endsAt")} optional={tc("optional")} error={errors.endsAt}>
            <Input type="date" dir="ltr" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
          </Field>
          <Field label={t("services")} hint={t("servicesHint")} className="sm:col-span-2">
            <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={tc("search")} aria-label={tc("search")} className="h-10" />
            <div className="mt-2 flex max-h-44 flex-wrap gap-1.5 overflow-y-auto rounded-2xl border border-border p-2" data-lenis-prevent>
              {services.isLoading
                ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-8 w-28 rounded-full" />)
                : visas.map((s) => {
                    const on = form.services.includes(s.slug);
                    return (
                      <button key={s.id} type="button" aria-pressed={on} onClick={() => set("services", on ? form.services.filter((x) => x !== s.slug) : [...form.services, s.slug])} className={cn("rounded-full border px-3 py-1.5 text-caption font-medium transition-colors", on ? "border-secondary bg-secondary text-secondary-foreground" : "border-border hover:bg-muted")}>
                        {locale === "ar" ? s.nameAr : s.nameEn}
                        {s.country && <span className="ms-1 opacity-60">· {s.country.iso2}</span>}
                      </button>
                    );
                  })}
            </div>
          </Field>
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3 sm:col-span-2">
            <span className="font-medium">{t("active")}</span>
            <Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
          </label>
          <div className="flex justify-end gap-3 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {tc("cancel")}
            </Button>
            <Button type="submit" loading={save.isPending} disabled={!form.code || !form.value}>
              {tc("save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
