import { Logger } from "@nestjs/common";
import type { Env } from "../../../config/env";

export interface WhatsAppMessage {
  /** E.164 */
  to: string;
  template: string;
  language: "ar" | "en";
  params: string[];
  /** What the console sender prints (and what an operator would read). */
  preview: string;
}

export interface WhatsAppSender {
  readonly name: string;
  send(msg: WhatsAppMessage): Promise<{ id?: string }>;
}

class ConsoleWhatsApp implements WhatsAppSender {
  readonly name = "console";
  private readonly logger = new Logger("WhatsApp");
  async send(msg: WhatsAppMessage) {
    this.logger.log(`→ ${msg.to} [${msg.template}/${msg.language}]\n${msg.preview}`);
    return {};
  }
}

/**
 * WhatsApp Business Cloud API. Business-initiated messages must use pre-approved templates,
 * so we send the template name + body parameters; the wording lives in Meta's template manager.
 */
export class MetaWhatsApp implements WhatsAppSender {
  readonly name = "meta";
  constructor(
    private readonly token: string,
    private readonly phoneNumberId: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(msg: WhatsAppMessage) {
    const res = await this.fetchImpl(`https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: msg.to.replace(/^\+/, ""),
        type: "template",
        template: { name: msg.template, language: { code: msg.language }, components: [{ type: "body", parameters: msg.params.map((text) => ({ type: "text", text })) }] },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string } };
    if (!res.ok) throw new Error(`whatsapp: ${res.status} ${json.error?.message ?? ""}`.trim());
    return json.messages?.[0]?.id ? { id: json.messages[0].id } : {};
  }
}

export function createWhatsAppSender(env: Env): WhatsAppSender {
  return env.WHATSAPP_PROVIDER === "meta" ? new MetaWhatsApp(env.WHATSAPP_TOKEN!, env.WHATSAPP_PHONE_NUMBER_ID!) : new ConsoleWhatsApp();
}

export const WHATSAPP_SENDER = Symbol("WHATSAPP_SENDER");
