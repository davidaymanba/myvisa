import { Inject, Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { Redis } from "ioredis";
import { ENV, type Env } from "../config/env";

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(ENV) env: Env) {
    super(env.REDIS_URL, { maxRetriesPerRequest: 2, lazyConnect: false, enableOfflineQueue: true });
    this.on("error", (err) => this.logger.warn(`redis: ${err.message}`));
  }

  async onModuleDestroy() {
    await this.quit().catch(() => undefined);
  }

  /** Fixed-window counter. Returns the count after increment and the window's remaining TTL (seconds). */
  async hit(key: string, windowSeconds: number): Promise<{ count: number; ttl: number }> {
    const [[, count], [, ttl]] = (await this.multi().incr(key).ttl(key).exec()) as [[null, number], [null, number]];
    if (ttl < 0) {
      await this.expire(key, windowSeconds);
      return { count, ttl: windowSeconds };
    }
    return { count, ttl };
  }
}
