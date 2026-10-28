import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { createZodDto } from "nestjs-zod";
import { attachDocumentSchema, vaultPresignSchema, type VaultDocumentView, type VaultPresignResult } from "@myvisa/shared";
import { Authenticated, CurrentUser } from "../../common/auth.decorators";
import type { RequestUser } from "../../common/auth.types";
import { DocumentsService } from "./documents.service";

class VaultPresignDto extends createZodDto(vaultPresignSchema) {}
class AttachDto extends createZodDto(attachDocumentSchema) {}

@ApiTags("vault")
@Controller()
@Authenticated()
export class VaultController {
  constructor(private readonly documents: DocumentsService) {}

  @Get("me/documents")
  @ApiOperation({ summary: "My stored documents (vault uploads and order uploads)" })
  list(@CurrentUser() user: RequestUser): Promise<VaultDocumentView[]> {
    return this.documents.vaultList(user);
  }

  @Post("me/documents")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: "Presigned upload straight into the vault" })
  presign(@Body() body: VaultPresignDto, @CurrentUser() user: RequestUser): Promise<VaultPresignResult> {
    return this.documents.vaultPresign(user, body);
  }

  @Post("me/documents/:id/complete")
  @HttpCode(HttpStatus.ACCEPTED)
  complete(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.documents.vaultComplete(user, id);
  }

  @Get("me/documents/:id/url")
  url(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.documents.vaultUrl(user, id);
  }

  @Delete("me/documents/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove from the vault (files used by an order stay attached to it)" })
  remove(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.documents.vaultRemove(user, id);
  }

  @Post("orders/:id/documents/attach")
  @ApiOperation({ summary: "Attach a stored document to an order requirement" })
  attach(@Param("id") orderId: string, @Body() body: AttachDto, @CurrentUser() user: RequestUser) {
    return this.documents.attach(user, orderId, body);
  }
}
