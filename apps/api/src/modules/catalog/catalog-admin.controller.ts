import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Audit } from "../../common/audit.decorator";
import { RequirePermissions } from "../../common/auth.decorators";
import type { AuthedRequest } from "../../common/auth.types";
import { CatalogAdminService } from "./catalog-admin.service";
import { CountryDto, CountryListQuery, FaqDto, FaqListQuery, PriceRuleDto, ReorderDto, RequirementDto, ServiceDto, ServiceListQuery } from "./catalog-admin.dto";

@ApiTags("admin · catalog")
@Controller("admin")
@RequirePermissions("admin:access", "catalog:read")
export class CatalogAdminController {
  constructor(private readonly catalog: CatalogAdminService) {}

  // ── Countries ──────────────────────────────────────────────────────────────

  @Get("countries")
  @ApiOperation({ summary: "Countries (destinations and nationalities)" })
  listCountries(@Query() query: CountryListQuery) {
    return this.catalog.listCountries(query);
  }

  @Get("countries/:id")
  @ApiOperation({ summary: "A country with its services, price rules, requirements and FAQs" })
  getCountry(@Param("id") id: string) {
    return this.catalog.getCountry(id);
  }

  @Post("countries")
  @RequirePermissions("catalog:write")
  @Audit("country.create", "Country")
  createCountry(@Body() body: CountryDto) {
    return this.catalog.createCountry(body);
  }

  @Put("countries/:id")
  @RequirePermissions("catalog:write")
  @Audit("country.update", "Country")
  async updateCountry(@Param("id") id: string, @Body() body: CountryDto, @Req() req: AuthedRequest) {
    const { services: _s, faqs: _f, ...before } = await this.catalog.getCountry(id);
    req.audit = { before };
    return this.catalog.updateCountry(id, body);
  }

  @Delete("countries/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions("catalog:write")
  @Audit("country.delete", "Country")
  async deleteCountry(@Param("id") id: string, @Req() req: AuthedRequest) {
    req.audit = { before: await this.catalog.getCountry(id) };
    await this.catalog.deleteCountry(id);
  }

  @Put("countries-order")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions("catalog:write")
  @Audit("country.reorder", "Country")
  async reorderCountries(@Body() body: ReorderDto) {
    await this.catalog.reorderCountries(body.ids);
  }

  // ── Services ───────────────────────────────────────────────────────────────

  @Get("services")
  listServices(@Query() query: ServiceListQuery) {
    return this.catalog.listServices(query);
  }

  @Get("services/:id")
  getService(@Param("id") id: string) {
    return this.catalog.getService(id);
  }

  @Post("services")
  @RequirePermissions("catalog:write")
  @Audit("service.create", "Service")
  createService(@Body() body: ServiceDto) {
    return this.catalog.createService(body);
  }

  @Put("services/:id")
  @RequirePermissions("catalog:write")
  @Audit("service.update", "Service")
  async updateService(@Param("id") id: string, @Body() body: ServiceDto, @Req() req: AuthedRequest) {
    const { priceRules: _p, requirements: _r, country: _c, ...before } = await this.catalog.getService(id);
    req.audit = { before };
    return this.catalog.updateService(id, body);
  }

  @Delete("services/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions("catalog:write")
  @Audit("service.delete", "Service")
  async deleteService(@Param("id") id: string, @Req() req: AuthedRequest) {
    req.audit = { before: await this.catalog.getService(id) };
    await this.catalog.deleteService(id);
  }

  // ── Price rules ────────────────────────────────────────────────────────────

  @Post("services/:id/price-rules")
  @RequirePermissions("pricing:write")
  @Audit("price_rule.create", "PriceRule")
  createPriceRule(@Param("id") serviceId: string, @Body() body: PriceRuleDto) {
    return this.catalog.createPriceRule(serviceId, body);
  }

  @Put("price-rules/:id")
  @RequirePermissions("pricing:write")
  @Audit("price_rule.update", "PriceRule")
  async updatePriceRule(@Param("id") id: string, @Body() body: PriceRuleDto, @Req() req: AuthedRequest) {
    req.audit = { before: await this.catalog.getPriceRule(id) };
    return this.catalog.updatePriceRule(id, body);
  }

  @Delete("price-rules/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions("pricing:write")
  @Audit("price_rule.delete", "PriceRule")
  async deletePriceRule(@Param("id") id: string, @Req() req: AuthedRequest) {
    req.audit = { before: await this.catalog.getPriceRule(id) };
    await this.catalog.deletePriceRule(id);
  }

  // ── Requirements ───────────────────────────────────────────────────────────

  @Post("services/:id/requirements")
  @RequirePermissions("catalog:write")
  @Audit("requirement.create", "Requirement")
  createRequirement(@Param("id") serviceId: string, @Body() body: RequirementDto) {
    return this.catalog.createRequirement(serviceId, body);
  }

  @Put("services/:id/requirements-order")
  @RequirePermissions("catalog:write")
  @Audit("requirement.reorder", "Service")
  reorderRequirements(@Param("id") serviceId: string, @Body() body: ReorderDto) {
    return this.catalog.reorderRequirements(serviceId, body.ids);
  }

  @Put("requirements/:id")
  @RequirePermissions("catalog:write")
  @Audit("requirement.update", "Requirement")
  async updateRequirement(@Param("id") id: string, @Body() body: RequirementDto, @Req() req: AuthedRequest) {
    req.audit = { before: await this.catalog.getRequirement(id) };
    return this.catalog.updateRequirement(id, body);
  }

  @Delete("requirements/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions("catalog:write")
  @Audit("requirement.delete", "Requirement")
  async deleteRequirement(@Param("id") id: string, @Req() req: AuthedRequest) {
    req.audit = { before: await this.catalog.getRequirement(id) };
    await this.catalog.deleteRequirement(id);
  }

  // ── FAQs ───────────────────────────────────────────────────────────────────

  @Get("faqs")
  listFaqs(@Query() query: FaqListQuery) {
    return this.catalog.listFaqs(query);
  }

  @Post("faqs")
  @RequirePermissions("content:write")
  @Audit("faq.create", "Faq")
  createFaq(@Body() body: FaqDto) {
    return this.catalog.createFaq(body);
  }

  @Put("faqs/:id")
  @RequirePermissions("content:write")
  @Audit("faq.update", "Faq")
  async updateFaq(@Param("id") id: string, @Body() body: FaqDto, @Req() req: AuthedRequest) {
    req.audit = { before: await this.catalog.getFaq(id) };
    return this.catalog.updateFaq(id, body);
  }

  @Delete("faqs/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions("content:write")
  @Audit("faq.delete", "Faq")
  async deleteFaq(@Param("id") id: string, @Req() req: AuthedRequest) {
    req.audit = { before: await this.catalog.getFaq(id) };
    await this.catalog.deleteFaq(id);
  }
}
