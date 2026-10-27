import { describe, expect, it } from "vitest";
import { normalizeSaudiMobile, saudiMobileSchema } from "./phone";

describe("normalizeSaudiMobile", () => {
  it.each([
    ["0501234567", "+966501234567"],
    ["501234567", "+966501234567"],
    ["+966 50 123 4567", "+966501234567"],
    ["00966501234567", "+966501234567"],
    ["٠٥٠١٢٣٤٥٦٧", "+966501234567"],
    ["055-123-4567", "+966551234567"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeSaudiMobile(input)).toBe(expected);
  });

  it.each(["0112345678", "05012345", "+201001234567", "abc"])("rejects %s", (input) => {
    expect(normalizeSaudiMobile(input)).toBeNull();
  });

  it("works as a zod schema", () => {
    expect(saudiMobileSchema.parse(" 0501234567 ")).toBe("+966501234567");
    expect(saudiMobileSchema.safeParse("123").success).toBe(false);
  });
});
