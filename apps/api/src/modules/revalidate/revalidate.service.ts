import { Inject, Injectable, Logger } from "@nestjs/common";
import { ENV, type Env } from "../../config/env";
import { RedisService } from "../../infra/redis.service";

/** Cache tags shared with the web app (`fetch(..., { next: { tags } })`). */
export type CacheTag = "catalog" | "settings" | "testimonials";

/**
 * After an admin edit: drop the API's Redis copy and ask Next.js to revalidate pages tagged with it,
 * so the public site reflects the change within seconds instead of at the next ISR window.
 */
@Injectable()
export class RevalidateService {
  private readonly logger = new Logger(RevalidateService.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly redis: RedisService,
  ) {}

  cacheKey = (tag: CacheTag) => `cache:${tag}`;

  async cached<T>(tag: CacheTag, load: () => Promise<T>, ttlSeconds = 300): Promise<T> {
    const key = this.cacheKey(tag);
    const hit = await this.redis.get(key).catch(() => null);
    if (hit) return JSON.parse(hit) as T;
    const value = await load();
    await this.redis.set(key, JSON.stringify(value), "EX", ttlSeconds).catch(() => undefined);
    return value;
  }

  async invalidate(...tags: CacheTag[]): Promise<void> {
    await this.redis.del(...tags.map(this.cacheKey)).catch(() => undefined);
    const { WEB_REVALIDATE_URL: url, REVALIDATE_SECRET: secret } = this.env;
    if (!url || !secret) return;
    // Fire and forget: the web app being down must not fail an admin save.
    void fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-revalidate-secret": secret },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(5000),
    })
      .then((res) => {
        if (!res.ok) this.logger.warn(`web revalidate ${tags.join(",")} → ${res.status}`);
      })
      .catch((err: Error) => this.logger.warn(`web revalidate failed: ${err.message}`));
  }
}
