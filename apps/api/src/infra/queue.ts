import { Inject, Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { type Job, Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { ENV, type Env } from "../config/env";

/** Every background queue. Jobs are retried with exponential backoff and kept briefly for inspection. */
export const QUEUES = {
  scan: "document-scan",
  notifications: "notifications",
  invoices: "invoices",
} as const;
export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

/**
 * Owns the BullMQ connection, the queues, and (when QUEUE_WORKERS is on) the workers.
 * Modules register their processor with `process()`; enqueue with `add()`.
 */
@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly connection: Redis;
  private readonly queues = new Map<QueueName, Queue>();
  private readonly workers: Worker[] = [];
  readonly prefix: string;

  constructor(@Inject(ENV) private readonly env: Env) {
    // BullMQ needs blocking commands without a retry cap.
    this.connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
    this.prefix = env.NODE_ENV === "test" ? "bull-test" : "bull";
  }

  queue(name: QueueName): Queue {
    let q = this.queues.get(name);
    if (!q) {
      q = new Queue(name, {
        connection: this.connection,
        prefix: this.prefix,
        defaultJobOptions: { attempts: 5, backoff: { type: "exponential", delay: 2_000 }, removeOnComplete: { age: 86_400, count: 1_000 }, removeOnFail: { age: 7 * 86_400 } },
      });
      this.queues.set(name, q);
    }
    return q;
  }

  add<T extends object>(name: QueueName, jobName: string, data: T, opts: { jobId?: string; delay?: number } = {}) {
    return this.queue(name).add(jobName, data, opts);
  }

  process<T>(name: QueueName, handler: (job: Job<T>) => Promise<unknown>, concurrency = 4) {
    if (!this.env.QUEUE_WORKERS) return;
    const worker = new Worker<T>(name, handler, { connection: this.connection.duplicate({ maxRetriesPerRequest: null }), prefix: this.prefix, concurrency });
    worker.on("failed", (job, err) => this.logger.warn(`${name}/${job?.name} #${job?.id} attempt ${job?.attemptsMade}: ${err.message}`));
    this.workers.push(worker);
  }

  async onModuleDestroy() {
    await Promise.all(this.workers.map((w) => w.close()));
    await Promise.all([...this.queues.values()].map((q) => q.close()));
    await this.connection.quit().catch(() => undefined);
  }
}
