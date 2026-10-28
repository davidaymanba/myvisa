import { Inject, Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import type { Job } from "bullmq";
import type { AppLocale } from "@myvisa/shared";
import type { NotificationChannel, Prisma } from "@myvisa/db";
import { ENV, type Env } from "../../config/env";
import { PrismaService } from "../../infra/prisma.service";
import { QUEUES, QueueService } from "../../infra/queue";
import { SMS_PROVIDER, type SmsProvider } from "../auth/sms/sms.provider";
import { EMAIL_SENDER, type EmailSender } from "./channels/email";
import { WHATSAPP_SENDER, type WhatsAppSender } from "./channels/whatsapp";
import { type TemplateKey, type TemplatePayloads, isTemplateKey, render } from "./templates";

export const DEFAULT_CHANNELS: NotificationChannel[] = ["IN_APP", "SMS", "WHATSAPP", "EMAIL"];

interface SendJob {
  notificationId: string;
}

/**
 * Customer messages. `notify()` writes one Notification row per channel and queues it; the worker renders
 * the template in the customer's language and sends it. A row already SENT/DELIVERED is never sent again,
 * so BullMQ retries can't double-message anyone.
 */
@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
    @Inject(EMAIL_SENDER) private readonly email: EmailSender,
    @Inject(WHATSAPP_SENDER) private readonly whatsapp: WhatsAppSender,
    private readonly prisma: PrismaService,
    private readonly queues: QueueService,
  ) {}

  onModuleInit() {
    this.queues.process<SendJob>(QUEUES.notifications, (job) => this.deliver(job));
  }

  async notify<K extends TemplateKey>(input: { userId: string; template: K; payload: TemplatePayloads[K]; locale?: AppLocale; channels?: NotificationChannel[] }) {
    const user = await this.prisma.user.findUnique({ where: { id: input.userId }, select: { email: true, locale: true, isActive: true } });
    if (!user?.isActive) return [];
    const locale = input.locale ?? user.locale;
    const channels = (input.channels ?? DEFAULT_CHANNELS).filter((c) => c !== "EMAIL" || Boolean(user.email));
    const rows = await this.prisma.$transaction(
      channels.map((channel) =>
        this.prisma.notification.create({ data: { userId: input.userId, channel, template: input.template, payload: { ...input.payload, locale } as unknown as Prisma.InputJsonObject } }),
      ),
    );
    await Promise.all(rows.map((row) => this.queues.add(QUEUES.notifications, input.template, { notificationId: row.id } satisfies SendJob, { jobId: row.id })));
    return rows;
  }

  private async deliver(job: Job<SendJob>) {
    const row = await this.prisma.notification.findUnique({ where: { id: job.data.notificationId }, include: { user: { select: { phone: true, email: true, locale: true } } } });
    if (!row || row.status === "SENT" || row.status === "DELIVERED" || row.status === "READ") return;
    if (!isTemplateKey(row.template)) {
      await this.prisma.notification.update({ where: { id: row.id }, data: { status: "FAILED", error: `unknown template ${row.template}` } });
      return;
    }
    const payload = row.payload as unknown as TemplatePayloads[TemplateKey] & { locale?: AppLocale };
    const locale: AppLocale = payload.locale === "en" ? "en" : payload.locale === "ar" ? "ar" : row.user.locale;
    const msg = render(row.template, payload as never, { locale, webUrl: this.env.WEB_URL });

    try {
      let providerMessageId: string | undefined;
      switch (row.channel) {
        case "IN_APP":
          await this.prisma.notification.update({ where: { id: row.id }, data: { status: "DELIVERED", sentAt: new Date(), error: null } });
          return;
        case "SMS":
          providerMessageId = (await this.sms.send(row.user.phone, msg.sms)).id;
          break;
        case "WHATSAPP":
          providerMessageId = (await this.whatsapp.send({ to: row.user.phone, template: msg.whatsapp.template, language: locale, params: msg.whatsapp.params, preview: msg.sms })).id;
          break;
        case "EMAIL":
          if (!row.user.email) throw new Error("user has no email");
          providerMessageId = (await this.email.send({ to: row.user.email, subject: msg.email.subject, html: msg.email.html, text: msg.email.text })).id;
          break;
      }
      await this.prisma.notification.update({ where: { id: row.id }, data: { status: "SENT", sentAt: new Date(), providerMessageId: providerMessageId ?? null, error: null } });
    } catch (err) {
      const message = (err as Error).message.slice(0, 500);
      const final = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      await this.prisma.notification.update({ where: { id: row.id }, data: { status: final ? "FAILED" : "QUEUED", error: message } });
      this.logger.warn(`${row.channel} ${row.template} → ${row.userId} failed${final ? " (giving up)" : ", will retry"}: ${message}`);
      throw err;
    }
  }
}
