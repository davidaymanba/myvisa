import { Body, Controller, Delete, Get, Header, HttpCode, HttpStatus, Param, Post, Put, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { blogPostInputSchema, type BlogArticle, type BlogPostRecord, type BlogSummary } from "@myvisa/shared";
import { Audit } from "../../common/audit.decorator";
import { CurrentUser, RequirePermissions } from "../../common/auth.decorators";
import type { AuthedRequest, RequestUser } from "../../common/auth.types";
import { BlogService } from "./blog.service";

class BlogPostDto extends createZodDto(blogPostInputSchema) {}

@ApiTags("blog")
@Controller()
export class BlogController {
  constructor(private readonly blog: BlogService) {}

  @Get("blog")
  @Header("cache-control", "public, max-age=60, stale-while-revalidate=600")
  @ApiOperation({ summary: "Published travel guides, newest first" })
  published(): Promise<BlogSummary[]> {
    return this.blog.published();
  }

  @Get("blog/:slug")
  @Header("cache-control", "public, max-age=60, stale-while-revalidate=600")
  article(@Param("slug") slug: string): Promise<BlogArticle> {
    return this.blog.article(slug);
  }

  @Get("admin/blog")
  @RequirePermissions("admin:access", "content:read")
  list(): Promise<BlogPostRecord[]> {
    return this.blog.list();
  }

  @Get("admin/blog/:id")
  @RequirePermissions("admin:access", "content:read")
  get(@Param("id") id: string): Promise<BlogPostRecord> {
    return this.blog.get(id);
  }

  @Post("admin/blog")
  @RequirePermissions("admin:access", "content:write")
  @Audit("blog.create", "BlogPost")
  create(@Body() body: BlogPostDto, @CurrentUser() user: RequestUser) {
    return this.blog.create(body, user.id);
  }

  @Put("admin/blog/:id")
  @RequirePermissions("admin:access", "content:write")
  @Audit("blog.update", "BlogPost")
  async update(@Param("id") id: string, @Body() body: BlogPostDto, @Req() req: AuthedRequest) {
    req.audit = { before: await this.blog.get(id) };
    return this.blog.update(id, body);
  }

  @Delete("admin/blog/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions("admin:access", "content:write")
  @Audit("blog.delete", "BlogPost")
  async remove(@Param("id") id: string, @Req() req: AuthedRequest) {
    req.audit = { before: await this.blog.get(id) };
    await this.blog.remove(id);
  }
}
