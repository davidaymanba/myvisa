import { Module } from "@nestjs/common";
import { CatalogAdminController } from "./catalog-admin.controller";
import { CatalogAdminService } from "./catalog-admin.service";
import { PublicCatalogController } from "./public-catalog.controller";
import { PublicCatalogService } from "./public-catalog.service";

@Module({
  controllers: [PublicCatalogController, CatalogAdminController],
  providers: [PublicCatalogService, CatalogAdminService],
})
export class CatalogModule {}
