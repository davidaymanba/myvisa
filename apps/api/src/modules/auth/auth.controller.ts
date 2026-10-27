import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post, Req, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { AUTH_COOKIES, type AuthUser, type OtpRequestResult } from "@myvisa/shared";
import { ENV, type Env } from "../../config/env";
import { Authenticated, CurrentUser } from "../../common/auth.decorators";
import type { AuthedRequest, RequestUser } from "../../common/auth.types";
import { Problem } from "../../common/problem";
import { requestMeta } from "../../common/request-meta";
import { OtpRequestDto, OtpVerifyDto } from "./auth.dto";
import { AuthService, toAuthUser } from "./auth.service";
import { clearAuthCookies, setAuthCookies } from "./cookies";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly auth: AuthService,
  ) {}

  @Post("otp/request")
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Send a 6-digit sign-in code by SMS" })
  request(@Body() body: OtpRequestDto, @Req() req: AuthedRequest): Promise<OtpRequestResult> {
    return this.auth.requestLoginCode(body.phone, requestMeta(req));
  }

  @Post("otp/verify")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: "Verify the code; sets the session cookies" })
  async verify(@Body() body: OtpVerifyDto, @Req() req: AuthedRequest, @Res({ passthrough: true }) res: Response): Promise<{ user: AuthUser }> {
    const { user, tokens } = await this.auth.verifyLogin(body.phone, body.code, requestMeta(req));
    setAuthCookies(res, this.env, tokens);
    return { user };
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rotate the refresh token and issue a new access token" })
  async refresh(@Req() req: AuthedRequest, @Res({ passthrough: true }) res: Response): Promise<{ user: AuthUser }> {
    const token = req.cookies?.[AUTH_COOKIES.refresh] as string | undefined;
    if (!token) throw new Problem(HttpStatus.UNAUTHORIZED, "unauthorized", "Please sign in.");
    try {
      const { user, tokens } = await this.auth.refresh(token, requestMeta(req));
      setAuthCookies(res, this.env, tokens);
      return { user };
    } catch (err) {
      clearAuthCookies(res, this.env);
      throw err;
    }
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "End this session (and every token rotated from it)" })
  async logout(@Req() req: AuthedRequest, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token = req.cookies?.[AUTH_COOKIES.refresh] as string | undefined;
    if (token) await this.auth.logout(token);
    clearAuthCookies(res, this.env);
  }

  @Get("me")
  @Authenticated()
  @ApiOperation({ summary: "The signed-in user and their permissions" })
  async me(@CurrentUser() current: RequestUser): Promise<AuthUser> {
    return toAuthUser(current);
  }
}
