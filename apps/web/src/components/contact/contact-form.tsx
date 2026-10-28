"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AUTH_COOKIES, CONTACT_TOPICS, CSRF_HEADER, contactMessageSchema } from "@myvisa/shared";
import { Send } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";
import { PassportStamp } from "@/components/brand/passport-stamp";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type In = z.input<typeof contactMessageSchema>;
type Out = z.output<typeof contactMessageSchema>;
type ErrKey = "name" | "invalid_saudi_mobile" | "message";
type SendError = "rateLimited" | "server";

/** Double-submit CSRF: only needed when the visitor also has a session (the API checks it whenever auth cookies are sent). */
function csrfHeader(): Record<string, string> {
  const match = document.cookie.match(new RegExp(`(?:^|; )${AUTH_COOKIES.csrf}=([^;]+)`));
  return match?.[1] ? { [CSRF_HEADER]: decodeURIComponent(match[1]) } : {};
}

/** Posts to the API (same-origin /api/v1 proxy): validated with the shared schema, rate-limited, stored in the admin inbox. */
export function ContactForm() {
  const t = useTranslations("contact");
  const locale = useLocale() as Out["locale"];
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<SendError | null>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<In, unknown, Out>({ resolver: zodResolver(contactMessageSchema), defaultValues: { name: "", phone: "", topic: "visa", message: "", locale, website: "" } });
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
            onSubmit={handleSubmit(async (values) => {
              setSendError(null);
              try {
                const res = await fetch("/api/v1/contact", {
                  method: "POST",
                  headers: { "content-type": "application/json", ...csrfHeader() },
                  body: JSON.stringify(values),
                });
                if (!res.ok) {
                  setSendError(res.status === 429 ? "rateLimited" : "server");
                  return;
                }
              } catch {
                setSendError("server");
                return;
              }
              reset();
              setSent(true);
            })}
            className="flex flex-col gap-5"
          >
            <h2 className="font-display text-display-md">{t("formTitle")}</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                      {CONTACT_TOPICS.map((k) => (
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
              <Textarea {...register("message")} rows={5} maxLength={2000} />
            </Field>
            {/* Honeypot: invisible to people and assistive tech; bots that fill every field get silently dropped. */}
            <div aria-hidden className="absolute -start-[9999px] top-auto h-px w-px overflow-hidden">
              <label>
                Website
                <input type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
              </label>
            </div>
            <p className="text-caption text-muted-foreground">{t("consent")}</p>
            {sendError && <Alert tone="danger">{t(`errors.${sendError}`)}</Alert>}
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
