"use client";

import { PERMISSIONS, ROLE_PERMISSIONS, STAFF_ROLES, saudiMobileSchema, type StaffMember } from "@myvisa/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Minus, ShieldCheck, UserPlus } from "lucide-react";
import { motion } from "motion/react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/choice";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { ApiError, api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { initials } from "./orders/use-orders";
import { AdminPageHeader } from "./page-header";
import { useMe, useMutationToasts } from "./use-admin";

const ROLE_TONE = { AGENT: "teal", ACCOUNTANT: "info", MANAGER: "gold", SUPER_ADMIN: "inverse", CUSTOMER: "neutral" } as const;

export function StaffView() {
  const t = useTranslations("admin.staff");
  const tc = useTranslations("admin.common");
  const staff = useQuery({ queryKey: ["admin", "staff"], queryFn: () => api<StaffMember[]>("/admin/staff") });
  const [inviting, setInviting] = useState(false);
  return (
    <>
      <AdminPageHeader
        index="09"
        eyebrow={t("eyebrow")}
        title={t("title")}
        lead={t("lead")}
        actions={
          <Button size="lg" onClick={() => setInviting(true)}>
            <UserPlus aria-hidden />
            {t("invite")}
          </Button>
        }
      />
      {staff.isError ? (
        <ErrorState icon={<ShieldCheck />} title={tc("loadError")} onRetry={() => staff.refetch()} retryLabel={tc("retry")} />
      ) : !staff.data ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-[1.75rem]" />
          ))}
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {staff.data.map((m, i) => (
            <MemberCard key={m.id} member={m} index={i} />
          ))}
        </ul>
      )}
      <PermissionMatrix />
      <InviteDialog open={inviting} onClose={() => setInviting(false)} />
    </>
  );
}

function MemberCard({ member, index }: { member: StaffMember; index: number }) {
  const t = useTranslations("admin.staff");
  const tr = useTranslations("admin.roles");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const { data: me } = useMe();
  const toasts = useMutationToasts();
  const queryClient = useQueryClient();
  const self = me?.id === member.id;
  const update = useMutation({
    mutationFn: (body: { role: string; isActive: boolean }) => api(`/admin/staff/${member.id}`, { method: "PUT", body }),
    onSuccess: () => {
      toasts.success(t("saved"));
      void queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "agents"] });
    },
    onError: toasts.error,
  });
  const name = member.fullNameAr ?? member.fullNameEn ?? member.phone;

  return (
    <motion.li initial={{ opacity: 0, y: 20 }} animate={{ opacity: member.isActive ? 1 : 0.6, y: 0 }} transition={{ delay: index * 0.05, duration: 0.5 }} className={cn("flex flex-col gap-4 rounded-[1.75rem] border bg-surface p-5 shadow-xs", self ? "border-gold-400/60" : "border-border")}>
      <div className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-teal-300 to-teal-700 font-display text-body font-semibold text-white">{initials(name)}</span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-2 truncate font-medium">
            {name}
            {self && <Badge tone="gold">{t("you")}</Badge>}
          </span>
          <span dir="ltr" className="tabular text-caption text-muted-foreground rtl:text-end">
            {member.phone}
          </span>
          <span className="text-caption text-muted-foreground">
            {t("openOrders", { count: member.openOrders })} · {member.lastLoginAt ? t("lastLogin", { when: format.relativeTime(new Date(member.lastLoginAt), now) }) : t("never")}
          </span>
        </div>
        <Badge tone={ROLE_TONE[member.role]}>{tr(member.role)}</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Select value={member.role} onValueChange={(role) => update.mutate({ role, isActive: member.isActive })} disabled={self || update.isPending}>
          <SelectTrigger className="h-10 flex-1" aria-label={t("role")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAFF_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {tr(r)}
              </SelectItem>
            ))}
            <SelectItem value="CUSTOMER">{t("removeFromTeam")}</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-body-sm">
          {t("active")}
          <Switch checked={member.isActive} disabled={self || update.isPending} onCheckedChange={(isActive) => update.mutate({ role: member.role, isActive })} />
        </label>
      </div>
    </motion.li>
  );
}

/** Who can do what, straight from the shared matrix the API enforces. */
function PermissionMatrix() {
  const t = useTranslations("admin.staff");
  const tr = useTranslations("admin.roles");
  return (
    <section className="mt-12">
      <h2 className="mb-4 font-display text-heading">{t("matrix")}</h2>
      <div data-lenis-prevent className="overflow-x-auto rounded-[1.75rem] border border-border bg-surface">
        <table className="w-full min-w-[40rem] text-body-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3" />
              {STAFF_ROLES.map((r) => (
                <th key={r} className="px-4 py-3 text-center font-medium">
                  {tr(r)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((p, i) => (
              <tr key={p} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 text-muted-foreground">{t(`permissions.${p}`)}</td>
                {STAFF_ROLES.map((r) => {
                  const has = ROLE_PERMISSIONS[r].includes(p);
                  return (
                    <td key={r} className="px-4 py-2.5 text-center">
                      <motion.span initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.02, type: "spring", stiffness: 400, damping: 20 }} className={cn("inline-grid size-6 place-items-center rounded-full", has ? "bg-secondary text-secondary-foreground" : "text-border-strong")}>
                        {has ? <Check className="size-3.5" strokeWidth={3} aria-label="✓" /> : <Minus className="size-3.5" aria-label="—" />}
                      </motion.span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("admin.staff");
  const tr = useTranslations("admin.roles");
  const tc = useTranslations("admin.common");
  const te = useTranslations("admin.errors");
  const toasts = useMutationToasts();
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<(typeof STAFF_ROLES)[number]>("AGENT");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const invite = useMutation({
    mutationFn: (normalized: string) => api<StaffMember>("/admin/staff", { method: "POST", body: { phone: normalized, role, fullNameAr: nameAr || null, fullNameEn: nameEn || null, email: email || null } }),
    onSuccess: () => {
      toasts.success(t("invited"));
      void queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
      setPhone("");
      setNameAr("");
      setNameEn("");
      setEmail("");
      onClose();
    },
    onError: (e) => {
      if (e instanceof ApiError && e.problem.errors?.length) setErrors(Object.fromEntries(e.problem.errors.map((x) => [x.path, te.has(x.message as "generic") ? te(x.message as "generic") : te("validation_failed")])));
      else toasts.error(e);
    },
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={tc("close")}>
        <DialogTitle className="pe-10">{t("inviteTitle")}</DialogTitle>
        <DialogDescription>{t("inviteLead")}</DialogDescription>
        <form
          noValidate
          className="mt-5 grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = saudiMobileSchema.safeParse(phone);
            if (!parsed.success) return setErrors({ phone: te("invalid_saudi_mobile") });
            setErrors({});
            invite.mutate(parsed.data);
          }}
        >
          <Field label={t("phone")} error={errors.phone} className="sm:col-span-2">
            <PhoneInput value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label={t("role")} className="sm:col-span-2">
            <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAFF_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {tr(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("nameAr")} optional={tc("optional")}>
            <Input dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} maxLength={120} />
          </Field>
          <Field label={t("nameEn")} optional={tc("optional")}>
            <Input dir="ltr" value={nameEn} onChange={(e) => setNameEn(e.target.value)} maxLength={120} />
          </Field>
          <Field label={t("email")} optional={tc("optional")} error={errors.email} className="sm:col-span-2">
            <Input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-3 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {tc("cancel")}
            </Button>
            <Button type="submit" loading={invite.isPending}>
              {t("invite")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
