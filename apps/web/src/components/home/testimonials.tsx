import { Quote, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { Marquee } from "@/components/motion/marquee";

interface Testimonial {
  name: string;
  city: string;
  service: string;
  quote: string;
}

// PLACEHOLDER testimonials — must be replaced with real, consented customer reviews (Testimonial table, Phase 3)
// before launch. Publishing invented reviews would mislead customers.
export function Testimonials() {
  const t = useTranslations("home.testimonials");
  const items = t.raw("items") as Testimonial[];
  const half = Math.ceil(items.length / 2);
  const rows = [items.slice(0, half), items.slice(half)];

  return (
    <div className="flex flex-col gap-5">
      {rows.map((row, r) => (
        <Marquee key={r} reverse={r === 1} duration={r === 0 ? 50 : 60} gap="1.25rem">
          {row.map((item) => (
            <figure key={item.name} className="flex w-[min(84vw,26rem)] shrink-0 flex-col justify-between gap-8 rounded-[1.75rem] border border-border bg-surface p-7 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <span className="flex text-gold-400" aria-hidden>
                  {Array.from({ length: 5 }, (_, i) => (
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
                    {item.city} · {item.service}
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
