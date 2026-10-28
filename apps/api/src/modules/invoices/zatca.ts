import { X509Certificate, createHash, createPrivateKey, createPublicKey, createSign, generateKeyPairSync, type KeyObject } from "node:crypto";

/**
 * ZATCA (Fatoora) Phase 2 building blocks for simplified (B2C) tax invoices:
 * the UBL 2.1 XML, the invoice hash chain, the ECDSA (secp256k1) stamp, and the TLV QR payload.
 *
 * What is NOT done here: onboarding (CSR → compliance CSID → production CSID) and reporting to the
 * ZATCA API. Both need the taxpayer's credentials; until then invoices stay `PENDING`. Validate the XML
 * with the ZATCA SDK (`fatoora -validate`) during onboarding before switching reporting on.
 */

/** PIH of the very first invoice: base64 of the hex SHA-256 of "0" (ZATCA spec). */
export const INITIAL_PIH = "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==";

export interface ZatcaLine {
  id: number;
  name: string;
  quantity: number;
  unitPriceHalalas: number;
  vatCategory: "S" | "O";
  vatRate: number;
  vatHalalas: number;
  /** Net (excl. VAT). */
  lineExtensionHalalas: number;
}

export interface ZatcaInvoice {
  number: string;
  uuid: string;
  icv: number;
  issuedAt: Date;
  previousInvoiceHash: string;
  seller: { name: string; vatNumber: string; crNumber: string; street: string; city: string; postalCode: string };
  buyerName: string | null;
  lines: ZatcaLine[];
  subtotalHalalas: number;
  vatHalalas: number;
  totalHalalas: number;
}

export interface EgsKeys {
  privateKey: KeyObject;
  publicKeyDer: Buffer;
  /** ZATCA-issued certificate (production CSID). Absent in development. */
  certificate: X509Certificate | null;
}

export interface StampedInvoice {
  xml: string;
  invoiceHash: string;
  qrPayload: string;
  signature: string | null;
}

const sar = (halalas: number) => (halalas / 100).toFixed(2);
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);

/** Riyadh wall-clock date and time, as the invoice states them. */
function riyadh(d: Date) {
  const local = new Date(d.getTime() + 3 * 3_600_000).toISOString();
  return { date: local.slice(0, 10), time: local.slice(11, 19) };
}

/** TLV: 1-byte tag, 1-byte length, UTF-8 value (ZATCA QR format). */
export function tlv(fields: [number, string | Buffer][]): Buffer {
  return Buffer.concat(
    fields.map(([tag, value]) => {
      const bytes = typeof value === "string" ? Buffer.from(value, "utf8") : value;
      if (bytes.length > 255) throw new RangeError(`TLV tag ${tag} is longer than 255 bytes`);
      return Buffer.concat([Buffer.from([tag, bytes.length]), bytes]);
    }),
  );
}

export function decodeTlv(base64: string): Map<number, Buffer> {
  const buf = Buffer.from(base64, "base64");
  const out = new Map<number, Buffer>();
  for (let i = 0; i < buf.length; ) {
    const tag = buf[i]!;
    const len = buf[i + 1]!;
    out.set(tag, buf.subarray(i + 2, i + 2 + len));
    i += 2 + len;
  }
  return out;
}

/**
 * The invoice XML *without* UBLExtensions, cac:Signature and the QR reference — exactly the parts
 * ZATCA strips before hashing. Emitted in a fixed, whitespace-free form so the hash is reproducible.
 */
