import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { CACHE_TAGS, type CacheTag } from "@/lib/api/server";

/** Called by the API after an admin edit so cached pages pick up the change within seconds. */
export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  const given = req.headers.get("x-revalidate-secret") ?? "";
  if (!secret || !safeEqual(given, secret)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { tags?: unknown } | null;
  const tags = Array.isArray(body?.tags) ? body.tags.filter((t): t is CacheTag => CACHE_TAGS.includes(t as CacheTag)) : [];
  if (tags.length === 0) return NextResponse.json({ error: "no valid tags" }, { status: 400 });

  for (const tag of tags) revalidateTag(tag);
  return NextResponse.json({ revalidated: tags });
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
