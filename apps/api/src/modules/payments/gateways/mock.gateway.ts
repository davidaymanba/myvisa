import { type CheckoutRequest, type GatewayPayment, type PaymentGateway, WebhookRejected } from "./gateway";

/**
 * Local fake gateway for development and tests. The "hosted page" is our own /pay/mock screen;
 * completing it goes through the same processing path as a real webhook (see PaymentsService.completeMock).
 */
export class MockGateway implements PaymentGateway {
  readonly name = "mock" as const;

  constructor(private readonly webUrl: string) {}

  async createCheckout(req: CheckoutRequest) {
    const prefix = req.locale === "en" ? "/en" : "";
    return { providerPaymentId: `mock_${req.paymentId}`, redirectUrl: `${this.webUrl}${prefix}/pay/mock?payment=${encodeURIComponent(req.paymentId)}` };
  }

  /** The mock keeps no remote state; outcomes are supplied by completeMock. */
  async fetch(): Promise<GatewayPayment> {
    return { status: "PENDING", amountHalalas: 0, method: null, cardLast4: null, failureReason: null, raw: null };
  }

  parseWebhook(): never {
    throw new WebhookRejected("the mock gateway has no webhooks");
  }
}
