// Server-side data layer for the public site. Never import from a client component.
import {
  DEFAULT_SETTINGS,
  DESTINATIONS,
  INSURANCE_PLANS,
  NATIONALITIES,
  PLACEHOLDER_TESTIMONIALS,
  STARTER_POSTS,
  type BlogArticle,
  type BlogSummary,
  type Destination,
  type PublicCatalog,
  type PublicTestimonial,
  type Settings,
} from "@myvisa/shared";
import { cache } from "react";

/** Cache tags shared with the API's RevalidateService; an admin edit revalidates every page that used the tag. */
export type CacheTag = "catalog" | "settings" | "testimonials" | "blog";
export const CACHE_TAGS: readonly CacheTag[] = ["catalog", "settings", "testimonials", "blog"];

const API_URL = process.env.API_URL ?? "http://localhost:4100";
const warned = new Set<string>();

/**
 * Fetches from the API with ISR (5 min, tag-revalidated on admin edits). When the API is unreachable —
 * typically a build without the API running — falls back to the shared catalog the site was built from,
 * so pages always render.
 */
async function fetchOr<T>(path: string, tag: CacheTag, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_URL}/api/v1${path}`, { next: { revalidate: 300, tags: [tag] }, signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    if (!warned.has(path)) {
      warned.add(path);
      console.warn(`[api] ${path} unavailable (${(err as Error).message}); using the bundled ${tag} fallback`);
    }
    return fallback;
  }
}

const FALLBACK_CATALOG: PublicCatalog = {
  destinations: DESTINATIONS,
  nationalities: NATIONALITIES,
  insurancePlans: INSURANCE_PLANS,
  version: "bundled",
};

export const getCatalog = cache(() => fetchOr<PublicCatalog>("/catalog", "catalog", FALLBACK_CATALOG));
export const getSettings = cache(() => fetchOr<Settings>("/settings", "settings", DEFAULT_SETTINGS));
export const getTestimonials = cache(() => fetchOr<PublicTestimonial[]>("/testimonials", "testimonials", PLACEHOLDER_TESTIMONIALS));

export const getBlog = cache(() => fetchOr<BlogSummary[]>("/blog", "blog", STARTER_POSTS));

/** One article; null when the API says it doesn't exist (only an unreachable API falls back to the starter guides). */
export const getArticle = cache(async (slug: string): Promise<BlogArticle | null> => {
  try {
    const res = await fetch(`${API_URL}/api/v1/blog/${encodeURIComponent(slug)}`, { next: { revalidate: 300, tags: ["blog"] }, signal: AbortSignal.timeout(3000) });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as BlogArticle;
  } catch {
    return STARTER_POSTS.find((p) => p.slug === slug) ?? null;
  }
});

export async function getDestinationBySlug(slug: string): Promise<Destination | undefined> {
  return (await getCatalog()).destinations.find((d) => d.slug === slug);
}

/** `https://wa.me/…` link for an E.164 number. */
export const whatsappHref = (e164: string) => `https://wa.me/${e164.replace(/\D/g, "")}`;
