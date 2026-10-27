import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";
import * as Sentry from "@sentry/nestjs";
import type { Request, Response } from "express";
import { ZodValidationException } from "nestjs-zod";
import type { ZodError } from "zod";
import { Prisma } from "@myvisa/db";
import { Problem, type ProblemDetails, problemType, statusTitle } from "./problem";

/** Renders every error as `application/problem+json` (RFC 9457) with a stable `code`. */
@Catch()
export class ProblemFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const body = this.toProblem(exception);
    body.instance = req.originalUrl;

    if (body.status >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
      Sentry.captureException(exception);
    }
    res.status(body.status).type("application/problem+json").json(body);
  }

  private toProblem(exception: unknown): ProblemDetails {
    if (exception instanceof ZodValidationException) {
      const error = exception.getZodError() as ZodError;
      return this.make(HttpStatus.UNPROCESSABLE_ENTITY, "validation_failed", "The request body or query is invalid.", {
        errors: error.issues.map((i) => ({ path: i.path.join("."), code: i.code, message: i.message })),
      });
    }
    if (exception instanceof Problem) {
      const { code, extra } = exception;
      const response = exception.getResponse() as { detail?: string };
      return this.make(exception.getStatus(), code, response.detail, extra);
    }
    if (exception instanceof ThrottlerException) {
      return this.make(HttpStatus.TOO_MANY_REQUESTS, "rate_limited", "Too many requests, slow down.");
    }
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === "P2002") return this.make(HttpStatus.CONFLICT, "unique_violation", "A record with these values already exists.", { target: exception.meta?.target });
      if (exception.code === "P2025") return this.make(HttpStatus.NOT_FOUND, "not_found", "Record not found.");
      if (exception.code === "P2003") return this.make(HttpStatus.CONFLICT, "in_use", "The record is referenced by other records.");
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const detail = typeof response === "string" ? response : ((response as { message?: string | string[] }).message?.toString() ?? exception.message);
      return this.make(status, codeFor(status), detail);
    }
    return this.make(HttpStatus.INTERNAL_SERVER_ERROR, "internal", "Something went wrong on our side.");
  }

  private make(status: number, code: string, detail?: string, extra: Record<string, unknown> = {}): ProblemDetails {
    return { type: problemType(code), title: statusTitle(status), status, code, ...(detail ? { detail } : {}), ...extra };
  }
}

function codeFor(status: number): string {
  switch (status) {
    case 400:
      return "bad_request";
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "not_found";
    case 405:
      return "method_not_allowed";
    case 413:
      return "payload_too_large";
    default:
      return status >= 500 ? "internal" : "error";
  }
}
