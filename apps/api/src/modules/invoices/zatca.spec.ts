import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { INITIAL_PIH, decodeTlv, invoiceBodyXml, invoiceHash, loadEgsKeys, stampInvoice, tlv, type ZatcaInvoice } from "./zatca";

const invoice: ZatcaInvoice = {
  number: "INV-2026-000001",
  uuid: "3cf5ee18-ee25-44ea-a444-2c37ba7f28be",
  icv: 1,
  issuedAt: new Date("2026-10-27T09:30:00.000Z"),
  previousInvoiceHash: INITIAL_PIH,
  seller: { name: "شركة ماي فيزا لخدمات السفر", vatNumber: "300000000000003", crNumber: "1010000000", street: "King Fahd Road", city: "Riyadh", postalCode: "12214" },
  buyerName: "سارة",
  lines: [
    { id: 1, name: "رسوم خدمة", quantity: 1, unitPriceHalalas: 20_000, vatCategory: "S", vatRate: 0.15, vatHalalas: 3_000, lineExtensionHalalas: 20_000 },
    { id: 2, name: "رسوم حكومية", quantity: 1, unitPriceHalalas: 33_000, vatCategory: "O", vatRate: 0, vatHalalas: 0, lineExtensionHalalas: 33_000 },
  ],
  subtotalHalalas: 53_000,
  vatHalalas: 3_000,
  totalHalalas: 56_000,
};

describe("ZATCA TLV", () => {
  it("encodes tag, length and UTF-8 bytes (Arabic counts bytes, not characters)", () => {
    const buf = tlv([[1, "ماي"]]);
    expect(buf[0]).toBe(1);
    expect(buf[1]).toBe(6);
    expect(buf.subarray(2).toString("utf8")).toBe("ماي");
  });

  it("refuses values longer than one length byte", () => {
    expect(() => tlv([[1, "x".repeat(256)]])).toThrow(RangeError);
  });

  it("the initial PIH is base64 of sha256('0') in hex", () => {
    expect(Buffer.from(INITIAL_PIH, "base64").toString()).toBe("5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9");
  });
});

describe("stampInvoice", () => {
  it("QR tags 1–5 carry seller, VAT number, Riyadh time, total and VAT", () => {
    const { qrPayload } = stampInvoice(invoice, null);
    const tags = decodeTlv(qrPayload);
    expect(tags.get(1)!.toString()).toBe(invoice.seller.name);
    expect(tags.get(2)!.toString()).toBe("300000000000003");
    expect(tags.get(3)!.toString()).toBe("2026-10-27T12:30:00");
    expect(tags.get(4)!.toString()).toBe("560.00");
    expect(tags.get(5)!.toString()).toBe("30.00");
    expect(tags.get(6)!.toString()).toBe(invoiceHash(invoiceBodyXml(invoice)));
    expect(tags.has(7)).toBe(false);
  });

  it("the hash is deterministic and changes with the previous hash (the chain)", () => {
    const a = stampInvoice(invoice, null).invoiceHash;
    expect(stampInvoice(invoice, null).invoiceHash).toBe(a);
    expect(stampInvoice({ ...invoice, previousInvoiceHash: a }, null).invoiceHash).not.toBe(a);
  });

  it("signs with the EGS key; the signature verifies against the public key in tag 8", () => {
    const keys = loadEgsKeys(undefined, undefined, true)!;
    const stamped = stampInvoice(invoice, keys);
    const tags = decodeTlv(stamped.qrPayload);
    const verify = createVerify("SHA256").update(invoiceBodyXml(invoice), "utf8");
    expect(verify.verify({ key: tags.get(8)!, format: "der", type: "spki" }, Buffer.from(tags.get(7)!.toString(), "base64"))).toBe(true);
    expect(stamped.xml).toContain("<ds:SignatureValue>");
    expect(stamped.xml).toContain('<cbc:ID>QR</cbc:ID>');
  });

  it("loads a PEM key with escaped newlines from the environment", () => {
    const { privateKey } = generateKeyPairSync("ec", { namedCurve: "secp256k1" });
    const pem = (privateKey.export({ type: "pkcs8", format: "pem" }) as string).replace(/\n/g, "\\n");
    expect(loadEgsKeys(pem, undefined, false)).not.toBeNull();
    expect(loadEgsKeys(undefined, undefined, false)).toBeNull();
  });

  it("XML states the totals, the out-of-scope exemption and the ICV", () => {
    const xml = invoiceBodyXml(invoice);
    expect(xml).toContain('<cbc:PayableAmount currencyID="SAR">560.00</cbc:PayableAmount>');
    expect(xml).toContain("VATEX-SA-OOS");
    expect(xml).toContain("<cbc:ID>ICV</cbc:ID><cbc:UUID>1</cbc:UUID>");
    expect(xml).toContain('name="0200000"');
  });
});
