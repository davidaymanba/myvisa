"use client";

import { Camera, FileText, UploadCloud, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { cn } from "@/lib/utils";

export interface PickedFile {
  id: string;
  file: File;
  previewUrl?: string;
}

/**
 * Drag & drop + browse + (on touch devices) direct camera capture.
 * Client-side checks are UX only — the API re-validates type, size and runs the virus scan.
 */
export function FileDropzone({
  accept = ["application/pdf", "image/jpeg", "image/png"],
  maxSizeMb = 10,
  multiple = true,
  onFilesChange,
  className,
}: {
  accept?: string[];
  maxSizeMb?: number;
  multiple?: boolean;
  onFilesChange?: (files: File[]) => void;
  className?: string;
}) {
  const t = useTranslations("ui.dropzone");
  const inputId = useId();
  const cameraRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Revoke preview URLs on unmount only; individual removals revoke their own URL.
  const filesRef = useRef(files);
  filesRef.current = files;
  useEffect(() => () => filesRef.current.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl)), []);

  const add = (list: FileList | null) => {
    if (!list?.length) return;
    setError(null);
    const accepted: PickedFile[] = [];
    for (const file of Array.from(list)) {
      if (!accept.includes(file.type)) {
        setError(t("errorType", { name: file.name }));
        continue;
      }
      if (file.size > maxSizeMb * 1024 * 1024) {
        setError(t("errorSize", { name: file.name, size: maxSizeMb }));
        continue;
      }
      accepted.push({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      });
    }
    const next = multiple ? [...files, ...accepted.filter((a) => !files.some((f) => f.id === a.id))] : accepted.slice(0, 1);
    setFiles(next);
    onFilesChange?.(next.map((f) => f.file));
  };

  const remove = (id: string) => {
    const gone = files.find((f) => f.id === id);
    if (gone?.previewUrl) URL.revokeObjectURL(gone.previewUrl);
    const next = files.filter((f) => f.id !== id);
    setFiles(next);
    onFilesChange?.(next.map((f) => f.file));
  };

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);
    add(e.dataTransfer.files);
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "group relative flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border-strong bg-surface px-6 py-9 text-center transition-all duration-200",
          "hover:border-secondary-text/60 hover:bg-secondary/[0.03] has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-4 has-[input:focus-visible]:ring-ring/15",
          dragging && "scale-[1.01] border-secondary bg-secondary/[0.06]",
        )}
      >
        <span className={cn("grid size-14 place-items-center rounded-2xl bg-muted text-secondary-text transition-transform duration-300", dragging && "-translate-y-1 scale-110")}>
          <UploadCloud className="size-7" aria-hidden />
        </span>
        <span className="flex flex-col gap-1">
          <span className="text-body font-medium">
            {t("title")} <span className="text-secondary-text underline underline-offset-4">{t("browse")}</span>
          </span>
          <span className="text-caption text-muted-foreground">{t("hint", { size: maxSizeMb })}</span>
        </span>
        <input
          id={inputId}
          type="file"
          accept={accept.join(",")}
          multiple={multiple}
          className="sr-only"
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {/* Camera capture: only meaningful on phones/tablets. */}
      <button
        type="button"
        onClick={() => cameraRef.current?.click()}
        className="hidden h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface text-body-sm font-medium transition-colors hover:bg-muted [@media(pointer:coarse)]:inline-flex"
      >
        <Camera className="size-4" aria-hidden />
        {t("camera")}
      </button>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        tabIndex={-1}
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />

      {error && (
        <p role="alert" className="text-caption font-medium text-danger">
          {error}
        </p>
      )}

      {files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map(({ id, file, previewUrl }) => (
            <li key={id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2.5 pe-3 animate-pop-in">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                <img src={previewUrl} alt="" className="size-11 rounded-lg object-cover" />
              ) : (
                <span className="grid size-11 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <FileText className="size-5" aria-hidden />
                </span>
              )}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body-sm font-medium" dir="auto">
                  {file.name}
                </span>
                <span className="tabular text-caption text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(1)} MB · {t("ready")}
                </span>
              </span>
              <button
                type="button"
                onClick={() => remove(id)}
                aria-label={t("remove", { name: file.name })}
                className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
