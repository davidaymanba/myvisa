"use client";

import { BLOG_STATUSES, readingMinutes, type BlogPostRecord } from "@myvisa/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, Eye, Newspaper, PenLine, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Markdown } from "@/components/blog/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Link, useRouter } from "@/i18n/navigation";
import { ApiError, api } from "@/lib/api/client";
import { unsplash } from "@/lib/images";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "./page-header";
import { useCan, useMutationToasts } from "./use-admin";

const STATUS_TONE = { DRAFT: "neutral", PUBLISHED: "success", ARCHIVED: "outline" } as const;

export function BlogList() {
  const t = useTranslations("admin.blog");
  const tc = useTranslations("admin.common");
  const can = useCan();
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const posts = useQuery({ queryKey: ["admin", "blog"], queryFn: () => api<BlogPostRecord[]>("/admin/blog") });
  const newButton = can("content:write") && (
    <Button asChild size="lg">
      <Link href="/admin/blog/new">
        <Plus aria-hidden />
        {t("new")}
      </Link>
    </Button>
  );
  return (
    <>
      <AdminPageHeader index="08" eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} actions={newButton} />
      {posts.isError ? (
        <ErrorState icon={<Newspaper />} title={tc("loadError")} onRetry={() => posts.refetch()} retryLabel={tc("retry")} />
      ) : !posts.data ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72 rounded-[1.75rem]" />
          ))}
        </div>
      ) : !posts.data.length ? (
        <EmptyState icon={<Newspaper />} title={t("empty")} description={t("emptyBody")} action={newButton} />
      ) : (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {posts.data.map((p, i) => (
            <motion.li key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.5 }}>
              <Link href={`/admin/blog/${p.id}`} className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-border bg-surface shadow-xs transition-shadow hover:shadow-md">
                <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                  {p.coverImageId && <Image src={unsplash(p.coverImageId, 700)} alt="" fill sizes="(min-width: 1280px) 33vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />}
                  <Badge tone={STATUS_TONE[p.status]} dot className="absolute start-3 top-3">
                    {t(`statuses.${p.status}`)}
                  </Badge>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <h2 className="font-display text-title leading-snug">{p.titleAr}</h2>
                  {p.titleEn && (
                    <p lang="en" className="text-body-sm text-muted-foreground">
                      {p.titleEn}
                    </p>
                  )}
                  <p className="mt-auto flex items-center gap-2 pt-3 text-caption text-muted-foreground max-sm:flex-wrap max-sm:gap-y-1">
                    <PenLine className="size-3.5 shrink-0" aria-hidden />
                    {t("updated", { when: format.relativeTime(new Date(p.updatedAt), now) })}
                    <span lang="en" dir="ltr" className="ms-auto font-mono max-sm:min-w-0 max-sm:truncate">
                      /{p.slug}
                    </span>
                  </p>
                </div>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </>
  );
}

interface Form {
  slug: string;
  titleAr: string;
  titleEn: string;
  excerptAr: string;
  excerptEn: string;
  bodyAr: string;
  bodyEn: string;
  coverImageId: string;
  coverAlt: string;
  tags: string;
  status: (typeof BLOG_STATUSES)[number];
}
const EMPTY: Form = { slug: "", titleAr: "", titleEn: "", excerptAr: "", excerptEn: "", bodyAr: "", bodyEn: "", coverImageId: "", coverAlt: "", tags: "", status: "DRAFT" };
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);

