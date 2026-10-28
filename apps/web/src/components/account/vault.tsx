"use client";

import { DOCUMENT_TYPES, VAULT_MAX_MB, VAULT_MIME, type SavedTravelerView, type VaultDocumentView, type VaultPresignResult } from "@myvisa/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, FileImage, FileLock2, FileText, LoaderCircle, ShieldAlert, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { putWithProgress } from "@/components/apply/use-apply";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { AccountHeader, LoadError } from "./page-header";
import { accountKeys, daysUntil, useErrorToast, useRefreshAccount, useTravelers, useVault } from "./use-account";

const GENERAL = "general";

export const fileSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

/** Opens a short-lived signed URL in a new tab. */
export async function openVaultFile(id: string) {
  const { url } = await api<{ url: string }>(`/me/documents/${id}/url`);
  window.open(url, "_blank", "noopener");
}

export function ScanBadge({ status }: { status: VaultDocumentView["scanStatus"] }) {
  const t = useTranslations("apply.documents");
  if (status === "CLEAN")
    return (
      <Badge tone="success">
        <ShieldCheck aria-hidden />
        {t("clean")}
      </Badge>
    );
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

export function VaultPage() {
  const t = useTranslations("account.documents");
  const vault = useVault();
  const travelers = useTravelers();
  const [filter, setFilter] = useState<string>("all");
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState<VaultDocumentView | null>(null);

  const owners = useMemo(() => {
    const ids = new Set(vault.data?.map((d) => d.travelerId ?? GENERAL));
    return [...(travelers.data ?? []).filter((tr) => ids.has(tr.id)), ...(ids.has(GENERAL) ? [GENERAL] : [])];
  }, [vault.data, travelers.data]);
  const shown = vault.data?.filter((d) => filter === "all" || (d.travelerId ?? GENERAL) === filter) ?? [];

  return (
    <>
      <AccountHeader
        page={4}
        eyebrow={t("eyebrow")}
        title={t("title")}
        lead={t("lead")}
        actions={
          <Button size="lg" onClick={() => setUploading(true)}>
            <UploadCloud aria-hidden />
            {t("upload")}
          </Button>
        }
      />

      {vault.isError ? (
        <LoadError onRetry={() => vault.refetch()} />
      ) : vault.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-44 rounded-3xl" />
          ))}
        </div>
      ) : !vault.data?.length ? (
        <EmptyState
          icon={<FileLock2 />}
          title={t("empty")}
          description={t("emptyLead")}
          action={
            <Button onClick={() => setUploading(true)}>
              <UploadCloud aria-hidden />
              {t("upload")}
            </Button>
          }
        />
      ) : (
        <>
          {owners.length > 1 && (
            <div className="mb-6 flex flex-wrap gap-2" role="tablist">
              {["all", ...owners].map((o) => {
                const label = o === "all" ? t("filters.all") : o === GENERAL ? t("general") : (o as SavedTravelerView).givenNameEn;
                const key = typeof o === "string" ? o : o.id;
                const active = filter === key;
                return (
                  <button key={key} type="button" role="tab" aria-selected={active} onClick={() => setFilter(key)} className={cn("relative rounded-full px-4 py-2 text-body-sm font-medium transition-colors", active ? "text-background" : "text-muted-foreground hover:text-foreground")}>
                    {active && <motion.span layoutId="vault-filter" className="absolute inset-0 -z-10 rounded-full bg-foreground" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                    <span lang={typeof o === "string" ? undefined : "en"}>{label}</span>
                  </button>
                );
              })}
            </div>
          )}
          <motion.ul layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {shown.map((d, i) => (
                <DocumentCard key={d.id} doc={d} index={i} owner={travelers.data?.find((tr) => tr.id === d.travelerId)} onRemove={() => setRemoving(d)} />
              ))}
            </AnimatePresence>
          </motion.ul>
        </>
      )}

      <UploadDialog open={uploading} onClose={() => setUploading(false)} travelers={travelers.data ?? []} />
      <RemoveDialog doc={removing} onClose={() => setRemoving(null)} />
    </>
  );
}

