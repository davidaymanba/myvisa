import type { AppLocale } from "@myvisa/shared";
import { Quote, Star } from "lucide-react";
import { useLocale } from "next-intl";
import { use } from "react";
import { Marquee } from "@/components/motion/marquee";
import { getTestimonials } from "@/lib/api/server";

// Rendered from the `Testimonial` table (admin → content). The seeded rows are PLACEHOLDERS — replace
// them with real, consented customer reviews before launch; publishing invented reviews would mislead customers.
export function Testimonials() {
  const locale = useLocale() as AppLocale;
  const items = use(getTestimonials()).map((t) => ({
    id: t.id,
    name: (locale === "en" && t.name.en) || t.name.ar,
    city: (locale === "en" && t.city.en) || t.city.ar,
    service: (locale === "en" && t.service.en) || t.service.ar,
    quote: (locale === "en" && t.quote.en) || t.quote.ar,
    rating: t.rating,
  }));
  if (items.length === 0) return null;
  const half = Math.ceil(items.length / 2);
  const rows = [items.slice(0, half), items.slice(half)].filter((row) => row.length > 0);

  return (
    <div className="flex flex-col gap-5">
      {rows.map((row, r) => (
        <Marquee key={r} reverse={r === 1} duration={r === 0 ? 50 : 60} gap="1.25rem">
          {row.map((item) => (
            <figure key={item.id} className="flex w-[min(84vw,26rem)] shrink-0 flex-col justify-between gap-8 rounded-[1.75rem] border border-border bg-surface p-7 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <span className="flex text-gold-400" aria-hidden>
                  {Array.from({ length: item.rating }, (_, i) => (
                    <Star key={i} className="size-4 fill-current" />
                  ))}
                </span>
                <Quote className="size-8 shrink-0 text-gold-200 flip-rtl" aria-hidden />
              </div>
              <blockquote className="font-display text-title leading-relaxed text-foreground">{item.quote}</blockquote>
              <figcaption className="flex items-center gap-3 border-t border-border pt-5">
                <span className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-teal-400 to-teal-700 font-semibold text-white">{item.name.charAt(0)}</span>
                <span className="flex flex-col">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-caption text-muted-foreground">
                    {[item.city, item.service].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </figcaption>
            </figure>
          ))}
        </Marquee>
      ))}
    </div>
  );
}
