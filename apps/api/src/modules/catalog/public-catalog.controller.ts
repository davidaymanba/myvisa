import { Controller, Get, Header, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { finderQuerySchema, type Destination, type FinderResult, type PublicCatalog } from "@myvisa/shared";
import { PublicCatalogService } from "./public-catalog.service";

class FinderQueryDto extends createZodDto(finderQuerySchema) {}

@ApiTags("catalog")
@Controller("catalog")
export class PublicCatalogController {
  constructor(private readonly catalog: PublicCatalogService) {}

  @Get()
  @Header("cache-control", "public, max-age=60, stale-while-revalidate=600")
  @ApiOperation({ summary: "Destinations, nationalities and insurance plans in the website's shapes" })
  all(): Promise<PublicCatalog> {
    return this.catalog.catalog();
  }

  @Get("finder")
  @ApiOperation({ summary: "Which visa we would file for this traveller, and its full price breakdown" })
  finder(@Query() query: FinderQueryDto): Promise<FinderResult> {
    return this.catalog.find(query);
  }

  @Get("destinations/:slug")
  @Header("cache-control", "public, max-age=60, stale-while-revalidate=600")
  @ApiOperation({ summary: "One destination with its visas, prices, requirements and FAQs" })
  destination(@Param("slug") slug: string): Promise<Destination> {
    return this.catalog.destination(slug);
  }
}
