const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const EXTENDED_ARABIC_INDIC = "۰۱۲۳۴۵۶۷۸۹";

/** Converts Arabic-Indic (٠-٩) and Persian (۰-۹) digits to ASCII so user input from Arabic keyboards validates. */
export function toLatinDigits(input: string): string {
  return input.replace(/[٠-٩۰-۹]/g, (d) => {
    const i = ARABIC_INDIC.indexOf(d);
    return String(i === -1 ? EXTENDED_ARABIC_INDIC.indexOf(d) : i);
  });
}
