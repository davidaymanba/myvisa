import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { createZodDto } from "nestjs-zod";
import { presignSchema, type PresignResult } from "@myvisa/shared";
import { Authenticated, CurrentUser } from "../../common/auth.decorators";
import type { RequestUser } from "../../common/auth.types";
import { DocumentsService } from "./documents.service";

class PresignDto extends createZodDto(presignSchema) {}

@ApiTags("documents")
@Controller()
@Authenticated()
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post("orders/:id/documents")
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: "Validate a file for a requirement and get a presigned upload URL" })
  presign(@Param("id") orderId: string, @Body() body: PresignDto, @CurrentUser() user: RequestUser): Promise<PresignResult> {
    return this.documents.presign(user, orderId, body);
  }

  @Post("order-documents/:id/complete")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Confirm the upload finished; queues the virus scan" })
  complete(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.documents.complete(user, id);
  }

  @Get("order-documents/:id/url")
  @ApiOperation({ summary: "Short-lived signed URL to view the file" })
  url(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.documents.viewUrl(user, id);
  }

  @Delete("order-documents/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.documents.remove(user, id);
  }
}
