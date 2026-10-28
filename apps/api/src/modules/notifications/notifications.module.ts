import { Global, Module } from "@nestjs/common";
import { ENV, type Env } from "../../config/env";
import { EMAIL_SENDER, createEmailSender } from "./channels/email";
import { WHATSAPP_SENDER, createWhatsAppSender } from "./channels/whatsapp";
import { NotificationsController } from "./notifications.controller";
import { NotificationsListener } from "./notifications.listener";
import { NotificationsService } from "./notifications.service";

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsListener,
    { provide: EMAIL_SENDER, useFactory: (env: Env) => createEmailSender(env), inject: [ENV] },
    { provide: WHATSAPP_SENDER, useFactory: (env: Env) => createWhatsAppSender(env), inject: [ENV] },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
