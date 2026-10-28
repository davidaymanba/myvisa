import { Module } from "@nestjs/common";
import { InvoicesModule } from "../invoices/invoices.module";
import { OrdersModule } from "../orders/orders.module";
import { PaymentsModule } from "../payments/payments.module";
import { AdminOrdersController } from "./admin-orders.controller";
import { AdminOrdersService } from "./admin-orders.service";

@Module({ imports: [OrdersModule, PaymentsModule, InvoicesModule], controllers: [AdminOrdersController], providers: [AdminOrdersService], exports: [AdminOrdersService] })
export class AdminOrdersModule {}
