import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { PricingService } from "./pricing.service";

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, PricingService],
  exports: [OrdersService, PricingService],
})
export class OrdersModule {}
