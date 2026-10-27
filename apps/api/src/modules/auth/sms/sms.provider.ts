export interface SmsProvider {
  readonly name: string;
  /** `to` is E.164 (+9665XXXXXXXX). Resolves with the provider's message id when it gives one. */
  send(to: string, body: string): Promise<{ id?: string }>;
}

export const SMS_PROVIDER = Symbol("SMS_PROVIDER");

/** Gateways want the number without the leading "+". */
export const msisdn = (e164: string) => e164.replace(/^\+/, "");
