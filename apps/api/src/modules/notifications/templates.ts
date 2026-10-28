import { formatMoney, type AppLocale, type OrderStatus } from "@myvisa/shared";

export interface L10n {
  ar: string;
  en: string;
}

export interface OrderReceivedPayload {
  orderId: string;
  orderNumber: string;
  destination: L10n | null;
  service: L10n;
  totalHalalas: number;
}

export interface PaymentFailedPayload {
  orderId: string;
  orderNumber: string;
  reason: string | null;
}

/** Any later milestone (documents review, action required, appointment, embassy, decision, delivery…). */
export interface OrderUpdatePayload {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  destination: L10n | null;
  service: L10n;
  /** Staff note shown to the customer (also on the timeline). */
  note: string | null;
  decision?: "APPROVED" | "REJECTED" | "PARTIAL" | null;
}

export interface MessageReceivedPayload {
  orderId: string;
  orderNumber: string;
  agent: string | null;
  preview: string;
}

export interface TemplatePayloads {
  "order.received": OrderReceivedPayload;
  "payment.failed": PaymentFailedPayload;
  "order.update": OrderUpdatePayload;
  "message.received": MessageReceivedPayload;
}
export type TemplateKey = keyof TemplatePayloads;

export interface Rendered {
  /** In-app title and body. */
  title: string;
  body: string;
  sms: string;
  email: { subject: string; html: string; text: string };
  /** Approved WhatsApp template name and its ordered body parameters. */
  whatsapp: { template: string; params: string[] };
}

export interface RenderContext {
  locale: AppLocale;
  webUrl: string;
}

interface TemplateDef<K extends TemplateKey> {
  whatsappTemplate: string;
  /** Site path (no locale prefix) the message leads to; also the in-app link. */
  path(p: TemplatePayloads[K]): string;
  render(p: TemplatePayloads[K], ctx: RenderContext): Omit<Rendered, "email" | "whatsapp"> & { cta: { label: string; url: string }; lines: string[]; whatsappParams: string[] };
}

const localePath = (ctx: RenderContext, path: string) => `${ctx.webUrl}${ctx.locale === "en" ? "/en" : ""}${path}`;
const pick = (v: L10n | null | undefined, locale: AppLocale) => (v ? v[locale] || v.ar : "");

/**
 * Every customer message, bilingual (Arabic first), one entry per event.
 * Status changes after RECEIVED share `order.update` (wording per status in UPDATE_COPY); STATUS_TEMPLATES
 * decides which statuses message the customer at all.
 */
