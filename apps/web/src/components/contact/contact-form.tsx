"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { saudiMobileSchema } from "@myvisa/shared";
import { Send } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { PassportStamp } from "@/components/brand/passport-stamp";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TOPICS = ["visa", "order", "insurance", "business", "other"] as const;

const schema = z.object({
  name: z.string().trim().min(2, "name"),
  phone: saudiMobileSchema,
  topic: z.enum(TOPICS),
  message: z.string().trim().min(10, "message").max(2000),
});

type In = z.input<typeof schema>;
type Out = z.output<typeof schema>;
type ErrKey = "name" | "invalid_saudi_mobile" | "message";

/** Phase 2: validates and confirms locally. Phase 3 posts to the API (rate-limited, stored, routed to the inbox). */
export function ContactForm() {
  const t = useTranslations("contact");
  const [sent, setSent] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<In, unknown, Out>({ resolver: zodResolver(schema), defaultValues: { name: "", phone: "", topic: "visa", message: "" } });
  const err = (m?: string) => (m ? t(`errors.${m as ErrKey}`) : undefined);

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-border bg-surface p-6 shadow-md sm:p-9">
      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div key="sent" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex min-h-[28rem] flex-col items-center justify-center gap-6 text-center">
            <PassportStamp animated shape="circle" tone="teal" top="MESSAGE RECEIVED" bottom="MYVISA" code="✓" rotate={-10} className="w-40" />
            <div>
              <h3 className="font-display text-display-md">{t("sent")}</h3>
              <p className="mt-2 text-muted-foreground">{t("sentBody")}</p>
            </div>
            <Button variant="ghost" onClick={() => setSent(false)}>
              {t("send")}
            </Button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            exit={{ opacity: 0, y: -10 }}
            noValidate
            onSubmit={handleSubmit(async () => {
              await new Promise((r) => setTimeout(r, 900));
              reset();
              setSent(true);
            })}
            className="flex flex-col gap-5"
          >
            <h2 className="font-display text-display-md">{t("formTitle")}</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("name")} error={err(errors.name?.message)}>
                <Input {...register("name")} autoComplete="name" />
              </Field>
              <Field label={t("phone")} error={err(errors.phone?.message)}>
                <PhoneInput {...register("phone")} />
              </Field>
            </div>
            <Field label={t("topic")}>
              <Controller
                control={control}
                name="topic"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TOPICS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {t(`topics.${k}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label={t("message")} error={err(errors.message?.message)}>
              <Textarea {...register("message")} rows={5} />
            </Field>
            <p className="text-caption text-muted-foreground">{t("consent")}</p>
            <Button type="submit" size="lg" loading={isSubmitting} className="self-start">
              {t("send")}
              <Send className="flip-rtl" aria-hidden />
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
