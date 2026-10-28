"use client";

import type { MessageView, VaultDocumentView, VaultPresignResult } from "@myvisa/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCheck, LoaderCircle, MessagesSquare, Paperclip, SendHorizonal, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { putWithProgress } from "@/components/apply/use-apply";
import { LogoMark } from "@/components/brand/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { RetryLink } from "./page-header";
import { accountKeys, useErrorToast, useMessages } from "./use-account";

const ATTACH_MIME = ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/webp"];

/** Uploads a chat attachment into the vault and waits until the virus scan has passed. */
async function uploadAttachment(file: File): Promise<string> {
  const presign = await api<VaultPresignResult>("/me/documents", { method: "POST", body: { type: "OTHER", travelerId: null, fileName: file.name, mimeType: file.type, sizeBytes: file.size, expiresOn: null } });
  await putWithProgress(presign.uploadUrl, presign.headers, file, () => undefined);
  await api(`/me/documents/${presign.documentId}/complete`, { method: "POST" });
  for (let i = 0; i < 40; i++) {
    const list = await api<VaultDocumentView[]>("/me/documents");
    const doc = list.find((d) => d.id === presign.documentId);
    if (doc?.scanStatus === "CLEAN") return doc.id;
    if (doc && doc.scanStatus !== "PENDING") throw new Error("scan");
    await new Promise((r) => setTimeout(r, 750));
  }
  throw new Error("scan timeout");
}

/**
 * The order conversation. Customers see it in their account; staff see the same thread from the other side
 * (`viewer="STAFF"`, no attachments: files from the team go through the order itself).
 */
