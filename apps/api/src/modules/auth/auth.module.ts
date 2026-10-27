import { Global, Module } from "@nestjs/common";
import { ENV, type Env } from "../../config/env";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { OtpService } from "./otp.service";
import { SessionService } from "./session.service";
import { createSmsProvider } from "./sms/sms.factory";
import { SMS_PROVIDER } from "./sms/sms.provider";

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, OtpService, SessionService, { provide: SMS_PROVIDER, useFactory: (env: Env) => createSmsProvider(env), inject: [ENV] }],
  exports: [SessionService, OtpService],
})
export class AuthModule {}
