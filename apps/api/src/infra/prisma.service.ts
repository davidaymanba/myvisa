import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { closePglite, driverAdapter, PrismaClient } from "@myvisa/db";
import { ENV, type Env } from "../config/env";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(ENV) private readonly env: Env) {
    super({ adapter: driverAdapter(env.DATABASE_URL), log: ["warn", "error"] });
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await closePglite(this.env.DATABASE_URL); // demo hosts: flush the embedded database before the process exits
  }
}
