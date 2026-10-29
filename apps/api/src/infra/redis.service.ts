import { Inject, Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { Redis } from "ioredis";
import RedisMock from "ioredis-mock";
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

/** `REDIS_URL=memory://` — demo hosts without a Redis server. */
export const isMemoryRedis = (url: string) => url.startsWith("memory:");

/**
 * The app's Redis: a real connection, or (demo only) an in-process stand-in with the same command API.
 * In-memory state (OTP codes, rate-limit counters, cache) is per process and lost on restart.
 */
export function createRedis(env: Env): RedisService {
  if (!isMemoryRedis(env.REDIS_URL)) return new RedisService(env);
  const memory = new RedisMock() as unknown as RedisService;
  memory.hit = RedisService.prototype.hit;
  return memory;
}
