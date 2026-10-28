import { describe, expect, it, vi } from "vitest";
import { MetaWhatsApp } from "./whatsapp";

describe("Meta WhatsApp", () => {
  it("sends an approved template with body parameters", async () => {
    const fetchImpl = vi.fn(async (_u: string | URL | Request, _i?: RequestInit) => new Response(JSON.stringify({ messages: [{ id: "wamid.1" }] }), { status: 200 }));
    const wa = new MetaWhatsApp("tok", "1234", fetchImpl as typeof fetch);
    expect(await wa.send({ to: "+966501112233", template: "order_received", language: "ar", params: ["MV-1", "فرنسا"], preview: "" })).toEqual({ id: "wamid.1" });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).toBe("https://graph.facebook.com/v21.0/1234/messages");
    expect(JSON.parse(init!.body as string)).toEqual({
      messaging_product: "whatsapp",
      to: "966501112233",
      type: "template",
      template: { name: "order_received", language: { code: "ar" }, components: [{ type: "body", parameters: [{ type: "text", text: "MV-1" }, { type: "text", text: "فرنسا" }] }] },
    });
  });
});
