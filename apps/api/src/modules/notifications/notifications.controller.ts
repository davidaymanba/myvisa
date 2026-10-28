import { Controller, Get, HttpCode, HttpStatus, Inject, Param, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AppLocale, NotificationPage } from "@myvisa/shared";
import { ENV, type Env } from "../../config/env";
import { Authenticated, CurrentUser } from "../../common/auth.decorators";
import type { RequestUser } from "../../common/auth.types";
import { Problem } from "../../common/problem";
import { PrismaService } from "../../infra/prisma.service";
import { isTemplateKey, render, templatePath } from "./templates";

const PAGE = 20;

/** The in-app inbox: IN_APP notification rows, rendered in the language the customer is browsing in. */
@ApiTags("notifications")
@Controller("me/notifications")
@Authenticated()
export class NotificationsController {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: "My in-app notifications, newest first (cursor pagination)" })
  async list(@CurrentUser() user: RequestUser, @Query("cursor") cursor?: string, @Query("locale") localeParam?: string): Promise<NotificationPage> {
    const locale: AppLocale = localeParam === "en" ? "en" : "ar";
    const [rows, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId: user.id, channel: "IN_APP" },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: PAGE + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
      this.unreadCount(user.id),
    ]);
    const page = rows.slice(0, PAGE);
    return {
      items: page.map((row) => {
        const payload = row.payload as Record<string, unknown>;
        const msg = isTemplateKey(row.template) ? render(row.template, payload as never, { locale, webUrl: this.env.WEB_URL }) : null;
        return {
          id: row.id,
          template: row.template,
          title: msg?.title ?? row.template,
          body: msg?.body ?? "",
          href: templatePath(row.template, payload),
          orderNumber: typeof payload.orderNumber === "string" ? payload.orderNumber : null,
          readAt: row.readAt?.toISOString() ?? null,
          createdAt: row.createdAt.toISOString(),
        };
      }),
      nextCursor: rows.length > PAGE ? page[page.length - 1]!.id : null,
      unread,
    };
  }

  private unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, channel: "IN_APP", readAt: null } });
  }

  @Post(":id/read")
  @HttpCode(HttpStatus.OK)
  async read(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    const { count } = await this.prisma.notification.updateMany({ where: { id, userId: user.id, channel: "IN_APP", readAt: null }, data: { readAt: new Date(), status: "READ" } });
    if (count === 0 && !(await this.prisma.notification.findFirst({ where: { id, userId: user.id }, select: { id: true } }))) throw Problem.notFound("Notification");
    return { unread: await this.unreadCount(user.id) };
  }

  @Post("read-all")
  @HttpCode(HttpStatus.OK)
  async readAll(@CurrentUser() user: RequestUser) {
    await this.prisma.notification.updateMany({ where: { userId: user.id, channel: "IN_APP", readAt: null }, data: { readAt: new Date(), status: "READ" } });
    return { unread: 0 };
  }
}
