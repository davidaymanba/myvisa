import { describe, expect, it } from "vitest";
import type { Env } from "../config/env";
import { PiiService } from "./pii.service";

const env = { DATA_ENCRYPTION_KEY: Buffer.alloc(32, 3).toString("base64"), BLIND_INDEX_KEY: "index-key-for-tests" } as Env;

describe("PiiService", () => {
  const pii = new PiiService(env);

  it("round-trips and never repeats a ciphertext", () => {
    const a = pii.encrypt("A12345678");
    const b = pii.encrypt("A12345678");
    expect(a).not.toBe(b);
    expect(a).not.toContain("A12345678");
    expect(pii.decrypt(a)).toBe("A12345678");
  });

  it("rejects tampered ciphertext", () => {
    const parts = pii.encrypt("A12345678").split(".");
    parts[2] = Buffer.from("B12345678").toString("base64url");
    expect(() => pii.decrypt(parts.join("."))).toThrow();
  });

  it("indexes case- and space-insensitively", () => {
    expect(pii.blindIndex("a 1234 5678")).toBe(pii.blindIndex("A12345678"));
    expect(pii.blindIndex("A12345678")).not.toBe(pii.blindIndex("A12345679"));
  });

  it("masks for display", () => {
    expect(PiiService.mask("A12345678")).toBe("••••••678");
  });
});
