import { z } from "../zod";
import { nullableText } from "./fields";

export const BLOG_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

/** Unsplash photo id, the same convention as destination images (e.g. "1502602898657-3e91760cbb34"). */
const imageId = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{6,80}$/, "image_id")
  .nullish()
  .transform((v) => v ?? null);

export const blogPostInputSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug")
      .max(100),
    titleAr: z.string().trim().min(3).max(160),
    titleEn: nullableText(160),
    excerptAr: nullableText(400),
    excerptEn: nullableText(400),
    /** Markdown (GitHub flavour). Raw HTML is never rendered. */
    bodyAr: z.string().trim().min(20).max(60_000),
    bodyEn: nullableText(60_000),
    coverImageId: imageId,
    coverAlt: nullableText(200),
    tags: z.array(z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,30}$/, "tag")).max(8).default([]),
    status: z.enum(BLOG_STATUSES).default("DRAFT"),
  })
  .superRefine((p, ctx) => {
    if (p.titleEn && !p.bodyEn) ctx.addIssue({ code: "custom", path: ["bodyEn"], message: "required" });
    if (p.bodyEn && !p.titleEn) ctx.addIssue({ code: "custom", path: ["titleEn"], message: "required" });
  });
export type BlogPostInput = z.input<typeof blogPostInputSchema>;
export type BlogPostData = z.output<typeof blogPostInputSchema>;

/** Staff view: everything, in both languages. */
export interface BlogPostRecord extends Omit<BlogPostData, "coverImageId"> {
  id: string;
  coverImageId: string | null;
  publishedAt: string | null;
  author: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Public card (one language). `hasEnglish` decides whether /en lists it. */
export interface BlogSummary {
  slug: string;
  title: { ar: string; en: string | null };
  excerpt: { ar: string | null; en: string | null };
  coverImageId: string | null;
  coverAlt: string | null;
  tags: string[];
  publishedAt: string;
  updatedAt: string;
  readingMinutes: { ar: number; en: number | null };
}

export interface BlogArticle extends BlogSummary {
  body: { ar: string; en: string | null };
  author: string | null;
}

/** ~200 words a minute, at least one. */
export function readingMinutes(markdown: string | null): number | null {
  if (!markdown) return null;
  return Math.max(1, Math.round(markdown.split(/\s+/).filter(Boolean).length / 200));
}
