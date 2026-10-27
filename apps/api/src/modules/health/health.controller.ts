import { Controller, Get, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { HealthCheck, HealthCheckService, type HealthIndicatorResult, HealthIndicatorService } from "@nestjs/terminus";
import { SkipThrottle } from "@nestjs/throttler";
import { PrismaService } from "../../infra/prisma.service";
import { RedisService } from "../../infra/redis.service";

@ApiTags("health")
@SkipThrottle()
@Controller({ path: "health", version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly indicator: HealthIndicatorService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** Liveness: the process is up. */
  @Get("live")
  live() {
    return { status: "ok" };
  }

  /** Readiness: dependencies answer. */
  @Get()
  @HealthCheck()
  ready() {
    return this.health.check([() => this.ping("database", () => this.prisma.$queryRaw`SELECT 1`), () => this.ping("redis", () => this.redis.ping())]);
  }

  private async ping(key: string, probe: () => Promise<unknown>): Promise<HealthIndicatorResult> {
    const check = this.indicator.check(key);
    const started = Date.now();
    try {
      await probe();
      return check.up({ latencyMs: Date.now() - started });
    } catch (err) {
      return check.down({ message: (err as Error).message });
    }
  }
}