const TEMPLATES: { [K in TemplateKey]: TemplateDef<K> } = {
  "order.received": {
    whatsappTemplate: "order_received",
    path: (p) => `/track?order=${encodeURIComponent(p.orderNumber)}`,
    render(p, ctx) {
      const total = formatMoney(p.totalHalalas, ctx.locale);
      const where = pick(p.destination, ctx.locale) || pick(p.service, ctx.locale);
      const url = localePath(ctx, TEMPLATES["order.received"].path(p));
      return ctx.locale === "ar"
        ? {
            title: `استلمنا طلبك ${p.orderNumber}`,
            body: `تم الدفع واستلمنا طلب ${where}. سنراجع مستنداتك خلال ساعتين عمل.`,
            sms: `ماي فيزا: استلمنا طلبك ${p.orderNumber} (${where}) والمبلغ ${total}. تابع طلبك: ${url}`,
            lines: [`رقم الطلب: ${p.orderNumber}`, `الوجهة: ${where}`, `المبلغ المدفوع: ${total}`, "الخطوة التالية: يراجع مختص مستنداتك خلال ساعتين عمل، ونبلغك عبر واتساب في كل خطوة."],
            cta: { label: "تابع طلبك", url },
            whatsappParams: [p.orderNumber, where, total],
          }
        : {
            title: `We received order ${p.orderNumber}`,
            body: `Payment confirmed for your ${where} application. We'll review your documents within 2 working hours.`,
            sms: `myvisa: we received order ${p.orderNumber} (${where}), ${total}. Track it: ${url}`,
            lines: [`Order: ${p.orderNumber}`, `Destination: ${where}`, `Paid: ${total}`, "Next: a specialist reviews your documents within 2 working hours, and we'll update you on WhatsApp at every step."],
            cta: { label: "Track your order", url },
            whatsappParams: [p.orderNumber, where, total],
          };
    },
  },
  "payment.failed": {
    whatsappTemplate: "payment_failed",
    path: (p) => `/apply?order=${encodeURIComponent(p.orderId)}`,
    render(p, ctx) {
      const url = localePath(ctx, TEMPLATES["payment.failed"].path(p));
      return ctx.locale === "ar"
        ? {
            title: `لم يكتمل الدفع للطلب ${p.orderNumber}`,
            body: "لم يُخصم أي مبلغ. يمكنك المحاولة مجددًا وطلبك محفوظ كما هو.",
            sms: `ماي فيزا: لم يكتمل الدفع للطلب ${p.orderNumber}. طلبك محفوظ، أكمل الدفع هنا: ${url}`,
            lines: [`رقم الطلب: ${p.orderNumber}`, "لم يُخصم أي مبلغ من حسابك.", "طلبك ومستنداتك محفوظة، ويمكنك إكمال الدفع في أي وقت."],
            cta: { label: "أكمل الدفع", url },
            whatsappParams: [p.orderNumber, url],
          }
        : {
            title: `Payment didn't go through for ${p.orderNumber}`,
            body: "Nothing was charged. Your application is saved — try again whenever you're ready.",
            sms: `myvisa: payment for ${p.orderNumber} didn't go through. Your application is saved: ${url}`,
            lines: [`Order: ${p.orderNumber}`, "Nothing was charged.", "Your application and documents are saved; you can finish paying any time."],
            cta: { label: "Finish payment", url },
            whatsappParams: [p.orderNumber, url],
          };
    },
  },
  "order.update": {
    whatsappTemplate: "order_update",
    path: (p) => `/account/orders/${encodeURIComponent(p.orderId)}`,
    render(p, ctx) {
      const where = pick(p.destination, ctx.locale) || pick(p.service, ctx.locale);
      const url = localePath(ctx, TEMPLATES["order.update"].path(p));
      const copy = UPDATE_COPY[ctx.locale](p, where);
      const brand = ctx.locale === "ar" ? "ماي فيزا" : "myvisa";
      const noteLine = p.note ? [ctx.locale === "ar" ? `ملاحظة من فريقنا: ${p.note}` : `A note from our team: ${p.note}`] : [];
      return {
        title: copy.title,
        body: p.note ? `${copy.body} ${p.note}` : copy.body,
        sms: `${brand}: ${copy.title}. ${url}`,
        lines: [ctx.locale === "ar" ? `رقم الطلب: ${p.orderNumber}` : `Order: ${p.orderNumber}`, ctx.locale === "ar" ? `الوجهة: ${where}` : `Destination: ${where}`, copy.body, ...noteLine],
        cta: { label: copy.cta, url },
        whatsappParams: [p.orderNumber, where, copy.title],
      };
    },
  },
  "message.received": {
    whatsappTemplate: "message_received",
    path: (p) => `/account/orders/${encodeURIComponent(p.orderId)}#messages`,
    render(p, ctx) {
      const url = localePath(ctx, TEMPLATES["message.received"].path(p));
      const preview = p.preview.length > 140 ? `${p.preview.slice(0, 139)}…` : p.preview;
      return ctx.locale === "ar"
        ? {
            title: `رسالة جديدة بخصوص طلبك ${p.orderNumber}`,
            body: preview,
            sms: `ماي فيزا: لديك رسالة جديدة بخصوص طلبك ${p.orderNumber}. اقرأها: ${url}`,
            lines: [`رقم الطلب: ${p.orderNumber}`, `${p.agent ?? "فريق ماي فيزا"}: «${preview}»`],
            cta: { label: "اقرأ الرسالة وردّ", url },
            whatsappParams: [p.orderNumber, preview],
          }
        : {
            title: `New message about order ${p.orderNumber}`,
            body: preview,
            sms: `myvisa: you have a new message about order ${p.orderNumber}. Read it: ${url}`,
            lines: [`Order: ${p.orderNumber}`, `${p.agent ?? "The myvisa team"}: “${preview}”`],
            cta: { label: "Read and reply", url },
            whatsappParams: [p.orderNumber, preview],
          };
    },
  },
};

