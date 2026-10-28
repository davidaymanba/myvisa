"use client";

import { APPOINTMENT_CITIES, VISA_CENTERS, formatMoney, type AdminOrderDetail, type AppLocale, type OrderDocumentView } from "@myvisa/shared";
import { Check, Eye, FileText, LoaderCircle, Package, ReceiptText, StickyNote, Undo2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { useCan } from "../use-admin";
import { initials, useDeskMutation } from "./use-orders";

export function Panel({ icon, title, lead, children, className, action, id }: { icon: ReactNode; title: string; lead?: string; children: ReactNode; className?: string; action?: ReactNode; id?: string }) {
  return (
    <motion.section id={id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className={cn("rounded-[1.75rem] border border-border bg-surface p-5 shadow-xs sm:p-6", className)}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-foreground text-background [&_svg]:size-4">{icon}</span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="font-display text-title">{title}</h2>
            {lead && <p className="text-caption text-muted-foreground">{lead}</p>}
          </div>
        </div>
        {action}
      </header>
      {children}
    </motion.section>
  );
}

const REVIEWABLE = ["RECEIVED", "DOCUMENTS_REVIEW", "ACTION_REQUIRED"];

/** Every uploaded file, grouped by traveller and requirement, with approve / reject-with-reason in place. */
export function DocumentReview({ desk }: { desk: AdminOrderDetail }) {
  const t = useTranslations("admin.desk");
  const locale = useLocale() as AppLocale;
  const can = useCan();
  const { order } = desk;
  const editable = can("orders:write") && REVIEWABLE.includes(order.status);
  const groups = [...order.travelers.map((tr) => ({ key: tr.id as string | null, title: `${tr.givenNameEn} ${tr.surnameEn}`, applicant: tr.applicantType })), { key: null, title: t("forOrder"), applicant: null }];

  return (
    <Panel icon={<FileText />} title={t("documents")} lead={t("documentsLead")}>
      <div className="flex flex-col gap-5">
        {groups.map((g) => {
          const reqs = order.requirements.filter((r) => (g.key ? r.perTraveler && (!r.applicantType || r.applicantType === g.applicant) : !r.perTraveler));
          if (!reqs.length) return null;
          return (
            <div key={g.key ?? "order"} className="flex flex-col gap-2">
              <h3 lang={g.key ? "en" : undefined} className="eyebrow text-muted-foreground">
                {g.title}
              </h3>
              <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border">
                {reqs.map((r) => {
                  const docs = order.documents.filter((d) => d.requirementId === r.id && d.orderTravelerId === g.key && d.document.uploaded);
                  return (
                    <li key={r.id} className="flex flex-col gap-2 px-3 py-3 sm:px-4">
                      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                        <span className="text-body-sm font-medium">
                          {r.title[locale]}
                          {r.isRequired && <span className="ms-1 text-danger">*</span>}
                        </span>
                        {!docs.length && <span className="text-caption text-muted-foreground">{t("noDocs")}</span>}
                      </div>
                      {docs.map((d) => (
                        <ReviewRow key={d.id} orderId={order.id} doc={d} editable={editable} />
                      ))}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function ReviewRow({ orderId, doc, editable }: { orderId: string; doc: OrderDocumentView; editable: boolean }) {
  const t = useTranslations("admin.desk");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const review = useDeskMutation(orderId, (body: { status: "APPROVED" | "REJECTED"; reason: string | null }) => api(`/admin/order-documents/${doc.id}/review`, { method: "POST", body }));
  const open = async () => {
    const { url } = await api<{ url: string }>(`/order-documents/${doc.id}/url`);
    window.open(url, "_blank", "noopener");
  };
  const clean = doc.document.scanStatus === "CLEAN";
  const tone = doc.reviewStatus === "APPROVED" ? "success" : doc.reviewStatus === "REJECTED" ? "danger" : "info";

  return (
    <div className={cn("flex flex-col gap-2 rounded-xl px-3 py-2", doc.reviewStatus === "REJECTED" ? "bg-danger-soft/50" : doc.reviewStatus === "APPROVED" ? "bg-success-soft/40" : "bg-surface-sunken/70")}>
      <div className="flex flex-wrap items-center gap-2 text-body-sm">
        <span className="min-w-0 flex-1 truncate" dir="auto">
          {doc.document.originalName}
        </span>
        {!clean ? (
          <Badge tone="info">
            <LoaderCircle className="animate-spin" aria-hidden />
            {t("scanning")}
          </Badge>
        ) : (
          <Badge tone={tone}>{t(doc.reviewStatus === "APPROVED" ? "approved" : doc.reviewStatus === "REJECTED" ? "rejected" : "pending")}</Badge>
        )}
        {clean && (
          <Button variant="ghost" size="icon-sm" onClick={() => void open()} aria-label={t("view")} title={t("view")}>
            <Eye aria-hidden />
          </Button>
        )}
        {editable && clean && (
          <>
            <Button variant="ghost" size="icon-sm" className="text-success hover:bg-success-soft" disabled={doc.reviewStatus === "APPROVED" || review.isPending} onClick={() => review.mutate({ status: "APPROVED", reason: null })} aria-label={t("approve")} title={t("approve")}>
              <Check aria-hidden />
            </Button>
            <Button variant="ghost" size="icon-sm" className="text-danger hover:bg-danger-soft" disabled={review.isPending} onClick={() => setRejecting((v) => !v)} aria-label={t("reject")} title={t("reject")}>
              <X aria-hidden />
            </Button>
          </>
        )}
      </div>
      {doc.reviewStatus === "REJECTED" && doc.rejectionReason && !rejecting && <p className="text-caption text-danger">{doc.rejectionReason}</p>}
      <AnimatePresence>
        {rejecting && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (reason.trim()) review.mutate({ status: "REJECTED", reason: reason.trim() }, { onSuccess: () => (setRejecting(false), setReason("")) });
            }}
          >
            <Input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("rejectReason")} aria-label={t("rejectReason")} maxLength={300} dir="auto" className="h-10 min-w-0" />
            <Button type="submit" variant="danger" size="sm" className="h-10 shrink-0" disabled={!reason.trim()} loading={review.isPending}>
              {t("rejectConfirm")}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Riyadh wall-clock "YYYY-MM-DDTHH:mm" ⇄ ISO with +03:00. */
const toLocalInput = (iso: string) => new Date(new Date(iso).getTime() + 3 * 3_600_000).toISOString().slice(0, 16);

export function AppointmentPanel({ desk }: { desk: AdminOrderDetail }) {
  const t = useTranslations("admin.desk");
  const can = useCan();
  const current = desk.timeline.appointment;
  const cityKey = (APPOINTMENT_CITIES as readonly string[]).find((c) => c.toLowerCase() === current?.city.toLowerCase()) ?? desk.order.preferredCity ?? "RIYADH";
  const [center, setCenter] = useState(current?.center ?? "VFS_GLOBAL");
  const [city, setCity] = useState<string>(cityKey);
  const [when, setWhen] = useState(current ? toLocalInput(current.scheduledAt) : "");
  const [reference, setReference] = useState(current?.reference ?? "");
  const save = useDeskMutation(desk.order.id, () => api(`/admin/orders/${desk.order.id}/appointment`, { method: "PUT", body: { center, city, scheduledAt: `${when}:00+03:00`, reference: reference || null } }), t("saved"));
  const readOnly = !can("orders:write");

  return (
    <Panel icon={<Package />} title={t("appointment")} lead={t("appointmentLead")}>
      <form
        className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (when) save.mutate(undefined);
        }}
      >
        <Field label={t("center")}>
          <Select value={center} onValueChange={setCenter} disabled={readOnly}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VISA_CENTERS.map((c) => (
                <SelectItem key={c} value={c}>
                  {t(`centers.${c}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("city")}>
          <Select value={city} onValueChange={setCity} disabled={readOnly}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {APPOINTMENT_CITIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {t(`cities.${c}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("when")}>
          <Input type="datetime-local" dir="ltr" value={when} onChange={(e) => setWhen(e.target.value)} disabled={readOnly} required />
        </Field>
        <Field label={t("reference")}>
          <Input dir="ltr" value={reference} onChange={(e) => setReference(e.target.value)} disabled={readOnly} maxLength={60} />
        </Field>
        {!readOnly && (
          <Button type="submit" variant="secondary" className="sm:col-span-2 sm:justify-self-end" loading={save.isPending} disabled={!when}>
            {t("saveAppointment")}
          </Button>
        )}
      </form>
    </Panel>
  );
}

export function ShippingPanel({ desk }: { desk: AdminOrderDetail }) {
  const t = useTranslations("admin.desk");
  const can = useCan();
  const [direction, setDirection] = useState<"PICKUP" | "DELIVERY">("DELIVERY");
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const add = useDeskMutation(desk.order.id, () => api(`/admin/orders/${desk.order.id}/shipments`, { method: "POST", body: { direction, carrier, trackingNumber: tracking || null } }), t("saved"));
  return (
    <Panel icon={<Package />} title={t("shipping")}>
      {desk.timeline.shipments.length > 0 && (
        <ul className="mb-4 flex flex-col gap-2">
          {desk.timeline.shipments.map((s, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-sunken/70 px-3 py-2 text-body-sm">
              <span className="font-medium">{t(`directions.${s.direction}`)}</span>
              <span className="text-muted-foreground">{s.carrier}</span>
              {s.trackingNumber && (
                <span dir="ltr" className="font-mono text-caption">
                  {s.trackingNumber}
                </span>
              )}
              <Badge tone={s.status === "DELIVERED" ? "success" : s.status === "FAILED" ? "danger" : "info"} className="ms-auto">
                {t(`shipmentStatuses.${s.status}`)}
              </Badge>
            </li>
          ))}
        </ul>
      )}
      {can("orders:write") && (
        <form
          className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (carrier.trim()) add.mutate(undefined, { onSuccess: () => (setCarrier(""), setTracking("")) });
          }}
        >
          <Field label={t("direction")}>
            <Select value={direction} onValueChange={(v) => setDirection(v as typeof direction)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["DELIVERY", "PICKUP"] as const).map((d) => (
                  <SelectItem key={d} value={d}>
                    {t(`directions.${d}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("carrier")}>
            <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} maxLength={60} />
          </Field>
          <Field label={t("tracking")}>
            <Input dir="ltr" value={tracking} onChange={(e) => setTracking(e.target.value)} maxLength={60} />
          </Field>
          <Button type="submit" variant="outline" disabled={!carrier.trim()} loading={add.isPending}>
            {t("addShipment")}
          </Button>
        </form>
      )}
    </Panel>
  );
}

export function NotesPanel({ desk }: { desk: AdminOrderDetail }) {
  const t = useTranslations("admin.desk");
  const format = useFormatter();
  const can = useCan();
  const [body, setBody] = useState("");
  const add = useDeskMutation(desk.order.id, async () => {
    await api(`/admin/orders/${desk.order.id}/notes`, { method: "POST", body: { body } });
    return api<AdminOrderDetail>(`/admin/orders/${desk.order.id}`);
  });
  return (
    <Panel icon={<StickyNote />} title={t("notes")} lead={t("notesLead")} className="bg-gold-50/60 dark:bg-gold-400/[0.05]">
      {can("orders:write") && (
        <form
          className="mb-4 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (body.trim()) add.mutate(undefined, { onSuccess: () => setBody("") });
          }}
        >
          <Textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("notePlaceholder")} aria-label={t("notePlaceholder")} maxLength={4000} dir="auto" />
          <Button type="submit" size="sm" variant="ink" className="self-end" disabled={!body.trim()} loading={add.isPending}>
            {t("addNote")}
          </Button>
        </form>
      )}
      {desk.notes.length ? (
        <ul className="flex flex-col gap-3">
          {desk.notes.map((n) => (
            <li key={n.id} className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-teal-300 to-teal-700 text-[0.65rem] font-semibold text-white">{initials(n.author.name)}</span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-caption text-muted-foreground">
                  <span className="font-medium text-foreground">{n.author.name}</span> · {format.dateTime(new Date(n.createdAt), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                </span>
                <p className="whitespace-pre-wrap text-body-sm" dir="auto">
                  {n.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-caption text-muted-foreground">{t("noNotes")}</p>
      )}
    </Panel>
  );
}

export function PaymentsPanel({ desk }: { desk: AdminOrderDetail }) {
  const t = useTranslations("admin.desk");
  const locale = useLocale() as AppLocale;
  const format = useFormatter();
  const can = useCan();
  const money = (h: number) => formatMoney(h, locale, { fractionDigits: 2 });
  const [refunding, setRefunding] = useState<AdminOrderDetail["payments"][number] | null>(null);
  return (
    <Panel icon={<ReceiptText />} title={t("payments")}>
      <ul className="flex flex-col gap-3">
        {desk.payments.map((p) => {
          const refundable = p.amountHalalas - p.refundedHalalas;
          return (
            <li key={p.id} className="flex flex-col gap-2 rounded-2xl border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="tabular font-display text-heading">{money(p.amountHalalas)}</span>
                <Badge tone={p.status === "PAID" ? "success" : p.status === "FAILED" ? "danger" : p.status.includes("REFUNDED") ? "warning" : "neutral"}>{p.status}</Badge>
                <span className="ms-auto text-caption text-muted-foreground" dir="ltr">
                  {p.provider.toUpperCase()} {p.method ?? ""} {p.cardLast4 ? `•••• ${p.cardLast4}` : ""}
                </span>
              </div>
              {p.paidAt && <span className="text-caption text-muted-foreground">{format.dateTime(new Date(p.paidAt), { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}</span>}
              {p.refunds.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-warning-soft/60 px-3 py-2 text-caption">
                  <Undo2 className="size-3.5 text-warning" aria-hidden />
                  <span className="tabular font-medium">{money(r.amountHalalas)}</span>
                  <span className="min-w-0 flex-1 truncate">{r.reason}</span>
                  <Badge tone={r.status === "COMPLETED" ? "success" : r.status === "FAILED" ? "danger" : "info"}>{t(`refundStatuses.${r.status}`)}</Badge>
                  {r.creditNoteId && (
                    <Link href={`/admin/invoices/${r.creditNoteId}`} className="font-medium text-secondary-text hover:underline">
                      {t("creditNote")}
                    </Link>
                  )}
                </div>
              ))}
              {can("payments:refund") && refundable > 0 && (p.status === "PAID" || p.status === "PARTIALLY_REFUNDED") && (
                <Button variant="outline" size="sm" className="self-start" onClick={() => setRefunding(p)}>
                  <Undo2 aria-hidden />
                  {t("refund")}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {desk.invoices.length > 0 && (
        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
          <span className="eyebrow text-muted-foreground">{t("invoices")}</span>
          {desk.invoices.map((inv) => (
            <Link key={inv.id} href={`/admin/invoices/${inv.id}`} className="flex items-center justify-between rounded-xl px-3 py-2 text-body-sm hover:bg-muted">
              <span lang="en" dir="ltr" className="font-mono">
                {inv.number}
              </span>
              <span className="tabular">{money(inv.totalHalalas)}</span>
            </Link>
          ))}
        </div>
      )}
      <RefundDialog orderId={desk.order.id} payment={refunding} onClose={() => setRefunding(null)} />
    </Panel>
  );
}

function RefundDialog({ orderId, payment, onClose }: { orderId: string; payment: AdminOrderDetail["payments"][number] | null; onClose: () => void }) {
  const t = useTranslations("admin.desk");
  const tc = useTranslations("admin.common");
  const locale = useLocale() as AppLocale;
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const refundable = payment ? payment.amountHalalas - payment.refundedHalalas : 0;
  const halalas = Math.round(Number(amount) * 100);
  const valid = halalas > 0 && halalas <= refundable && reason.trim().length >= 3;
  const refund = useDeskMutation(orderId, () => api<AdminOrderDetail>(`/admin/orders/${orderId}/refunds`, { method: "POST", body: { paymentId: payment!.id, amountHalalas: halalas, reason: reason.trim() } }), t("refundDone"));
  return (
    <Dialog open={Boolean(payment)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={tc("close")}>
        <DialogTitle className="pe-10">{t("refundTitle")}</DialogTitle>
        <DialogDescription>{t("refundLead")}</DialogDescription>
        <form
          className="mt-5 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) refund.mutate(undefined, { onSuccess: () => (onClose(), setAmount(""), setReason("")) });
          }}
        >
          <Field label={t("amount")} hint={t("refundable", { amount: formatMoney(refundable, locale, { fractionDigits: 2 }) })}>
            <div className="flex gap-2">
              <Input type="number" inputMode="decimal" min={0.01} step={0.01} dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <Button type="button" variant="outline" onClick={() => setAmount((refundable / 100).toFixed(2))}>
                100%
              </Button>
            </div>
          </Field>
          <Field label={t("reason")}>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} dir="auto" />
          </Field>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              {tc("cancel")}
            </Button>
            <Button type="submit" variant="danger" disabled={!valid} loading={refund.isPending}>
              {t("refundConfirm")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
