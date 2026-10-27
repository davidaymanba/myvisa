import { Body, Controller, Delete, Get, Header, HttpCode, HttpStatus, Param, Post, Put, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { testimonialInputSchema, type PublicTestimonial } from "@myvisa/shared";
import { Audit } from "../../common/audit.decorator";
import { RequirePermissions } from "../../common/auth.decorators";
import type { AuthedRequest } from "../../common/auth.types";
import { Problem } from "../../common/problem";
import { PrismaService } from "../../infra/prisma.service";
import { RevalidateService } from "../revalidate/revalidate.service";

class TestimonialDto extends createZodDto(testimonialInputSchema) {}

@ApiTags("content")
@Controller()
export class TestimonialsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RevalidateService,
  ) {}

  @Get("testimonials")
  @Header("cache-control", "public, max-age=60, stale-while-revalidate=600")
  @ApiOperation({ summary: "Published testimonials, in display order" })
  published(): Promise<PublicTestimonial[]> {
    return this.cache.cached("testimonials", async () => {
      const rows = await this.prisma.testimonial.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
      return rows.map((t) => ({
        id: t.id,
        name: { ar: t.authorNameAr, en: t.authorNameEn },
        city: { ar: t.cityAr, en: t.cityEn },
        service: { ar: t.serviceLabelAr, en: t.serviceLabelEn },
        quote: { ar: t.quoteAr, en: t.quoteEn },
        rating: t.rating,
      }));
    });
  }

  @Get("admin/testimonials")
  @RequirePermissions("admin:access", "content:read")
  list() {
    return this.prisma.testimonial.findMany({ orderBy: [{ status: "asc" }, { sortOrder: "asc" }] });
  }

  @Post("admin/testimonials")
  @RequirePermissions("admin:access", "content:write")
  @Audit("testimonial.create", "Testimonial")
  async create(@Body() body: TestimonialDto) {
    const row = await this.prisma.testimonial.create({ data: body });
    await this.cache.invalidate("testimonials");
    return row;
  }

  @Put("admin/testimonials/:id")
  @RequirePermissions("admin:access", "content:write")
  @Audit("testimonial.update", "Testimonial")
  async update(@Param("id") id: string, @Body() body: TestimonialDto, @Req() req: AuthedRequest) {
    req.audit = { before: await this.find(id) };
    // Editing a placeholder into a real, consented review clears the placeholder flag.
    const row = await this.prisma.testimonial.update({ where: { id }, data: { ...body, ...(body.consentedAt ? { isPlaceholder: false } : {}) } });
    await this.cache.invalidate("testimonials");
    return row;
  }

  @Delete("admin/testimonials/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions("admin:access", "content:write")
  @Audit("testimonial.delete", "Testimonial")
  async remove(@Param("id") id: string, @Req() req: AuthedRequest) {
    req.audit = { before: await this.find(id) };
    await this.prisma.testimonial.delete({ where: { id } });
    await this.cache.invalidate("testimonials");
  }

  private async find(id: string) {
    const row = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!row) throw Problem.notFound("Testimonial");
    return row;
  }
}
