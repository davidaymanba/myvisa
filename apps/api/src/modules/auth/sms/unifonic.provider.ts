import type { SmsProvider } from "./sms.provider";
import { msisdn } from "./sms.provider";

/** Unifonic REST SMS (https://docs.unifonic.com). */
export class UnifonicSmsProvider implements SmsProvider {
  readonly name = "unifonic";

  constructor(
    private readonly appSid: string,
    private readonly senderId: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(to: string, body: string) {
    const res = await this.fetchImpl("https://el.cloud.unifonic.com/rest/SMS/messages", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ AppSid: this.appSid, SenderID: this.senderId, Recipient: msisdn(to), Body: body }),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => ({}))) as { success?: boolean | string; message?: string; data?: { MessageID?: string | number } };
    if (!res.ok || String(json.success) !== "true") throw new Error(`unifonic: ${res.status} ${json.message ?? "send failed"}`);
    return json.data?.MessageID !== undefined ? { id: String(json.data.MessageID) } : {};
  }
}