export function invoiceBodyXml(inv: ZatcaInvoice): string {
  const { date, time } = riyadh(inv.issuedAt);
  const vatGroups = (["S", "O"] as const)
    .map((cat) => {
      const lines = inv.lines.filter((l) => l.vatCategory === cat);
      if (!lines.length) return "";
      const taxable = lines.reduce((s, l) => s + l.lineExtensionHalalas, 0);
      const vat = lines.reduce((s, l) => s + l.vatHalalas, 0);
      const rate = cat === "S" ? (lines[0]!.vatRate * 100).toFixed(2) : "0.00";
      const exemption = cat === "O" ? "<cbc:TaxExemptionReasonCode>VATEX-SA-OOS</cbc:TaxExemptionReasonCode><cbc:TaxExemptionReason>Government fees collected on behalf of the customer</cbc:TaxExemptionReason>" : "";
      return `<cac:TaxSubtotal><cbc:TaxableAmount currencyID="SAR">${sar(taxable)}</cbc:TaxableAmount><cbc:TaxAmount currencyID="SAR">${sar(vat)}</cbc:TaxAmount><cac:TaxCategory><cbc:ID>${cat}</cbc:ID><cbc:Percent>${rate}</cbc:Percent>${exemption}<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal>`;
    })
    .join("");
  const lines = inv.lines
    .map(
      (l) =>
        `<cac:InvoiceLine><cbc:ID>${l.id}</cbc:ID><cbc:InvoicedQuantity unitCode="PCE">${l.quantity.toFixed(6)}</cbc:InvoicedQuantity><cbc:LineExtensionAmount currencyID="SAR">${sar(l.lineExtensionHalalas)}</cbc:LineExtensionAmount><cac:TaxTotal><cbc:TaxAmount currencyID="SAR">${sar(l.vatHalalas)}</cbc:TaxAmount><cbc:RoundingAmount currencyID="SAR">${sar(l.lineExtensionHalalas + l.vatHalalas)}</cbc:RoundingAmount></cac:TaxTotal><cac:Item><cbc:Name>${esc(l.name)}</cbc:Name><cac:ClassifiedTaxCategory><cbc:ID>${l.vatCategory}</cbc:ID><cbc:Percent>${l.vatCategory === "S" ? (l.vatRate * 100).toFixed(2) : "0.00"}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item><cac:Price><cbc:PriceAmount currencyID="SAR">${sar(l.unitPriceHalalas)}</cbc:PriceAmount></cac:Price></cac:InvoiceLine>`,
    )
    .join("");
  return [
    `<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">`,
    `<cbc:ProfileID>reporting:1.0</cbc:ProfileID>`,
    `<cbc:ID>${esc(inv.number)}</cbc:ID>`,
    `<cbc:UUID>${inv.uuid}</cbc:UUID>`,
    `<cbc:IssueDate>${date}</cbc:IssueDate>`,
    `<cbc:IssueTime>${time}</cbc:IssueTime>`,
    // 388 = tax invoice; name code 0200000 = simplified (B2C).
    `<cbc:InvoiceTypeCode name="0200000">388</cbc:InvoiceTypeCode>`,
    `<cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>`,
    `<cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>`,
    `<cac:AdditionalDocumentReference><cbc:ID>ICV</cbc:ID><cbc:UUID>${inv.icv}</cbc:UUID></cac:AdditionalDocumentReference>`,
    `<cac:AdditionalDocumentReference><cbc:ID>PIH</cbc:ID><cac:Attachment><cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${inv.previousInvoiceHash}</cbc:EmbeddedDocumentBinaryObject></cac:Attachment></cac:AdditionalDocumentReference>`,
    `<cac:AccountingSupplierParty><cac:Party><cac:PartyIdentification><cbc:ID schemeID="CRN">${esc(inv.seller.crNumber)}</cbc:ID></cac:PartyIdentification><cac:PostalAddress><cbc:StreetName>${esc(inv.seller.street)}</cbc:StreetName><cbc:CityName>${esc(inv.seller.city)}</cbc:CityName><cbc:PostalZone>${esc(inv.seller.postalCode)}</cbc:PostalZone><cac:Country><cbc:IdentificationCode>SA</cbc:IdentificationCode></cac:Country></cac:PostalAddress><cac:PartyTaxScheme><cbc:CompanyID>${esc(inv.seller.vatNumber)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme><cac:PartyLegalEntity><cbc:RegistrationName>${esc(inv.seller.name)}</cbc:RegistrationName></cac:PartyLegalEntity></cac:Party></cac:AccountingSupplierParty>`,
    `<cac:AccountingCustomerParty><cac:Party>${inv.buyerName ? `<cac:PartyLegalEntity><cbc:RegistrationName>${esc(inv.buyerName)}</cbc:RegistrationName></cac:PartyLegalEntity>` : ""}</cac:Party></cac:AccountingCustomerParty>`,
    `<cac:PaymentMeans><cbc:PaymentMeansCode>48</cbc:PaymentMeansCode></cac:PaymentMeans>`,
    `<cac:TaxTotal><cbc:TaxAmount currencyID="SAR">${sar(inv.vatHalalas)}</cbc:TaxAmount></cac:TaxTotal>`,
    `<cac:TaxTotal><cbc:TaxAmount currencyID="SAR">${sar(inv.vatHalalas)}</cbc:TaxAmount>${vatGroups}</cac:TaxTotal>`,
    `<cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="SAR">${sar(inv.subtotalHalalas)}</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount currencyID="SAR">${sar(inv.subtotalHalalas)}</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount currencyID="SAR">${sar(inv.totalHalalas)}</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="SAR">${sar(inv.totalHalalas)}</cbc:PayableAmount></cac:LegalMonetaryTotal>`,
    lines,
    `</Invoice>`,
  ].join("");
}

/** Base64 SHA-256 of the hashable XML: the value chained into the next invoice's PIH. */
export function invoiceHash(bodyXml: string): string {
  return createHash("sha256").update(bodyXml, "utf8").digest("base64");
}

