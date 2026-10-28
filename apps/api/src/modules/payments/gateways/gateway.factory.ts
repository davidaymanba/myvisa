import type { Env } from "../../../config/env";
import type { PaymentGateway } from "./gateway";
import { MockGateway } from "./mock.gateway";
import { MoyasarGateway } from "./moyasar.gateway";
import { TapGateway } from "./tap.gateway";

/** Picks the gateway from PAYMENT_PROVIDER. Credentials are validated in env.ts. */
export function createPaymentGateway(env: Env): PaymentGateway {
  switch (env.PAYMENT_PROVIDER) {
    case "moyasar":
      return new MoyasarGateway(env.MOYASAR_SECRET_KEY!, env.MOYASAR_WEBHOOK_SECRET!);
    case "tap":
      return new TapGateway(env.TAP_SECRET_KEY!);
    case "mock":
      if (env.NODE_ENV === "production") throw new Error("PAYMENT_PROVIDER=mock is not allowed in production");
      return new MockGateway(env.WEB_URL);
  }
}
