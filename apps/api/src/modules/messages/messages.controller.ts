import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { createZodDto } from "nestjs-zod";
import { messageCreateSchema, type MessageView } from "@myvisa/shared";
import { Authenticated, CurrentUser } from "../../common/auth.decorators";
import type { RequestUser } from "../../common/auth.types";
import { MessagesService } from "./messages.service";

class MessageCreateDto extends createZodDto(messageCreateSchema) {}
const loc = (v?: string) => (v === "en" ? "en" : "ar");

@ApiTags("messages")
@Controller()
@Authenticated()
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get("orders/:id/messages")
  @ApiOperation({ summary: "The order's conversation (marks the other side's messages read)" })
  list(@Param("id") id: string, @CurrentUser() user: RequestUser, @Query("locale") locale?: string): Promise<MessageView[]> {
    return this.messages.list(user, id, loc(locale));
  }

  @Post("orders/:id/messages")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: "Send a message (customer on their order; staff with orders:write)" })
  create(@Param("id") id: string, @Body() body: MessageCreateDto, @CurrentUser() user: RequestUser, @Query("locale") locale?: string): Promise<MessageView> {
    return this.messages.create(user, id, body, loc(locale));
  }

  @Get("messages/:id/attachment")
  @ApiOperation({ summary: "Short-lived URL to a message attachment" })
  attachment(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.messages.attachmentUrl(user, id);
  }
}
