import { Module } from "@nestjs/common";
import { ENV, type Env } from "../../config/env";
import { PAYMENT_GATEWAY } from "./gateways/gateway";
import { createPaymentGateway } from "./gateways/gateway.factory";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, { provide: PAYMENT_GATEWAY, useFactory: (env: Env) => createPaymentGateway(env), inject: [ENV] }],
  exports: [PaymentsService],
})
export class PaymentsModule {}