/** Write on the left, see the article as readers will on the right — in either language. */
export function BlogEditor({ id }: { id?: string }) {
  const t = useTranslations("admin.blog");
  const tc = useTranslations("admin.common");
  const te = useTranslations("admin.errors");
  const can = useCan();
  const toasts = useMutationToasts();
  const router = useRouter();
  const queryClient = useQueryClient();
  const existing = useQuery({ queryKey: ["admin", "blog", id], queryFn: () => api<BlogPostRecord>(`/admin/blog/${id}`), enabled: Boolean(id) });
  const [form, setForm] = useState<Form>(EMPTY);
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugTouched, setSlugTouched] = useState(Boolean(id));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const readOnly = !can("content:write");

  useEffect(() => {
    const p = existing.data;
    if (!p) return;
    setForm({ slug: p.slug, titleAr: p.titleAr, titleEn: p.titleEn ?? "", excerptAr: p.excerptAr ?? "", excerptEn: p.excerptEn ?? "", bodyAr: p.bodyAr, bodyEn: p.bodyEn ?? "", coverImageId: p.coverImageId ?? "", coverAlt: p.coverAlt ?? "", tags: p.tags.join(", "), status: p.status });
  }, [existing.data]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => {
      const next = { ...f, [k]: v };
      // The slug follows the English title until someone edits it by hand.
      if (k === "titleEn" && !slugTouched) next.slug = slugify(String(v));
      return next;
    });

  const save = useMutation({
    mutationFn: () => {
      const body = {
        ...form,
        titleEn: form.titleEn || null,
        excerptAr: form.excerptAr || null,
        excerptEn: form.excerptEn || null,
        bodyEn: form.bodyEn || null,
        coverImageId: form.coverImageId || null,
        coverAlt: form.coverAlt || null,
        tags: form.tags
          .split(",")
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean),
      };
      return id ? api<BlogPostRecord>(`/admin/blog/${id}`, { method: "PUT", body }) : api<BlogPostRecord>("/admin/blog", { method: "POST", body });
    },
    onSuccess: (p) => {
      setErrors({});
      toasts.success(t("saved"));
      void queryClient.invalidateQueries({ queryKey: ["admin", "blog"] });
      if (!id) router.replace(`/admin/blog/${p.id}`);
    },
    onError: (e) => {
      if (e instanceof ApiError && e.problem.errors?.length) {
        setErrors(Object.fromEntries(e.problem.errors.map((x) => [x.path.split(".")[0]!, te.has(x.message as "generic") ? te(x.message as "generic") : x.message === "slug" ? t("slugInvalid") : te("validation_failed")])));
      }
      toasts.error(e);
    },
  });

  const remove = useMutation({
    mutationFn: () => api(`/admin/blog/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toasts.success(t("deleted"));
      void queryClient.invalidateQueries({ queryKey: ["admin", "blog"] });
      router.replace("/admin/blog");
    },
    onError: toasts.error,
  });

  if (id && existing.isError) return <ErrorState icon={<Newspaper />} title={tc("loadError")} onRetry={() => existing.refetch()} retryLabel={tc("retry")} />;
  if (id && !existing.data) return <Skeleton className="h-[40rem] rounded-[2rem]" />;

  const body = lang === "ar" ? form.bodyAr : form.bodyEn;
  const title = lang === "ar" ? form.titleAr : form.titleEn;
  const minutes = readingMinutes(body);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/blog" className="group -my-2 inline-flex items-center gap-2 py-2 text-body-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1 rtl:rotate-180 rtl:group-hover:translate-x-1" aria-hidden />
          {t("back")}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {existing.data?.status === "PUBLISHED" && (
            <Button asChild variant="ghost" size="sm">
              <a href={`/blog/${existing.data.slug}`} target="_blank" rel="noreferrer">
                {t("view")}
                <ArrowUpRight className="flip-rtl" aria-hidden />
              </a>
            </Button>
          )}
          {id && !readOnly && (
            <Button type="button" variant="ghost" size="sm" className="text-danger hover:bg-danger-soft" onClick={() => setConfirmDelete(true)}>
              <Trash2 aria-hidden />
              {tc("delete")}
            </Button>
          )}
          <Select value={form.status} onValueChange={(v) => set("status", v as Form["status"])} disabled={readOnly}>
            <SelectTrigger className="h-10 w-36" aria-label={t("status")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BLOG_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`statuses.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!readOnly && (
            <Button type="submit" loading={save.isPending}>
              {tc("save")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <fieldset disabled={readOnly} className="flex min-w-0 flex-col gap-5 rounded-[1.75rem] border border-border bg-surface p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("titleAr")} error={errors.titleAr}>
              <Input dir="rtl" value={form.titleAr} onChange={(e) => set("titleAr", e.target.value)} maxLength={160} />
            </Field>
            <Field label={t("titleEn")} error={errors.titleEn} optional={tc("optional")}>
              <Input dir="ltr" value={form.titleEn} onChange={(e) => set("titleEn", e.target.value)} maxLength={160} />
            </Field>
            <Field label={t("slug")} hint={t("slugHint")} error={errors.slug} className="sm:col-span-2">
              <Input
                dir="ltr"
                className="font-mono"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", e.target.value.toLowerCase());
                }}
                maxLength={100}
              />
            </Field>
            <Field label={t("excerptAr")} optional={tc("optional")}>
              <Textarea dir="rtl" rows={2} value={form.excerptAr} onChange={(e) => set("excerptAr", e.target.value)} maxLength={400} />
            </Field>
            <Field label={t("excerptEn")} optional={tc("optional")}>
              <Textarea dir="ltr" rows={2} value={form.excerptEn} onChange={(e) => set("excerptEn", e.target.value)} maxLength={400} />
            </Field>
            <Field label={t("cover")} hint={t("coverHint")} error={errors.coverImageId}>
              <Input dir="ltr" className="font-mono" value={form.coverImageId} onChange={(e) => set("coverImageId", e.target.value.trim())} />
            </Field>
            <Field label={t("coverAlt")} optional={tc("optional")}>
              <Input value={form.coverAlt} onChange={(e) => set("coverAlt", e.target.value)} maxLength={200} />
            </Field>
            <Field label={t("tags")} hint={t("tagsHint")} error={errors.tags} className="sm:col-span-2">
              <Input dir="ltr" value={form.tags} onChange={(e) => set("tags", e.target.value)} />
            </Field>
          </div>
          <LangTabs lang={lang} onChange={setLang} />
          <Field label={lang === "ar" ? t("bodyAr") : t("bodyEn")} hint={lang === "en" ? t("englishOptional") : t("bodyHint")} error={lang === "ar" ? errors.bodyAr : errors.bodyEn}>
            <Textarea
              dir={lang === "ar" ? "rtl" : "ltr"}
              rows={22}
              value={body}
              onChange={(e) => set(lang === "ar" ? "bodyAr" : "bodyEn", e.target.value)}
              className="min-h-[28rem] font-mono text-body-sm leading-relaxed"
              data-lenis-prevent
            />
          </Field>
        </fieldset>

        <section aria-label={t("preview")} className="min-w-0 overflow-hidden rounded-[1.75rem] border border-border bg-background xl:sticky xl:top-6">
          <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-3">
            <span className="flex items-center gap-2 text-body-sm font-medium">
              <Eye className="size-4" aria-hidden />
              {t("preview")}
            </span>
            {minutes && <span className="text-caption text-muted-foreground">{t("minutes", { count: minutes })}</span>}
          </div>
          <div data-lenis-prevent className="max-h-[48rem] overflow-y-auto" lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
            {form.coverImageId && /^[A-Za-z0-9_-]{6,80}$/.test(form.coverImageId) && (
              <div className="relative aspect-[21/9] bg-muted">
                <Image src={unsplash(form.coverImageId, 1000)} alt={form.coverAlt} fill sizes="50vw" className="object-cover" />
              </div>
            )}
            <div className="px-6 py-8 sm:px-10">
              <AnimatePresence mode="wait">
                <motion.div key={lang} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {title && <h1 className="mb-6 font-display text-display-md leading-tight">{title}</h1>}
                  {body ? <Markdown source={body} /> : <p className="text-muted-foreground">—</p>}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent closeLabel={tc("close")}>
          <DialogTitle className="pe-10">{tc("confirmTitle")}</DialogTitle>
          <DialogDescription>{tc("confirmBody")}</DialogDescription>
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>
              {tc("cancel")}
            </Button>
            <Button type="button" variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
              {tc("delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}

function LangTabs({ lang, onChange }: { lang: "ar" | "en"; onChange: (l: "ar" | "en") => void }) {
  const t = useTranslations("admin.blog");
  return (
    <div role="tablist" className="flex w-fit gap-1 rounded-full bg-muted p-1">
      {(["ar", "en"] as const).map((l) => (
        <button key={l} type="button" role="tab" aria-selected={lang === l} onClick={() => onChange(l)} className={cn("relative isolate rounded-full px-5 py-2 text-body-sm font-medium transition-colors", lang === l ? "text-background" : "text-muted-foreground")}>
          {lang === l && <motion.span layoutId="blog-lang" className="absolute inset-0 -z-10 rounded-full bg-foreground" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
          <span lang={l}>{l === "ar" ? t("arabic") : t("english")}</span>
        </button>
      ))}
    </div>
  );
}
