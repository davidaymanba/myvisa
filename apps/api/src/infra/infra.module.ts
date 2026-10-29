import { Global, Module } from "@nestjs/common";
import { PiiService } from "../common/pii.service";
import { ENV } from "../config/env";
import { PrismaService } from "./prisma.service";
import { QueueService } from "./queue";
import { createRedis, RedisService } from "./redis.service";
import { StorageService } from "./storage.service";
import { RedisThrottlerStorage } from "./throttler-storage";

@Global()
@Module({
  providers: [PrismaService, { provide: RedisService, useFactory: createRedis, inject: [ENV] }, RedisThrottlerStorage, StorageService, QueueService, PiiService],
  exports: [PrismaService, RedisService, RedisThrottlerStorage, StorageService, QueueService, PiiService],
})
export class InfraModule {}
