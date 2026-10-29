import { Inject, Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { type Job, Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { ENV, type Env } from "../config/env";
import { isMemoryRedis } from "./redis.service";

/** Every background queue. Jobs are retried with exponential backoff and kept briefly for inspection. */
export const QUEUES = {
  scan: "document-scan",
  notifications: "notifications",
  invoices: "invoices",
} as const;
export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

const ATTEMPTS = 5;
const BACKOFF_MS = 2_000;

/**
 * Owns the BullMQ connection, the queues, and (when QUEUE_WORKERS is on) the workers.
 * Modules register their processor with `process()`; enqueue with `add()`.
 * With `REDIS_URL=memory://` (demo hosts) there is no BullMQ: jobs run in-process after their delay,
 * with the same retry/backoff, and are lost if the process stops first.
 */
@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly connection: Redis | null;
  private readonly queues = new Map<QueueName, Queue>();
  private readonly workers: Worker[] = [];
  private readonly inline = new Map<QueueName, (job: Job) => Promise<unknown>>();
  private readonly timers = new Set<NodeJS.Timeout>();
  readonly prefix: string;

  constructor(@Inject(ENV) private readonly env: Env) {
    // BullMQ needs blocking commands without a retry cap.
    this.connection = isMemoryRedis(env.REDIS_URL) ? null : new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
    this.prefix = env.NODE_ENV === "test" ? "bull-test" : "bull";
  }

  queue(name: QueueName): Queue {
    if (!this.connection) throw new Error("no BullMQ queues with REDIS_URL=memory://");
    let q = this.queues.get(name);
    if (!q) {
      q = new Queue(name, {
        connection: this.connection,
        prefix: this.prefix,
        defaultJobOptions: { attempts: ATTEMPTS, backoff: { type: "exponential", delay: BACKOFF_MS }, removeOnComplete: { age: 86_400, count: 1_000 }, removeOnFail: { age: 7 * 86_400 } },
      });
      this.queues.set(name, q);
    }
    return q;
  }

  async add<T extends object>(name: QueueName, jobName: string, data: T, opts: { jobId?: string; delay?: number } = {}) {
    if (!this.connection) {
      this.runInline(name, { id: opts.jobId, name: jobName, data, attemptsMade: 0, opts: { attempts: ATTEMPTS } } as Job<T>, opts.delay ?? 0);
      return;
    }
    await this.queue(name).add(jobName, data, opts);
  }

  private runInline(name: QueueName, job: Job, delay: number) {
    const timer = setTimeout(async () => {
      this.timers.delete(timer);
      const handler = this.inline.get(name);
      if (!handler) return this.logger.warn(`${name}/${job.name}: no processor registered, dropped`);
      try {
        await handler(job);
      } catch (err) {
        this.logger.warn(`${name}/${job.name} #${job.id} attempt ${job.attemptsMade + 1}: ${(err as Error).message}`);
        if (job.attemptsMade + 1 < ATTEMPTS) this.runInline(name, { ...job, attemptsMade: job.attemptsMade + 1 } as Job, BACKOFF_MS * 2 ** job.attemptsMade);
      }
    }, delay);
    this.timers.add(timer);
  }

  process<T>(name: QueueName, handler: (job: Job<T>) => Promise<unknown>, concurrency = 4) {
    if (!this.env.QUEUE_WORKERS) return;
    if (!this.connection) {
      this.inline.set(name, handler as (job: Job) => Promise<unknown>);
      return;
    }
    const worker = new Worker<T>(name, handler, { connection: this.connection.duplicate({ maxRetriesPerRequest: null }), prefix: this.prefix, concurrency });
    worker.on("failed", (job, err) => this.logger.warn(`${name}/${job?.name} #${job?.id} attempt ${job?.attemptsMade}: ${err.message}`));
    this.workers.push(worker);
  }

  async onModuleDestroy() {
    for (const timer of this.timers) clearTimeout(timer);
    await Promise.all(this.workers.map((w) => w.close()));
    await Promise.all([...this.queues.values()].map((q) => q.close()));
    await this.connection?.quit().catch(() => undefined);
  }
}
