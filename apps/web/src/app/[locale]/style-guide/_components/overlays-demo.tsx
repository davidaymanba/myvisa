"use client";

import { CircleHelp, CircleCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/choice";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip } from "@/components/ui/tooltip";

export function DialogDemo() {
  const t = useTranslations("styleGuide.overlays");
  const tUi = useTranslations("ui.dialog");
  const [accepted, setAccepted] = useState(false);
  const points = t.raw("refundPoints") as string[];
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">{t("openDialog")}</Button>
      </DialogTrigger>
      <DialogContent closeLabel={tUi("close")}>
        <DialogTitle>{t("dialogTitle")}</DialogTitle>
        <DialogDescription>{t("dialogDesc")}</DialogDescription>
        <ul className="mt-6 flex flex-col gap-3">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-3 text-body-sm">
              <CircleCheck className="mt-0.5 size-5 shrink-0 text-secondary-text" aria-hidden />
              {p}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex items-center gap-3 rounded-xl bg-muted p-3.5">
          <Checkbox id="refund-accept" checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} />
          <Label htmlFor="refund-accept" className="font-normal">
            {t("accept")}
          </Label>
        </div>
        <Button block size="lg" className="mt-5" disabled={!accepted}>
          {t("continuePay")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function TooltipDemo() {
  const t = useTranslations("styleGuide.overlays");
  return (
    <Tooltip content={t("tooltipBody")}>
      <button type="button" className="inline-flex items-center gap-2 text-body-sm font-medium text-secondary-text underline decoration-dotted underline-offset-4">
        <CircleHelp className="size-4" aria-hidden />
        {t("tooltipTrigger")}
      </button>
    </Tooltip>
  );
}

const TAB_KEYS = ["visas", "insurance", "license", "translation"] as const;

export function TabsDemo() {
  const t = useTranslations("styleGuide.overlays");
  return (
    <Tabs defaultValue="visas">
      <TabsList>
        {TAB_KEYS.map((k) => (
          <TabsTrigger key={k} value={k}>
            {(t.raw(`tabItems.${k}`) as [string, string])[0]}
          </TabsTrigger>
        ))}
      </TabsList>
      {TAB_KEYS.map((k) => (
        <TabsContent key={k} value={k} className="max-w-xl text-body text-muted-foreground">
          {(t.raw(`tabItems.${k}`) as [string, string])[1]}
        </TabsContent>
      ))}
    </Tabs>
  );
}

export function AccordionDemo() {
  const t = useTranslations("styleGuide.overlays");
  const faq = t.raw("faq") as [string, string][];
  return (
    <Accordion type="single" collapsible defaultValue="q0" className="border-t border-border">
      {faq.map(([q, a], i) => (
        <AccordionItem key={q} value={`q${i}`}>
          <AccordionTrigger>{q}</AccordionTrigger>
          <AccordionContent>{a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
