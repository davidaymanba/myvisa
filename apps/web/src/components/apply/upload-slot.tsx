"use client";

import type { AppLocale, OrderDocumentView, OrderRequirementView, PresignResult } from "@myvisa/shared";
import { Camera, CheckCircle2, Eye, FileText, LoaderCircle, RotateCcw, ShieldAlert, Trash2, UploadCloud } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useRef, useState, type DragEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { putWithProgress, useApplyError } from "./use-apply";

const LABEL: Record<string, string> = { "application/pdf": "PDF", "image/jpeg": "JPG", "image/png": "PNG", "image/heic": "HEIC", "image/webp": "WEBP" };

interface Pending {
  name: string;
  pct: number;
  error?: string;
  file: File;
}

/** One requirement for one traveller (or the whole order): drop, browse or shoot, with progress and scan status. */
export function UploadSlot({ orderId, requirement, travelerId, documents, onChanged, index }: { orderId: string; requirement: OrderRequirementView; travelerId: string | null; documents: OrderDocumentView[]; onChanged: () => void; index: number }) {
  const t = useTranslations("apply.documents");
  const te = useTranslations("apply.errors");
  const problem = useApplyError();
  const locale = useLocale() as AppLocale;
  const inputId = useId();
  const cameraRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<Pending[]>([]);

  const done = documents.some((d) => d.document.uploaded && d.document.scanStatus === "CLEAN");
  const types = requirement.acceptedMime.map((m) => LABEL[m] ?? m).join(" · ");

  const upload = async (file: File) => {
    if (!requirement.acceptedMime.includes(file.type)) return setPending((p) => [...p, { name: file.name, pct: 0, error: te("file_type"), file }]);
    if (file.size > requirement.maxSizeMb * 1024 * 1024) return setPending((p) => [...p, { name: file.name, pct: 0, error: te("file_size"), file }]);
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    const update = (patch: Partial<Pending>) => setPending((p) => p.map((x) => (`${x.name}-${x.file.size}-${x.file.lastModified}` === key ? { ...x, ...patch } : x)));
    setPending((p) => [...p.filter((x) => `${x.name}-${x.file.size}-${x.file.lastModified}` !== key), { name: file.name, pct: 0, file }]);
    try {
      const presign = await api<PresignResult>(`/orders/${orderId}/documents`, { method: "POST", body: { requirementId: requirement.id, orderTravelerId: travelerId, fileName: file.name, mimeType: file.type, sizeBytes: file.size } });
      await putWithProgress(presign.uploadUrl, presign.headers, file, (pct) => update({ pct }));
      await api(`/order-documents/${presign.id}/complete`, { method: "POST" });
      setPending((p) => p.filter((x) => `${x.name}-${x.file.size}-${x.file.lastModified}` !== key));
      onChanged();
    } catch (e) {
      update({ error: e instanceof Error && e.message.startsWith("upload") ? te("upload_failed") : problem(e) });
    }
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    for (const f of Array.from(list)) void upload(f);
  };

  const remove = async (id: string) => {
    await api(`/order-documents/${id}`, { method: "DELETE" }).catch(() => undefined);
    onChanged();
  };
  const view = async (id: string) => {
    const { url } = await api<{ url: string }>(`/order-documents/${id}/url`);
    window.open(url, "_blank", "noopener");
  };

  return (
    <motion.li layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04, duration: 0.45, ease: [0.16, 1, 0.3, 1] }} className={cn("list-none rounded-[1.5rem] border bg-surface p-4 shadow-xs transition-colors sm:p-5", done ? "border-success/40" : "border-border")}>
      <div className="flex items-start gap-4">
        <motion.span key={String(done)} initial={{ scale: 0.6, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 400, damping: 18 }} className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", done ? "bg-success text-white" : "bg-muted text-secondary-text")}>
          {done ? <CheckCircle2 className="size-5" aria-hidden /> : <FileText className="size-5" aria-hidden />}
        </motion.span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{requirement.title[locale]}</span>
            <Badge tone={requirement.isRequired ? "neutral" : "outline"}>{requirement.isRequired ? t("required") : t("optional")}</Badge>
          </div>
          {requirement.details && <p className="text-body-sm text-muted-foreground">{requirement.details[locale]}</p>}
        </div>
      </div>

      <ul className="mt-3 flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {documents.filter((d) => d.document.uploaded).map((d) => (
            <motion.li key={d.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-3 rounded-xl bg-surface-sunken/70 px-3 py-2 text-body-sm">
              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate" dir="auto">
                {d.document.originalName}
              </span>
              <ScanChip status={d.document.scanStatus} />
              {d.document.scanStatus === "CLEAN" && (
                <button type="button" onClick={() => view(d.id)} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={t("view")}>
                  <Eye className="size-4" aria-hidden />
                </button>
              )}
              <button type="button" onClick={() => remove(d.id)} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label={t("remove")}>
                <Trash2 className="size-4" aria-hidden />
              </button>
            </motion.li>
          ))}
          {pending.map((p) => (
            <motion.li key={`p-${p.name}-${p.file.size}`} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="relative flex items-center gap-3 overflow-hidden rounded-xl bg-surface-sunken/70 px-3 py-2 text-body-sm">
              {!p.error && <motion.span aria-hidden className="absolute inset-y-0 start-0 bg-secondary/15" animate={{ width: `${p.pct}%` }} transition={{ ease: "easeOut" }} />}
              <span className="relative min-w-0 flex-1 truncate" dir="auto">
                {p.name}
              </span>
              {p.error ? (
                <>
                  <span className="relative text-caption font-medium text-danger">{p.error}</span>
                  <button type="button" className="relative grid size-8 place-items-center rounded-lg hover:bg-muted" onClick={() => upload(p.file)} aria-label={t("retry")}>
                    <RotateCcw className="size-4" aria-hidden />
                  </button>
                </>
              ) : (
                <span className="relative tabular text-caption text-secondary-text">{t("uploading", { pct: p.pct })}</span>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <div className="mt-3 flex gap-2">
        <label
          htmlFor={inputId}
          onDragOver={(e) => (e.preventDefault(), setDragging(true))}
          onDragLeave={() => setDragging(false)}
          onDrop={(e: DragEvent<HTMLLabelElement>) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-body-sm transition-all has-[input:focus-visible]:ring-4 has-[input:focus-visible]:ring-ring/15",
            dragging ? "scale-[1.01] border-secondary bg-secondary/[0.06]" : "border-border-strong/70 hover:border-secondary-text/60 hover:bg-secondary/[0.03]",
          )}
        >
          <UploadCloud className={cn("size-4 text-secondary-text transition-transform", dragging && "-translate-y-0.5 scale-110")} aria-hidden />
          <span>
            {t("drop")} <span className="font-medium text-secondary-text underline underline-offset-4">{t("browse")}</span>
          </span>
          <span className="hidden text-caption text-muted-foreground sm:inline">· {t("accepted", { types, size: requirement.maxSizeMb })}</span>
          <input id={inputId} type="file" multiple accept={requirement.acceptedMime.join(",")} className="sr-only" onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />
        </label>
        <button type="button" onClick={() => cameraRef.current?.click()} className="hidden items-center gap-2 rounded-xl border border-border px-4 text-body-sm font-medium hover:bg-muted [@media(pointer:coarse)]:inline-flex" aria-label={t("camera")}>
          <Camera className="size-4" aria-hidden />
        </button>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" tabIndex={-1} onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />
      </div>
    </motion.li>
  );
}

function ScanChip({ status }: { status: OrderDocumentView["document"]["scanStatus"] }) {
  const t = useTranslations("apply.documents");
  if (status === "CLEAN") return <Badge tone="success">{t("clean")}</Badge>;
  if (status === "INFECTED" || status === "FAILED")
    return (
      <Badge tone="danger">
        <ShieldAlert aria-hidden />
        {t("infected")}
      </Badge>
    );
  return (
    <Badge tone="info">
      <LoaderCircle className="animate-spin" aria-hidden />
      {t("scanning")}
    </Badge>
  );
}
