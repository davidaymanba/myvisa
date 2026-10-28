import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { createZodDto } from "nestjs-zod";
import { trackRequestSchema, trackVerifySchema, type OtpRequestResult, type TrackSession, type TrackView } from "@myvisa/shared";
import type { AuthedRequest } from "../../common/auth.types";
import { requestMeta } from "../../common/request-meta";
import { TrackingService } from "./tracking.service";

class TrackRequestDto extends createZodDto(trackRequestSchema) {}
class TrackVerifyDto extends createZodDto(trackVerifySchema) {}

@ApiTags("tracking")
@Controller("track")
export class TrackingController {
  constructor(private readonly tracking: TrackingService) {}

  @Post("request")
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Send a code to the phone on the order (same answer whether or not it matches)" })
  request(@Body() body: TrackRequestDto, @Req() req: AuthedRequest): Promise<OtpRequestResult> {
    return this.tracking.request(body.orderNumber, body.phone, requestMeta(req));
  }

  @Post("verify")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: "Check the code; returns the tracking view and a 30-minute read-only token" })
  verify(@Body() body: TrackVerifyDto): Promise<TrackSession> {
    return this.tracking.verify(body.orderNumber, body.phone, body.code);
  }

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: "Refresh the tracking view with the token (header x-track-token)" })
  view(@Headers("x-track-token") token?: string): Promise<TrackView> {
    return this.tracking.viewByToken(token);
  }
}
