import { describe, expect, it } from "vitest";
import { STATUS_TEMPLATES, render, templatePath } from "./templates";

const payload = { orderId: "o1", orderNumber: "MV-26-ABC123", destination: { ar: "فرنسا", en: "France" }, service: { ar: "تأشيرة شنغن", en: "Schengen visa" }, totalHalalas: 71_385 };

describe("notification templates", () => {
  it("renders order.received in Arabic with Latin digits and an RTL email", () => {
    const r = render("order.received", payload, { locale: "ar", webUrl: "https://myvisa.sa" });
    expect(r.title).toContain("MV-26-ABC123");
    expect(r.sms).toContain("713.85 ر.س");
    expect(r.sms).toContain("https://myvisa.sa/track?order=MV-26-ABC123");
    expect(r.email.html).toContain('dir="rtl"');
    expect(r.email.html).toContain("فرنسا");
    expect(r.email.text).toContain("تابع طلبك: https://myvisa.sa/track");
    expect(r.whatsapp).toEqual({ template: "order_received", params: ["MV-26-ABC123", "فرنسا", "713.85 ر.س"] });
    expect(r.sms).not.toMatch(/[٠-٩]/);
  });

  it("renders English with the /en prefix", () => {
    const r = render("order.received", payload, { locale: "en", webUrl: "https://myvisa.sa" });
    expect(r.sms).toContain("SAR 713.85");
    expect(r.email.html).toContain('dir="ltr"');
    expect(r.email.html).toContain("https://myvisa.sa/en/track?order=MV-26-ABC123");
  });

  it("links payment.failed back to the wizard", () => {
    const r = render("payment.failed", { orderId: "o1", orderNumber: "MV-26-ABC123", reason: "card_declined" }, { locale: "ar", webUrl: "https://myvisa.sa" });
    expect(r.sms).toContain("https://myvisa.sa/apply?order=o1");
    expect(r.whatsapp.template).toBe("payment_failed");
  });

  it("escapes HTML in user-controlled values", () => {
    const r = render("order.received", { ...payload, destination: { ar: "<script>", en: "<script>" } }, { locale: "en", webUrl: "https://myvisa.sa" });
    expect(r.email.html).not.toContain("<script>");
    expect(r.email.html).toContain("&lt;script&gt;");
  });

  it("maps RECEIVED to order.received", () => {
    expect(STATUS_TEMPLATES.RECEIVED).toBe("order.received");
    expect(STATUS_TEMPLATES.DRAFT).toBeUndefined();
  });

  it("order.update words each status and carries the staff note to the account page", () => {
    const base = { orderId: "o1", orderNumber: "MV-26-ABC123", destination: { ar: "فرنسا", en: "France" }, service: { ar: "تأشيرة شنغن", en: "Schengen visa" }, note: "نحتاج كشف حساب أحدث" };
    const action = render("order.update", { ...base, status: "ACTION_REQUIRED" }, { locale: "ar", webUrl: "https://myvisa.sa" });
    expect(action.title).toContain("مطلوب إجراء");
    expect(action.body).toContain("نحتاج كشف حساب أحدث");
    expect(action.sms).toContain("https://myvisa.sa/account/orders/o1");
    const approved = render("order.update", { ...base, note: null, status: "DECISION_ISSUED", decision: "APPROVED" }, { locale: "en", webUrl: "https://myvisa.sa" });
    expect(approved.title).toMatch(/^Approved!/);
    const rejected = render("order.update", { ...base, note: null, status: "DECISION_ISSUED", decision: "REJECTED" }, { locale: "en", webUrl: "https://myvisa.sa" });
    expect(rejected.title).not.toMatch(/Approved/);
    for (const status of ["DOCUMENTS_REVIEW", "ACTION_REQUIRED", "APPOINTMENT_BOOKED", "SUBMITTED_TO_EMBASSY", "DECISION_ISSUED", "DELIVERED"] as const) expect(STATUS_TEMPLATES[status]).toBe("order.update");
  });

  it("message.received previews the agent's message and links to the thread", () => {
    const r = render("message.received", { orderId: "o1", orderNumber: "MV-26-ABC123", agent: "ريم", preview: "x".repeat(200) }, { locale: "ar", webUrl: "https://myvisa.sa" });
    expect(r.body.length).toBe(140);
    expect(r.email.text).toContain("ريم");
    expect(templatePath("message.received", { orderId: "o1" })).toBe("/account/orders/o1#messages");
    expect(templatePath("nope", {})).toBeNull();
  });
});
