import { Logger } from "@nestjs/common";
import type { SmsProvider } from "./sms.provider";

/** Development only: prints the message to the API log instead of sending it. */
export class ConsoleSmsProvider implements SmsProvider {
  readonly name = "console";
  private readonly logger = new Logger("SMS");

  async send(to: string, body: string) {
    this.logger.log(`→ ${to}\n${body}`);
    return {};
  }
}
