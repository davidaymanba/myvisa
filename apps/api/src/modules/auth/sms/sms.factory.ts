import type { Env } from "../../../config/env";
import { ConsoleSmsProvider } from "./console.provider";
import type { SmsProvider } from "./sms.provider";
import { TaqnyatSmsProvider } from "./taqnyat.provider";
import { UnifonicSmsProvider } from "./unifonic.provider";

/** Picks the gateway from SMS_PROVIDER. Credentials are validated in env.ts, so the non-null assertions hold. */
export function createSmsProvider(env: Env): SmsProvider {
  switch (env.SMS_PROVIDER) {
    case "unifonic":
      return new UnifonicSmsProvider(env.UNIFONIC_APP_SID!, env.UNIFONIC_SENDER_ID ?? "myvisa");
    case "taqnyat":
      return new TaqnyatSmsProvider(env.TAQNYAT_BEARER_TOKEN!, env.TAQNYAT_SENDER ?? "myvisa");
    case "console":
      return new ConsoleSmsProvider();
  }
}
