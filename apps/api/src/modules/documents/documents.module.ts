import { Module } from "@nestjs/common";
import { OrdersModule } from "../orders/orders.module";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";
import { VaultController } from "./vault.controller";

@Module({ imports: [OrdersModule], controllers: [DocumentsController, VaultController], providers: [DocumentsService] })
export class DocumentsModule {}
