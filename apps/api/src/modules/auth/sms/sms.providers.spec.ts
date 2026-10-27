import { describe, expect, it, vi } from "vitest";
import { envSchema } from "../../../config/env";
import { ConsoleSmsProvider } from "./console.provider";
import { createSmsProvider } from "./sms.factory";
import { TaqnyatSmsProvider } from "./taqnyat.provider";
import { UnifonicSmsProvider } from "./unifonic.provider";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("SMS providers", () => {
  it("Unifonic posts a form without the leading +", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => json({ success: "true", data: { MessageID: 77 } }));
    const res = await new UnifonicSmsProvider("sid", "myvisa", fetchImpl as typeof fetch).send("+966501112233", "hi");
    expect(res).toEqual({ id: "77" });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).toContain("unifonic.com");
    const form = new URLSearchParams(init!.body as URLSearchParams);
    expect(form.get("Recipient")).toBe("966501112233");
    expect(form.get("AppSid")).toBe("sid");
  });

  it("Unifonic surfaces failures", async () => {
    const fetchImpl = vi.fn(async () => json({ success: "false", message: "bad sender" }, 400));
    await expect(new UnifonicSmsProvider("sid", "x", fetchImpl as typeof fetch).send("+966501112233", "hi")).rejects.toThrow(/bad sender/);
  });

  it("Taqnyat sends a bearer-authenticated JSON body", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => json({ statusCode: 201, messageId: "abc" }, 201));
    const res = await new TaqnyatSmsProvider("tok", "myvisa", fetchImpl as typeof fetch).send("+966501112233", "hi");
    expect(res).toEqual({ id: "abc" });
    const [, init] = fetchImpl.mock.calls[0]!;
    expect((init!.headers as Record<string, string>).authorization).toBe("Bearer tok");
    expect(JSON.parse(init!.body as string)).toEqual({ recipients: ["966501112233"], body: "hi", sender: "myvisa" });
  });

  it("the factory follows SMS_PROVIDER", () => {
    const base = { DATABASE_URL: "postgresql://x@h/x", REDIS_URL: "redis://h:1", JWT_ACCESS_SECRET: "x".repeat(40), HASH_PEPPER: "p".repeat(20) };
    expect(createSmsProvider(envSchema.parse(base))).toBeInstanceOf(ConsoleSmsProvider);
    expect(createSmsProvider(envSchema.parse({ ...base, SMS_PROVIDER: "taqnyat", TAQNYAT_BEARER_TOKEN: "t" }))).toBeInstanceOf(TaqnyatSmsProvider);
    expect(() => envSchema.parse({ ...base, SMS_PROVIDER: "unifonic" })).toThrow(/UNIFONIC_APP_SID/);
  });
});