type UpdateCopy = (p: OrderUpdatePayload, where: string) => { title: string; body: string; cta: string };

/** Per-status wording for order.update, Arabic first. */
const UPDATE_COPY: Record<AppLocale, UpdateCopy> = {
  ar: (p, where) => {
    switch (p.status) {
      case "DOCUMENTS_REVIEW":
        return { title: `بدأنا مراجعة مستندات طلبك ${p.orderNumber}`, body: `يراجع مختص الآن مستندات طلب ${where}.`, cta: "تابع طلبك" };
      case "ACTION_REQUIRED":
        return { title: `مطلوب إجراء منك في الطلب ${p.orderNumber}`, body: "نحتاج منك مستندًا أو تعديلًا لنكمل طلبك.", cta: "أكمل المطلوب" };
      case "APPOINTMENT_BOOKED":
        return { title: `حجزنا موعدك للطلب ${p.orderNumber}`, body: `تم حجز موعد مركز التأشيرات لطلب ${where}. التفاصيل في حسابك.`, cta: "اعرض الموعد" };
      case "SUBMITTED_TO_EMBASSY":
        return { title: `قدّمنا طلبك ${p.orderNumber} إلى السفارة`, body: `ملف ${where} الآن لدى السفارة، وننتظر القرار.`, cta: "تابع طلبك" };
      case "DECISION_ISSUED":
        return p.decision === "REJECTED"
          ? { title: `صدر قرار السفارة في الطلب ${p.orderNumber}`, body: "للأسف لم تتم الموافقة. سيتواصل معك مختص لشرح الخيارات المتاحة.", cta: "اعرض التفاصيل" }
          : { title: `مبروك! صدرت الموافقة على طلبك ${p.orderNumber}`, body: `صدر قرار السفارة لطلب ${where}، ونرتب الآن تسليم جوازك.`, cta: "اعرض التفاصيل" };
      case "DELIVERED":
        return { title: `سُلِّم طلبك ${p.orderNumber}`, body: "اكتمل طلبك. رحلة سعيدة!", cta: "اعرض الطلب" };
      case "CANCELLED":
        return { title: `أُلغي الطلب ${p.orderNumber}`, body: "تم إلغاء الطلب. تواصل معنا إن كان لديك سؤال.", cta: "اعرض الطلب" };
      case "REFUNDED":
        return { title: `تم استرداد مبلغ الطلب ${p.orderNumber}`, body: "أعدنا المبلغ حسب سياسة الاسترداد، وقد يستغرق ظهوره في حسابك بضعة أيام عمل.", cta: "اعرض الطلب" };
      default:
        return { title: `تحديث على طلبك ${p.orderNumber}`, body: `هناك تحديث على طلب ${where}.`, cta: "تابع طلبك" };
    }
  },
  en: (p, where) => {
    switch (p.status) {
      case "DOCUMENTS_REVIEW":
        return { title: `We're reviewing the documents for ${p.orderNumber}`, body: `A specialist is checking your ${where} documents now.`, cta: "Track your order" };
      case "ACTION_REQUIRED":
        return { title: `Action needed on order ${p.orderNumber}`, body: "We need a document or a correction from you to continue.", cta: "Resolve it" };
      case "APPOINTMENT_BOOKED":
        return { title: `Your appointment for ${p.orderNumber} is booked`, body: `We booked your visa-centre appointment for ${where}. Details are in your account.`, cta: "See the appointment" };
      case "SUBMITTED_TO_EMBASSY":
        return { title: `Order ${p.orderNumber} is with the embassy`, body: `Your ${where} file has been submitted; we're waiting for the decision.`, cta: "Track your order" };
      case "DECISION_ISSUED":
        return p.decision === "REJECTED"
          ? { title: `The embassy decided on ${p.orderNumber}`, body: "Unfortunately the visa was not approved. A specialist will call you to explain your options.", cta: "See details" }
          : { title: `Approved! Your visa for ${p.orderNumber} is ready`, body: `The embassy approved your ${where} application; we're arranging your passport's return.`, cta: "See details" };
      case "DELIVERED":
        return { title: `Order ${p.orderNumber} delivered`, body: "Everything's done. Have a wonderful trip!", cta: "View order" };
      case "CANCELLED":
        return { title: `Order ${p.orderNumber} was cancelled`, body: "The order has been cancelled. Contact us if you have any questions.", cta: "View order" };
      case "REFUNDED":
        return { title: `Refund issued for ${p.orderNumber}`, body: "We refunded you under the refund policy; it can take a few working days to appear.", cta: "View order" };
      default:
        return { title: `Update on order ${p.orderNumber}`, body: `There's an update on your ${where} application.`, cta: "Track your order" };
    }
  },
};

