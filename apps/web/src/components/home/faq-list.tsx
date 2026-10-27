"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function FaqList({ items, className }: { items: { q: string; a: string }[]; className?: string }) {
  return (
    <Accordion type="single" collapsible defaultValue="q0" className={className ?? "border-t border-border"}>
      {items.map((f, i) => (
        <AccordionItem key={f.q} value={`q${i}`}>
          <AccordionTrigger className="py-6 text-[clamp(1.1rem,1rem+0.4vw,1.35rem)]">{f.q}</AccordionTrigger>
          <AccordionContent className="text-body-lg">{f.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
