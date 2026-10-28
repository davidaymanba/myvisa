import Image from "next/image";
import { cn } from "@/lib/utils";
import logoLight from "@/assets/brand/logo.png";
import logoDark from "@/assets/brand/logo-dark.png";
import markLight from "@/assets/brand/logo-mark.png";
import markDark from "@/assets/brand/logo-mark-dark.png";

/**
 * Brand artwork (the "تأشيرتي My VISA" logo). `auto` follows the nearest `.dark` container, so the
 * header, footer and dark panels pick the variant with the blue lettering turned white.
 * `light` / `dark` force one variant where the surface doesn't follow the theme (invoice paper, inverse bands).
 */
type Tone = "auto" | "light" | "dark";

/** `width` is the largest rendered width in CSS px, so the optimizer serves a small file (2x for retina). */
function Variants({ light, dark, tone, alt, width, className, priority }: { light: typeof logoLight; dark: typeof logoDark; tone: Tone; alt: string; width: number; className: string; priority?: boolean }) {
  return (
    <>
      {tone !== "dark" && <Image src={light} alt={alt} width={width} priority={priority} className={cn(className, tone === "auto" && "dark:hidden")} />}
      {tone !== "light" && <Image src={dark} alt={alt} width={width} priority={priority} className={cn(className, tone === "auto" && "hidden dark:block")} />}
    </>
  );
}

/** Mark: the passport-and-plane icon from the logo, sized by `className` (default 32px). */
export function LogoMark({ className, tone = "auto" }: { className?: string; tone?: Tone }) {
  return (
    <span className={cn("relative block size-8 shrink-0", className)} aria-hidden>
      <Variants light={markLight} dark={markDark} tone={tone} alt="" width={48} className="size-full object-contain" />
    </span>
  );
}

export function Logo({ className, withArabic = false, tone = "auto" }: { className?: string; withArabic?: boolean; tone?: Tone }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <Variants
        light={logoLight}
        dark={logoDark}
        tone={tone}
        alt="تأشيرتي My VISA"
        width={withArabic ? 130 : 90}
        priority
        className={cn("w-auto", withArabic ? "h-14 sm:h-16" : "h-10 sm:h-11")}
      />
    </span>
  );
}
