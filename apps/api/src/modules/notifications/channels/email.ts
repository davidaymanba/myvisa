import { Logger } from "@nestjs/common";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import type { Env } from "../../../config/env";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailSender {
  readonly name: string;
  send(msg: EmailMessage): Promise<{ id?: string }>;
}

class ConsoleEmail implements EmailSender {
  readonly name = "console";
  private readonly logger = new Logger("Email");
  async send(msg: EmailMessage) {
    this.logger.log(`→ ${msg.to}: ${msg.subject}\n${msg.text}`);
    return {};
  }
}

class SmtpEmail implements EmailSender {
  readonly name = "smtp";
  private readonly transport;
  constructor(
    url: string,
    private readonly from: string,
  ) {
    this.transport = nodemailer.createTransport(url);
  }
  async send(msg: EmailMessage) {
    const info = await this.transport.sendMail({ from: this.from, ...msg });
    return { id: info.messageId };
  }
}

class ResendEmail implements EmailSender {
  readonly name = "resend";
  private readonly client: Resend;
  constructor(
    apiKey: string,
    private readonly from: string,
  ) {
    this.client = new Resend(apiKey);
  }
  async send(msg: EmailMessage) {
    const { data, error } = await this.client.emails.send({ from: this.from, ...msg });
    if (error) throw new Error(`resend: ${error.message}`);
    return data?.id ? { id: data.id } : {};
  }
}

export function createEmailSender(env: Env): EmailSender {
  switch (env.EMAIL_PROVIDER) {
    case "smtp":
      return new SmtpEmail(env.SMTP_URL!, env.EMAIL_FROM);
    case "resend":
      return new ResendEmail(env.RESEND_API_KEY!, env.EMAIL_FROM);
    case "console":
      return new ConsoleEmail();
  }
}

export const EMAIL_SENDER = Symbol("EMAIL_SENDER");
