import { cn } from "@/lib/utils";

/** Static SVG flag from /public/flags (synced from country-flag-icons). Decorative by default. */
export function Flag({ code, className, label }: { code: string; className?: string; label?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static SVG; next/image adds no value here
    <img
      src={`/flags/${code.toLowerCase()}.svg`}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      width={24}
      height={16}
      loading="lazy"
      decoding="async"
      className={cn("inline-block h-4 w-6 shrink-0 rounded-[3px] object-cover shadow-[0_0_0_1px_rgb(0_0_0/0.08)]", className)}
    />
  );
}
