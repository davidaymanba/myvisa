import { z } from "../zod";

/** Optional free text: trims, and stores an empty string as null so "cleared in the form" means "no value". */
export const nullableText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

export const requiredText = (max = 300) => z.string().trim().min(1).max(max);

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug")
  .max(80);

export const halalasSchema = z.number().int().min(0).max(100_000_000);

export const cuidSchema = z.string().min(1).max(40);

/** Strict-ish id list for `?ids=` style params. */
export const sortOrderSchema = z.number().int().min(-10_000).max(10_000);
