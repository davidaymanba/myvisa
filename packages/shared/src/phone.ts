import { z } from "./zod";
import { toLatinDigits } from "./digits";

/**
 * Normalises any common way a Saudi mobile is typed — 05XXXXXXXX, 5XXXXXXXX,
 * +9665XXXXXXXX, 009665XXXXXXXX, with spaces/dashes or Arabic digits — to E.164.
 * Returns null when it is not a valid Saudi mobile.
 */
export function normalizeSaudiMobile(input: string): string | null {
  const digits = toLatinDigits(input).replace(/[\s\-().]/g, "").replace(/^\+/, "");
  const national = digits.replace(/^(00966|966|0)/, "");
  return /^5\d{8}$/.test(national) ? `+966${national}` : null;
}

export const saudiMobileSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const normalized = normalizeSaudiMobile(value);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "invalid_saudi_mobile" });
      return z.NEVER;
    }
    return normalized;
  });