function DocumentCard({ doc, index, owner, onRemove }: { doc: VaultDocumentView; index: number; owner?: SavedTravelerView; onRemove: () => void }) {
  const t = useTranslations("account.documents");
  const tc = useTranslations("account.common");
  const ta = useTranslations("apply.documents");
  const format = useFormatter();
  const image = doc.mimeType.startsWith("image/");
  const Icon = image ? FileImage : FileText;
  const expiry = doc.expiresOn ? daysUntil(doc.expiresOn) : null;
  const expiryDate = doc.expiresOn ? format.dateTime(new Date(`${doc.expiresOn}T00:00:00Z`), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "";

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ delay: index * 0.04, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="group relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-border bg-surface p-5 shadow-xs transition-shadow hover:shadow-md"
    >
      {/* Folder tab */}
      <span aria-hidden className={cn("absolute -top-px start-6 h-1.5 w-16 rounded-b-full", doc.inVault ? "bg-gold-400" : "bg-border-strong")} />
      <div className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary/10 text-secondary-text transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-105">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-medium">{t(`types.${doc.type}`)}</span>
          <span className="truncate text-caption text-muted-foreground" dir="auto">
            {doc.originalName} · <span className="tabular">{fileSize(doc.sizeBytes)}</span>
          </span>
          <span lang={owner ? "en" : undefined} className="text-caption text-muted-foreground">
            {owner ? `${owner.givenNameEn} ${owner.surnameEn}` : t("general")}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ScanBadge status={doc.scanStatus} />
        {expiry !== null && <Badge tone={expiry < 0 ? "danger" : expiry < 183 ? "warning" : "outline"}>{expiry < 0 ? t("expiredOn", { date: expiryDate }) : t("expires", { date: expiryDate })}</Badge>}
        {!doc.inVault && <Badge tone="neutral">{t("notInVault")}</Badge>}
      </div>

      {doc.orders.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted-foreground">
          {t("usedIn")}
          {doc.orders.map((o) => (
            <Link key={o.id} href={`/account/orders/${o.id}`} lang="en" dir="ltr" className="font-mono font-semibold text-secondary-text hover:underline">
              {o.number}
            </Link>
          ))}
        </p>
      )}

      <div className="mt-auto flex items-center justify-end gap-1 border-t border-border pt-3">
        {doc.scanStatus === "CLEAN" && (
          <Button variant="ghost" size="sm" onClick={() => void openVaultFile(doc.id)}>
            <Eye aria-hidden />
            {ta("view")}
          </Button>
        )}
        {doc.inVault && (
          <Button variant="ghost" size="icon-sm" className="text-danger hover:bg-danger-soft" onClick={onRemove} aria-label={tc("delete")}>
            <Trash2 aria-hidden />
          </Button>
        )}
      </div>
    </motion.li>
  );
}

function UploadDialog({ open, onClose, travelers }: { open: boolean; onClose: () => void; travelers: SavedTravelerView[] }) {
  const t = useTranslations("account.documents");
  const tc = useTranslations("account.common");
  const queryClient = useQueryClient();
  const refresh = useRefreshAccount();
  const onError = useErrorToast();
  const [type, setType] = useState<(typeof DOCUMENT_TYPES)[number]>("PASSPORT");
  const [owner, setOwner] = useState<string>(GENERAL);
  const [expiresOn, setExpiresOn] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pct, setPct] = useState(0);
  const [resetKey, setResetKey] = useState(0);

  const close = () => {
    setFile(null);
    setPct(0);
    setExpiresOn("");
    setResetKey((k) => k + 1);
    onClose();
  };

  const upload = useMutation({
    mutationFn: async (f: File) => {
      const presign = await api<VaultPresignResult>("/me/documents", { method: "POST", body: { type, travelerId: owner === GENERAL ? null : owner, fileName: f.name, mimeType: f.type, sizeBytes: f.size, expiresOn: expiresOn || null } });
      await putWithProgress(presign.uploadUrl, presign.headers, f, setPct);
      await api(`/me/documents/${presign.documentId}/complete`, { method: "POST" });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.vault });
      void refresh();
      toast.success(t("uploaded"));
      close();
    },
    onError,
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !upload.isPending && close()}>
      <DialogContent closeLabel={tc("close")} className="sm:w-[min(36rem,calc(100vw-2rem))]" data-lenis-prevent>
        <DialogTitle className="pe-10">{t("uploadTitle")}</DialogTitle>
        <DialogDescription>{t("uploadLead")}</DialogDescription>
        <form
          noValidate
          className="mt-6 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (file) upload.mutate(file);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("type")}>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((d) => (
                    <SelectItem key={d} value={d}>
                      {t(`types.${d}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("owner")}>
              <Select value={owner} onValueChange={setOwner}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={GENERAL}>{t("general")}</SelectItem>
                  {travelers.map((tr) => (
                    <SelectItem key={tr.id} value={tr.id}>
                      <span lang="en">
                        {tr.givenNameEn} {tr.surnameEn}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label={t("expiresOn")} hint={t("expiresOnHint")} className="sm:max-w-[calc(50%-0.5rem)]">
            <Input type="date" dir="ltr" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
          </Field>
          <Field label={t("file")}>
            <FileDropzone key={resetKey} accept={[...VAULT_MIME]} maxSizeMb={VAULT_MAX_MB} multiple={false} onFilesChange={(files) => setFile(files[0] ?? null)} />
          </Field>
          {upload.isPending && <Progress value={pct} />}
          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={close} disabled={upload.isPending}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={!file} loading={upload.isPending}>
              <UploadCloud aria-hidden />
              {t("upload")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RemoveDialog({ doc, onClose }: { doc: VaultDocumentView | null; onClose: () => void }) {
  const t = useTranslations("account.documents");
  const tc = useTranslations("account.common");
  const queryClient = useQueryClient();
  const refresh = useRefreshAccount();
  const onError = useErrorToast();
  const remove = useMutation({
    mutationFn: (id: string) => api(`/me/documents/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.vault });
      void refresh();
      toast.success(t("removed"));
      onClose();
    },
    onError,
  });
  return (
    <Dialog open={Boolean(doc)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={tc("close")}>
        <DialogTitle className="pe-10">{doc ? t("removeTitle", { name: doc.originalName }) : ""}</DialogTitle>
        <DialogDescription>{t("removeLead")}</DialogDescription>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            {tc("cancel")}
          </Button>
          <Button variant="danger" loading={remove.isPending} onClick={() => doc && remove.mutate(doc.id)}>
            {tc("delete")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
