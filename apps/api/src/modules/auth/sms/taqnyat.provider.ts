import type { SmsProvider } from "./sms.provider";
import { msisdn } from "./sms.provider";

/** Taqnyat REST SMS (https://dev.taqnyat.sa). */
export class TaqnyatSmsProvider implements SmsProvider {
  readonly name = "taqnyat";

  constructor(
    private readonly bearerToken: string,
    private readonly sender: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(to: string, body: string) {
    const res = await this.fetchImpl("https://api.taqnyat.sa/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.bearerToken}` },
      body: JSON.stringify({ recipients: [msisdn(to)], body, sender: this.sender }),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => ({}))) as { statusCode?: number; message?: string; messageId?: string | number };
    if (!res.ok || (json.statusCode !== undefined && json.statusCode >= 300)) throw new Error(`taqnyat: ${res.status} ${json.message ?? "send failed"}`);
    return json.messageId !== undefined ? { id: String(json.messageId) } : {};
  }
}
