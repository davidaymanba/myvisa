/**
 * All money is stored and computed as integer halalas (1 SAR = 100 halalas)
 * to avoid floating-point drift. Convert only at the display edge.
 */
export type Halalas = number;

export const CURRENCY = "SAR" as const;

export function sar(amount: number): Halalas {
  return Math.round(amount * 100);
}

export function toSar(halalas: Halalas): number {
  return halalas / 100;
}

export type AppLocale = "ar" | "en";

/** Saudi users read Latin digits in prices, so Arabic formatting forces the `latn` numbering system. */
export function formatMoney(
  halalas: Halalas,
  locale: AppLocale,
  options: { withCurrency?: boolean; fractionDigits?: 0 | 2 } = {},
): string {
  const { withCurrency = true, fractionDigits } = options;
  const value = toSar(halalas);
  const digits = fractionDigits ?? (Number.isInteger(value) ? 0 : 2);
  const number = new Intl.NumberFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-SA", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
  if (!withCurrency) return number;
  return locale === "ar" ? `${number} ر.س` : `SAR ${number}`;
}
