import { SiWhatsapp } from "@icons-pack/react-simple-icons";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Persistent support entry point with a live response-time promise (value comes from admin settings later). */
export function WhatsAppButton({
  phone,
  etaMinutes,
  floating = true,
  className,
}: {
  phone: string;
  etaMinutes: number;
  floating?: boolean;
  className?: string;
}) {
  const t = useTranslations("ui.whatsapp");
  return (
    <a
      href={`https://wa.me/${phone.replace(/\D/g, "")}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group inline-flex items-center gap-3 rounded-full bg-foreground py-2 pe-5 ps-2 text-background shadow-lg transition-transform duration-300 ease-[var(--ease-out-expo)] hover:-translate-y-0.5",
        // Floating on phones: icon-only so it never hides content; the label returns from sm up.
        floating && "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] end-4 z-40 max-sm:p-1.5",
        className,
      )}
    >
      <span className="relative grid size-10 place-items-center rounded-full bg-[#25D366] text-white">
        <SiWhatsapp className="size-5" aria-hidden />
        <span className="absolute -end-0.5 -top-0.5 size-3 rounded-full border-2 border-foreground bg-[#25D366]" aria-hidden>
          <span className="absolute inset-0 animate-pulse-ring rounded-full bg-[#25D366]" />
        </span>
      </span>
      <span className={cn("flex flex-col leading-tight", floating && "max-sm:sr-only")}>
        <span className="text-body-sm font-semibold">{t("label")}</span>
        <span className="text-caption opacity-70">{t("eta", { minutes: etaMinutes })}</span>
      </span>
    </a>
  );
}
