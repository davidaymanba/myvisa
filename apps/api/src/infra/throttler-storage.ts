import { Injectable } from "@nestjs/common";
import type { ThrottlerStorage } from "@nestjs/throttler";
import { RedisService } from "./redis.service";

interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

/** Shares the global per-IP rate limit across API instances. */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: RedisService) {}

  async increment(key: string, ttl: number, limit: number, blockDuration: number, throttlerName: string): Promise<ThrottlerStorageRecord> {
    const hitKey = `throttle:${throttlerName}:${key}`;
    const blockKey = `${hitKey}:blocked`;
    const blockedFor = await this.redis.pttl(blockKey);
    if (blockedFor > 0) {
      return { totalHits: limit + 1, timeToExpire: Math.ceil(blockedFor / 1000), isBlocked: true, timeToBlockExpire: Math.ceil(blockedFor / 1000) };
    }
    const { count, ttl: seconds } = await this.redis.hit(hitKey, Math.ceil(ttl / 1000));
    if (count > limit && blockDuration > 0) {
      await this.redis.set(blockKey, "1", "PX", blockDuration);
      return { totalHits: count, timeToExpire: seconds, isBlocked: true, timeToBlockExpire: Math.ceil(blockDuration / 1000) };
    }
    return { totalHits: count, timeToExpire: seconds, isBlocked: false, timeToBlockExpire: 0 };
  }
}
