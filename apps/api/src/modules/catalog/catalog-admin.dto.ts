import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { FAQ_SCOPES, SERVICE_KINDS, countryInputSchema, faqInputSchema, priceRuleInputSchema, reorderSchema, requirementInputSchema, serviceInputSchema } from "@myvisa/shared";

export class CountryDto extends createZodDto(countryInputSchema) {}
export class ServiceDto extends createZodDto(serviceInputSchema) {}
export class PriceRuleDto extends createZodDto(priceRuleInputSchema) {}
export class RequirementDto extends createZodDto(requirementInputSchema) {}
export class FaqDto extends createZodDto(faqInputSchema) {}
export class ReorderDto extends createZodDto(reorderSchema) {}

export class CountryListQuery extends createZodDto(
  z.object({ q: z.string().trim().max(80).optional(), kind: z.enum(["destination", "nationality", "all"]).default("all") }),
) {}
export class ServiceListQuery extends createZodDto(z.object({ countryId: z.string().max(40).optional(), category: z.enum(SERVICE_KINDS).optional() })) {}
export class FaqListQuery extends createZodDto(
  z.object({ scope: z.enum(FAQ_SCOPES).optional(), countryId: z.string().max(40).optional(), serviceId: z.string().max(40).optional() }),
) {}
