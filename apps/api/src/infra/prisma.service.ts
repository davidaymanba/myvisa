import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@myvisa/db";
import { ENV, type Env } from "../config/env";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(ENV) env: Env) {
    super({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }), log: ["warn", "error"] });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
