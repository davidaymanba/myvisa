import { z } from "zod";
import type { L10n } from "./catalog/types";
import { LEGAL_DOCUMENTS } from "./content/legal";

const l10n = z.object({ ar: z.string().trim().min(1).max(500), en: z.string().trim().min(1).max(500) });
const e164 = z.string().regex(/^\+[1-9]\d{7,14}$/, "e164");

/**
 * Admin-editable platform settings, one row per key in the `Setting` table.
 * Each value is validated with its schema on write (API) and in the admin form (web).
 */
export const SETTING_SCHEMAS = {
  company: z.object({
    legalName: l10n,
    crNumber: z.string().trim().min(1).max(20),
    vatNumber: z.string().trim().min(1).max(20),
    phone: e164,
    phoneDisplay: z.string().trim().min(1).max(30),
    email: z.email(),
    address: l10n,
    hours: l10n,
    geo: z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) }),
  }),
  support: z.object({
    whatsapp: e164,
    whatsappDisplay: z.string().trim().min(1).max(30),
    /** "We usually reply within N minutes" on the floating WhatsApp button. */
    whatsappEtaMinutes: z.number().int().min(1).max(24 * 60),
  }),
  legal: z.object({
    termsVersion: z.string().trim().min(1).max(20),
    privacyVersion: z.string().trim().min(1).max(20),
    /** Stored on each order at checkout — decides which refund terms apply. */
    refundPolicyVersion: z.string().trim().min(1).max(20),
  }),
} as const;

export type SettingKey = keyof typeof SETTING_SCHEMAS;
export type Settings = { [K in SettingKey]: z.infer<(typeof SETTING_SCHEMAS)[K]> };
export const SETTING_KEYS = Object.keys(SETTING_SCHEMAS) as SettingKey[];

export function isSettingKey(key: string): key is SettingKey {
  return key in SETTING_SCHEMAS;
}

/**
 * Seed values and the build-time fallback when the API is unreachable.
 * PLACEHOLDER legal identity — replace CR, VAT, phone and address in the admin before launch.
 */
export const DEFAULT_SETTINGS: Settings = {
  company: {
    legalName: { ar: "شركة ماي فيزا لخدمات السفر", en: "myvisa Travel Services Co." } satisfies L10n,
    crNumber: "1010XXXXXX",
    vatNumber: "3XXXXXXXXXXXXX3",
    phone: "+966920000000",
    phoneDisplay: "9200 00000",
    email: "hello@myvisa.sa",
    address: { ar: "طريق الملك فهد، حي العليا، الرياض 12214", en: "King Fahd Road, Al Olaya, Riyadh 12214" },
    hours: { ar: "الأحد – الخميس، 9 ص – 9 م", en: "Sun – Thu, 9am – 9pm" },
    geo: { lat: 24.6944, lon: 46.6853 },
  },
  support: {
    whatsapp: "+966500000000",
    whatsappDisplay: "+966 50 000 0000",
    whatsappEtaMinutes: 5,
  },
  legal: {
    termsVersion: LEGAL_DOCUMENTS.terms.version,
    privacyVersion: LEGAL_DOCUMENTS.privacy.version,
    refundPolicyVersion: LEGAL_DOCUMENTS["refund-policy"].version,
  },
};
