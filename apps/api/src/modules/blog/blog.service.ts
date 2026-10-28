import { HttpStatus, Injectable } from "@nestjs/common";
import { readingMinutes, type BlogArticle, type BlogPostData, type BlogPostRecord, type BlogSummary } from "@myvisa/shared";
import { Prisma, type BlogPost } from "@myvisa/db";
import { Problem } from "../../common/problem";
import { PrismaService } from "../../infra/prisma.service";
import { RevalidateService } from "../revalidate/revalidate.service";

type Row = BlogPost & { author: { fullNameAr: string | null; fullNameEn: string | null } | null };

const summary = (p: Row): BlogSummary => ({
  slug: p.slug,
  title: { ar: p.titleAr, en: p.titleEn },
  excerpt: { ar: p.excerptAr, en: p.excerptEn },
  coverImageId: p.coverUrl,
  coverAlt: p.coverAlt,
  tags: p.tags,
  publishedAt: (p.publishedAt ?? p.createdAt).toISOString(),
  updatedAt: p.updatedAt.toISOString(),
  readingMinutes: { ar: readingMinutes(p.bodyAr)!, en: readingMinutes(p.bodyEn) },
});

/** Travel guides. Public reads see published posts only; edits revalidate the "blog" tag on the website. */
@Injectable()
export class BlogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RevalidateService,
  ) {}

  /** Every published post, newest first (the list is small; the website filters by language and tag). */
  published(): Promise<BlogSummary[]> {
    return this.cache.cached("blog", async () => {
      const rows = await this.prisma.blogPost.findMany({ where: { status: "PUBLISHED", publishedAt: { lte: new Date() } }, include: { author: { select: { fullNameAr: true, fullNameEn: true } } }, orderBy: { publishedAt: "desc" }, take: 500 });
      return rows.map(summary);
    });
  }

  async article(slug: string): Promise<BlogArticle> {
    const p = await this.prisma.blogPost.findFirst({ where: { slug, status: "PUBLISHED", publishedAt: { lte: new Date() } }, include: { author: { select: { fullNameAr: true, fullNameEn: true } } } });
    if (!p) throw Problem.notFound("Post");
    return { ...summary(p), body: { ar: p.bodyAr, en: p.bodyEn }, author: p.author?.fullNameAr ?? p.author?.fullNameEn ?? null };
  }

  private record(p: Row): BlogPostRecord {
    return {
      id: p.id,
      slug: p.slug,
      titleAr: p.titleAr,
      titleEn: p.titleEn,
      excerptAr: p.excerptAr,
      excerptEn: p.excerptEn,
      bodyAr: p.bodyAr,
      bodyEn: p.bodyEn,
      coverImageId: p.coverUrl,
      coverAlt: p.coverAlt,
      tags: p.tags,
      status: p.status,
      publishedAt: p.publishedAt?.toISOString() ?? null,
      author: p.author?.fullNameAr ?? p.author?.fullNameEn ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  async list(): Promise<BlogPostRecord[]> {
    const rows = await this.prisma.blogPost.findMany({ include: { author: { select: { fullNameAr: true, fullNameEn: true } } }, orderBy: [{ status: "asc" }, { updatedAt: "desc" }] });
    return rows.map((r) => this.record(r));
  }

  async get(id: string): Promise<BlogPostRecord> {
    const row = await this.prisma.blogPost.findUnique({ where: { id }, include: { author: { select: { fullNameAr: true, fullNameEn: true } } } });
    if (!row) throw Problem.notFound("Post");
    return this.record(row);
  }

  private data(input: BlogPostData, wasPublishedAt: Date | null) {
    return {
      slug: input.slug,
      titleAr: input.titleAr,
      titleEn: input.titleEn,
      excerptAr: input.excerptAr,
      excerptEn: input.excerptEn,
      bodyAr: input.bodyAr,
      bodyEn: input.bodyEn,
      coverUrl: input.coverImageId,
      coverAlt: input.coverAlt,
      tags: input.tags,
      status: input.status,
      // First publication stamps the date; later edits keep it (the article's "published" date is stable).
      publishedAt: input.status === "PUBLISHED" ? (wasPublishedAt ?? new Date()) : wasPublishedAt,
    };
  }

  private slugTaken(err: unknown): never {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") throw new Problem(HttpStatus.CONFLICT, "slug_taken", "Another post uses this address.", { errors: [{ path: "slug", code: "custom", message: "slug_taken" }] });
    throw err;
  }

  async create(input: BlogPostData, authorId: string) {
    try {
      const row = await this.prisma.blogPost.create({ data: { ...this.data(input, null), authorId } });
      await this.cache.invalidate("blog");
      return this.get(row.id);
    } catch (err) {
      this.slugTaken(err);
    }
  }

  async update(id: string, input: BlogPostData) {
    const current = await this.prisma.blogPost.findUnique({ where: { id }, select: { publishedAt: true } });
    if (!current) throw Problem.notFound("Post");
    try {
      await this.prisma.blogPost.update({ where: { id }, data: this.data(input, current.publishedAt) });
    } catch (err) {
      this.slugTaken(err);
    }
    await this.cache.invalidate("blog");
    return this.get(id);
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.blogPost.delete({ where: { id } });
    await this.cache.invalidate("blog");
  }
}