/** The signature value inside an X.509 certificate (QR tag 9): the trailing BIT STRING of the outer SEQUENCE. */
export function certificateSignature(cert: X509Certificate): Buffer {
  const der = cert.raw;
  const readLen = (at: number): [number, number] => {
    const first = der[at]!;
    if (first < 0x80) return [first, 1];
    const n = first & 0x7f;
    let len = 0;
    for (let i = 1; i <= n; i++) len = (len << 8) | der[at + i]!;
    return [len, 1 + n];
  };
  // Certificate ::= SEQUENCE { tbsCertificate, signatureAlgorithm, signatureValue BIT STRING }
  let i = 1 + readLen(1)[1];
  for (let skip = 0; skip < 2; skip++) {
    const [len, size] = readLen(i + 1);
    i += 1 + size + len;
  }
  if (der[i] !== 0x03) throw new Error("certificate signature not found");
  const [len, size] = readLen(i + 1);
  // Drop the "unused bits" byte at the start of the BIT STRING.
  return der.subarray(i + 1 + size + 1, i + 1 + size + len);
}

/** Hash, sign (when an EGS key is configured) and build the QR payload and the final XML. */
export function stampInvoice(inv: ZatcaInvoice, keys: EgsKeys | null): StampedInvoice {
  const body = invoiceBodyXml(inv);
  const hash = invoiceHash(body);
  const { date, time } = riyadh(inv.issuedAt);

  let signature: string | null = null;
  const fields: [number, string | Buffer][] = [
    [1, inv.seller.name],
    [2, inv.seller.vatNumber],
    [3, `${date}T${time}`],
    [4, sar(inv.totalHalalas)],
    [5, sar(inv.vatHalalas)],
    [6, hash],
  ];
  if (keys) {
    signature = createSign("SHA256").update(body, "utf8").sign(keys.privateKey).toString("base64");
    fields.push([7, signature], [8, keys.publicKeyDer]);
    if (keys.certificate) fields.push([9, certificateSignature(keys.certificate)]);
  }
  const qrPayload = tlv(fields).toString("base64");

  const qrRef = `<cac:AdditionalDocumentReference><cbc:ID>QR</cbc:ID><cac:Attachment><cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${qrPayload}</cbc:EmbeddedDocumentBinaryObject></cac:Attachment></cac:AdditionalDocumentReference>`;
  const extensions = signature
    ? `<ext:UBLExtensions><ext:UBLExtension><ext:ExtensionURI>urn:oasis:names:specification:ubl:dsig:enveloped:xades</ext:ExtensionURI><ext:ExtensionContent><ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="signature"><ds:SignedInfo><ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256"/><ds:Reference Id="invoiceSignedData" URI=""><ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><ds:DigestValue>${hash}</ds:DigestValue></ds:Reference></ds:SignedInfo><ds:SignatureValue>${signature}</ds:SignatureValue>${keys?.certificate ? `<ds:KeyInfo><ds:X509Data><ds:X509Certificate>${keys.certificate.raw.toString("base64")}</ds:X509Certificate></ds:X509Data></ds:KeyInfo>` : ""}</ds:Signature></ext:ExtensionContent></ext:UBLExtension></ext:UBLExtensions>`
    : "";
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${body
    .replace(/^(<Invoice [^>]+>)/, `$1${extensions}`)
    .replace(/(<cac:AccountingSupplierParty>)/, `${qrRef}${signature ? '<cac:Signature><cbc:ID>urn:oasis:names:specification:ubl:signature:Invoice</cbc:ID><cbc:SignatureMethod>urn:oasis:names:specification:ubl:dsig:enveloped:xades</cbc:SignatureMethod></cac:Signature>' : ""}$1`)}`;

  return { xml, invoiceHash: hash, qrPayload, signature };
}

/**
 * The EGS (e-invoice generation solution) keys. Production: the secp256k1 key and the CSID certificate
 * from ZATCA onboarding. Development: an ephemeral key, so QR codes carry every tag.
 */
export function loadEgsKeys(privateKeyPem: string | undefined, certificatePem: string | undefined, allowEphemeral: boolean): EgsKeys | null {
  if (privateKeyPem) {
    // Env files often carry PEMs with literal "\n".
    const privateKey = createPrivateKey(privateKeyPem.replace(/\\n/g, "\n"));
    return {
      privateKey,
      publicKeyDer: createPublicKey(privateKey).export({ type: "spki", format: "der" }),
      certificate: certificatePem ? new X509Certificate(certificatePem.replace(/\\n/g, "\n")) : null,
    };
  }
  if (!allowEphemeral) return null;
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "secp256k1" });
  return { privateKey, publicKeyDer: publicKey.export({ type: "spki", format: "der" }), certificate: null };
}

