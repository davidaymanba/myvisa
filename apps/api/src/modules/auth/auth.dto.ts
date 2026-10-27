import { createZodDto } from "nestjs-zod";
import { otpRequestSchema, otpVerifySchema } from "@myvisa/shared";

export class OtpRequestDto extends createZodDto(otpRequestSchema) {}
export class OtpVerifyDto extends createZodDto(otpVerifySchema) {}