/** Which template an order status change sends. Absent = no customer message for that status. */
export const STATUS_TEMPLATES: Partial<Record<OrderStatus, TemplateKey>> = {
  RECEIVED: "order.received",
  DOCUMENTS_REVIEW: "order.update",
  ACTION_REQUIRED: "order.update",
  APPOINTMENT_BOOKED: "order.update",
  SUBMITTED_TO_EMBASSY: "order.update",
  DECISION_ISSUED: "order.update",
  DELIVERED: "order.update",
  CANCELLED: "order.update",
  REFUNDED: "order.update",
};

/** Site path a stored notification links to (null for unknown/legacy templates). */
export function templatePath(key: string, payload: unknown): string | null {
  if (!isTemplateKey(key)) return null;
  return (TEMPLATES[key] as TemplateDef<TemplateKey>).path(payload as never);
}

export function isTemplateKey(key: string): key is TemplateKey {
  return key in TEMPLATES;
}

export function render<K extends TemplateKey>(key: K, payload: TemplatePayloads[K], ctx: RenderContext): Rendered {
  const def = TEMPLATES[key] as TemplateDef<K>;
  const r = def.render(payload, ctx);
  return {
    title: r.title,
    body: r.body,
    sms: r.sms,
    email: { subject: r.title, html: emailHtml(r.title, r.body, r.lines, r.cta, ctx), text: [r.title, "", r.body, "", ...r.lines, "", `${r.cta.label}: ${r.cta.url}`].join("\n") },
    whatsapp: { template: def.whatsappTemplate, params: r.whatsappParams },
  };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Table-based, inline-styled HTML so it survives Gmail/Outlook. Brand: ink navy, sand, desert gold. */
function emailHtml(title: string, body: string, lines: string[], cta: { label: string; url: string }, ctx: RenderContext): string {
  const rtl = ctx.locale === "ar";
  const dir = rtl ? "rtl" : "ltr";
  const align = rtl ? "right" : "left";
  const font = rtl ? "'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif" : "Inter, 'Helvetica Neue', Arial, sans-serif";
  const footer = rtl ? "ماي فيزا · الرياض، المملكة العربية السعودية" : "myvisa · Riyadh, Saudi Arabia";
  return `<!doctype html>
<html lang="${ctx.locale}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#F7F3EC;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3EC;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" dir="${dir}" style="max-width:560px;width:100%;background:#FFFDF9;border-radius:24px;overflow:hidden;font-family:${font};text-align:${align};">
<tr><td style="background:#0B1B2B;padding:28px 32px;">
<div dir="ltr" style="font-family:Georgia,serif;font-size:28px;color:#F7F3EC;text-align:${align};"><em style="color:#C8A24A;">my</em>visa</div>
<div style="height:3px;width:56px;background:#C8A24A;border-radius:2px;margin-top:14px;${rtl ? "margin-left:auto;" : ""}"></div>
</td></tr>
<tr><td style="padding:32px;">
<h1 style="margin:0 0 12px;font-size:24px;line-height:1.4;color:#0B1B2B;">${esc(title)}</h1>
<p style="margin:0 0 20px;font-size:16px;line-height:1.8;color:#4F6378;">${esc(body)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3EC;border-radius:16px;"><tr><td style="padding:16px 20px;font-size:15px;line-height:2;color:#0B1B2B;">${lines.map(esc).join("<br>")}</td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;${rtl ? "margin-left:auto;" : ""}"><tr><td style="background:#C8A24A;border-radius:999px;">
<a href="${esc(cta.url)}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:600;color:#0B1B2B;text-decoration:none;">${esc(cta.label)}</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #EDE6DA;font-size:12px;color:#4F6378;">${esc(footer)}</td></tr>
</table></td></tr></table></body></html>`;
}