export function MessagesPanel({ orderId, className, viewer = "CUSTOMER" }: { orderId: string; className?: string; viewer?: "CUSTOMER" | "STAFF" }) {
  const t = useTranslations("account.messages");
  const format = useFormatter();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const onError = useErrorToast();
  const messages = useMessages(orderId);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const count = messages.data?.length ?? 0;

  // Keep the newest message in view. Block body: scrollTo may return a Promise in new browsers.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: count > 0 ? "smooth" : "auto" });
  }, [count]);

  // Reading the thread marks staff replies read; refresh the badges.
  useEffect(() => {
    if (messages.dataUpdatedAt && viewer === "CUSTOMER") void queryClient.invalidateQueries({ queryKey: accountKeys.summary });
  }, [messages.dataUpdatedAt, queryClient, viewer]);

  const send = useMutation({
    mutationFn: async (input: { body: string; file: File | null }) => {
      const attachmentDocumentId = input.file ? await uploadAttachment(input.file) : null;
      return api<MessageView>(`/orders/${orderId}/messages?locale=${locale}`, { method: "POST", body: { body: input.body, attachmentDocumentId } });
    },
    onSuccess: (m) => {
      queryClient.setQueryData<MessageView[]>(accountKeys.messages(orderId), (list) => [...(list ?? []), m]);
      setBody("");
      setFile(null);
    },
    onError,
  });

  const submit = () => {
    const text = body.trim() || (file ? file.name : "");
    if (!text || send.isPending) return;
    send.mutate({ body: text, file });
  };

  const open = async (m: MessageView) => {
    const { url } = await api<{ url: string }>(`/messages/${m.id}/attachment`);
    window.open(url, "_blank", "noopener");
  };

  // Day separators.
  const dayKey = (iso: string) => new Date(iso).toDateString();

  return (
    <section id="messages" className={cn("flex scroll-mt-28 flex-col overflow-hidden rounded-[1.75rem] border border-border bg-surface shadow-sm", className)}>
      <header className="dark relative flex items-center gap-3 overflow-hidden bg-teal-800 px-5 py-4 text-foreground">
        <div aria-hidden className="absolute -end-10 -top-16 size-40 rounded-full bg-gold-400/20 blur-3xl" />
        <span className="relative grid size-10 place-items-center rounded-full border border-gold-300/50">
          <LogoMark className="size-5 text-gold-300 [&_rect]:fill-transparent" />
          <span className="absolute -bottom-0.5 -end-0.5 size-3 rounded-full bg-success ring-2 ring-teal-800" aria-hidden />
        </span>
        <div className="relative flex flex-col">
          <h2 className="font-display text-title">{t("title")}</h2>
          <p className="text-caption text-foreground/70">{viewer === "STAFF" ? t("staffLead") : t("hours")}</p>
        </div>
      </header>

      <div ref={scroller} data-lenis-prevent className="flex max-h-[28rem] min-h-64 flex-col gap-2 overflow-y-auto bg-[radial-gradient(rgb(15_94_90/0.06)_1px,transparent_1px)] [background-size:16px_16px] px-4 py-5">
        {messages.isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-12 w-2/3 rounded-2xl" />
            <Skeleton className="ms-auto h-10 w-1/2 rounded-2xl" />
          </div>
        ) : messages.isError ? (
          <div className="m-auto">
            <RetryLink onRetry={() => messages.refetch()} />
          </div>
        ) : count === 0 ? (
          <div className="m-auto flex max-w-xs flex-col items-center gap-2 text-center">
            <MessagesSquare className="size-8 text-secondary-text" aria-hidden />
            <p className="font-medium">{t("empty")}</p>
            <p className="text-body-sm text-muted-foreground">{viewer === "STAFF" ? t("staffEmpty") : t("emptyLead")}</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.data!.map((m, i, arr) => {
              const mine = viewer === "STAFF" ? m.sender === "STAFF" : m.sender === "CUSTOMER";
              const newDay = i === 0 || dayKey(arr[i - 1]!.createdAt) !== dayKey(m.createdAt);
              return (
                <motion.div key={m.id} layout initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 380, damping: 30 }} className="flex flex-col">
                  {newDay && (
                    <span className="mx-auto my-2 rounded-full bg-muted px-3 py-1 text-caption text-muted-foreground">{format.dateTime(new Date(m.createdAt), { weekday: "short", day: "numeric", month: "short" })}</span>
                  )}
                  <div className={cn("flex max-w-[85%] flex-col gap-1", mine ? "ms-auto items-end" : "me-auto items-start")}>
                    {!mine && (
                      <span className="flex items-center gap-1 px-1 text-caption font-medium text-secondary-text">
                        {m.sender === "SYSTEM" && <Sparkles className="size-3" aria-hidden />}
                        {m.sender === "SYSTEM" ? t("system") : m.sender === "CUSTOMER" ? t("customer") : (m.senderName ?? t("team"))}
                      </span>
                    )}
                    <div className={cn("whitespace-pre-wrap break-words px-4 py-2.5 text-body-sm shadow-xs", mine ? "rounded-2xl rounded-ee-md bg-foreground text-background" : "rounded-2xl rounded-ss-md border border-border bg-surface")} dir="auto">
                      {m.body}
                      {m.attachment && (
                        <button type="button" onClick={() => void open(m)} className={cn("mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-start text-caption", mine ? "bg-background/15" : "bg-muted")}>
                          <Paperclip className="size-3.5 shrink-0" aria-hidden />
                          <span className="truncate">{m.attachment.name}</span>
                        </button>
                      )}
                    </div>
                    <span className="flex items-center gap-1 px-1 text-[0.68rem] text-muted-foreground">
                      {format.dateTime(new Date(m.createdAt), { hour: "numeric", minute: "2-digit" })}
                      {mine && (m.readAt ? <CheckCheck className="size-3.5 text-secondary-text" aria-label={t("seen")} /> : <Check className="size-3.5" aria-label={t("sent")} />)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      <form
        className="border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <AnimatePresence>
          {file && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-2 flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-caption">
              {send.isPending ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : <Paperclip className="size-3.5" aria-hidden />}
              <span className="flex-1 truncate">{send.isPending ? t("attaching") : file.name}</span>
              {!send.isPending && (
                <button type="button" onClick={() => setFile(null)} aria-label={t("attachment")}>
                  <X className="size-3.5" aria-hidden />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-end gap-2">
          <button type="button" hidden={viewer === "STAFF"} onClick={() => fileInput.current?.click()} className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label={t("attach")}>
            <Paperclip className="size-5" aria-hidden />
          </button>
          <input ref={fileInput} type="file" accept={ATTACH_MIME.join(",")} className="hidden" onChange={(e) => (setFile(e.target.files?.[0] ?? null), (e.target.value = ""))} />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder={t("placeholder")}
            aria-label={t("placeholder")}
            dir="auto"
            className="max-h-36 min-h-11 flex-1 resize-none rounded-[1.4rem] border border-border-strong bg-background px-4 py-2.5 text-body-sm outline-none transition-[border-color,box-shadow] [field-sizing:content] focus:border-secondary focus:ring-4 focus:ring-ring/15"
          />
          <motion.button whileTap={{ scale: 0.9 }} type="submit" disabled={(!body.trim() && !file) || send.isPending} className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm transition-opacity disabled:opacity-40" aria-label={t("send")}>
            {send.isPending ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <SendHorizonal className="size-5 flip-rtl" aria-hidden />}
          </motion.button>
        </div>
      </form>
    </section>
  );
}
