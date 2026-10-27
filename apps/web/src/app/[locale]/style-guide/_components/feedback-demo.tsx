"use client";

import { CloudOff, Inbox } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";

export function ToastDemo() {
  const t = useTranslations("styleGuide.feedback");
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" onClick={() => toast.success(t("toastSuccessTitle"), { description: t("toastSuccessDesc") })}>
        {t("toastSuccess")}
      </Button>
      <Button variant="outline" onClick={() => toast.error(t("toastErrorTitle"), { description: t("toastErrorDesc") })}>
        {t("toastError")}
      </Button>
      <Button variant="outline" onClick={() => toast(t("toastInfoTitle"), { action: { label: t("undo"), onClick: () => undefined } })}>
        {t("toastInfo")}
      </Button>
    </div>
  );
}

export function ProgressDemo() {
  const t = useTranslations("styleGuide.feedback");
  const [value, setValue] = useState(12);
  useEffect(() => {
    const id = setInterval(() => setValue((v) => (v >= 100 ? 8 : Math.min(100, v + 11))), 900);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex justify-between text-body-sm">
        <span>{t("uploading")}</span>
        <span className="tabular text-muted-foreground">{value}%</span>
      </div>
      <Progress value={value} aria-label={t("uploading")} />
    </div>
  );
}

export function SkeletonDemo() {
  // Mirrors DestinationCard's footprint so the swap to real content causes no layout shift.
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`flex aspect-[4/5] flex-col justify-end gap-4 rounded-3xl border border-border bg-surface p-5 ${i === 2 ? "max-lg:hidden" : ""}`}>
          <Skeleton className="h-7 w-2/5" />
          <div className="flex items-end justify-between border-t border-border pt-4">
            <Skeleton className="h-4 w-28" />
            <div className="flex flex-col items-end gap-1.5">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatesDemo() {
  const t = useTranslations("styleGuide.feedback");
  const [retrying, setRetrying] = useState(false);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <EmptyState
        icon={<Inbox aria-hidden />}
        title={t("emptyTitle")}
        description={t("emptyDesc")}
        action={<Button size="sm">{t("emptyAction")}</Button>}
      />
      <ErrorState
        icon={<CloudOff aria-hidden />}
        title={t("errorTitle")}
        description={retrying ? "…" : t("errorDesc")}
        retryLabel={t("retry")}
        onRetry={() => {
          setRetrying(true);
          setTimeout(() => setRetrying(false), 1200);
        }}
      />
    </div>
  );
}

export function LoadingButtonDemo({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="primary"
      loading={loading}
      onClick={() => {
        setLoading(true);
        setTimeout(() => setLoading(false), 1800);
      }}
    >
      {label}
    </Button>
  );
}
