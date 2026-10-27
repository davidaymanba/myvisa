import type { L10n } from "@myvisa/shared";

/**
 * Legal identity & contact channels. Placeholder values — they move to admin Settings in Phase 3
 * (Setting keys: company.*), so marketing never needs a deploy to change a phone number.
 */
export const COMPANY = {
  legalName: { ar: "شركة ماي فيزا لخدمات السفر", en: "myvisa Travel Services Co." } satisfies L10n,
  crNumber: "1010XXXXXX",
  vatNumber: "3XXXXXXXXXXXXX3",
  whatsapp: "+966500000000",
  whatsappDisplay: "+966 50 000 0000",
  whatsappEtaMinutes: 5,
  phone: "+966920000000",
  phoneDisplay: "9200 00000",
  email: "hello@myvisa.sa",
  address: { ar: "طريق الملك فهد، حي العليا، الرياض 12214", en: "King Fahd Road, Al Olaya, Riyadh 12214" } satisfies L10n,
  hours: { ar: "الأحد – الخميس، 9 ص – 9 م", en: "Sun – Thu, 9am – 9pm" } satisfies L10n,
  geo: { lat: 24.6944, lon: 46.6853 },
} as const;
