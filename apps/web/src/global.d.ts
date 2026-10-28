import type { routing } from "@/i18n/routing";
import type account from "./messages/account/ar.json";
import type admin from "./messages/admin/ar.json";
import type apply from "./messages/apply/ar.json";
import type messages from "./messages/ar.json";
import type pay from "./messages/pay/ar.json";
import type track from "./messages/track/ar.json";

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages & { admin: typeof admin; apply: typeof apply; pay: typeof pay; account: typeof account; track: typeof track };
  }
}
