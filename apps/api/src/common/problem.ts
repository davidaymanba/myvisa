import { HttpException, HttpStatus } from "@nestjs/common";

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  /** Stable machine-readable code the web app translates (e.g. "otp_invalid"). */
  code: string;
  errors?: { path: string; code: string; message: string }[];
  [extra: string]: unknown;
}

const TITLES: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  422: "Unprocessable Content",
  429: "Too Many Requests",
  500: "Internal Server Error",
  503: "Service Unavailable",
};

export const problemType = (code: string) => `https://myvisa.sa/problems/${code.replace(/_/g, "-")}`;
export const statusTitle = (status: number) => TITLES[status] ?? "Error";

/** Throw this from services for errors the client is expected to handle. Rendered as RFC 9457 problem+json. */
export class Problem extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: string,
    detail?: string,
    readonly extra: Record<string, unknown> = {},
  ) {
    super({ code, detail, ...extra }, status);
  }

  static notFound(entity: string) {
    return new Problem(HttpStatus.NOT_FOUND, "not_found", `${entity} not found`);
  }

  static conflict(code: string, detail?: string) {
    return new Problem(HttpStatus.CONFLICT, code, detail);
  }
}
